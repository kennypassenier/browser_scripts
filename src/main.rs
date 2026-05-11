use chrono::Utc;
use dialoguer::{Input, MultiSelect, Select, theme::ColorfulTheme};
use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use walkdir::WalkDir;

struct Config {
    gh_user: String,
    gh_repo: String,
    gat: String,
    template_file: PathBuf,
}

/// Returns the project root: the directory that contains the executable.
/// The binary is placed in the project root by build.ps1.
fn project_root() -> PathBuf {
    std::env::current_exe()
        .expect("Cannot locate executable")
        .parent()
        .expect("Cannot determine project root from executable path")
        .to_path_buf()
}

fn main() {
    let root = project_root();
    dotenvy::from_path(root.join(".env")).ok();
    let config = Config {
        gh_user: env::var("GH_USER").expect("GH_USER not set in .env"),
        gh_repo: env::var("GH_REPO").expect("GH_REPO not set in .env"),
        gat: env::var("GAT").expect("GAT not set in .env"),
        template_file: root.join(env::var("TEMPLATE_FILE").expect("TEMPLATE_FILE not set in .env")),
    };

    println!("------------------------------");
    println!("       MONKEY MANAGER         ");
    println!("------------------------------");

    let selections = &["New Project", "Update All", "Exit"];
    let selection = Select::with_theme(&ColorfulTheme::default())
        .with_prompt("Action")
        .items(selections)
        .default(0)
        .interact()
        .unwrap();

    match selection {
        0 => create_project(&config, &root),
        1 => update_all(&root),
        _ => println!("Exiting..."),
    }
}

fn create_project(config: &Config, root: &PathBuf) {
    let theme = ColorfulTheme::default();

    // 1. Name
    let name: String = Input::with_theme(&theme)
        .with_prompt("Project Name (slug-style, e.g., reddit-cleaner)")
        .interact_text()
        .unwrap();

    // 2. Description
    let description: String = Input::with_theme(&theme)
        .with_prompt("Description (What does this script do?)")
        .interact_text()
        .unwrap();

    // 3. Match Pattern
    println!("\n--- MATCH PATTERN HELP ---");
    println!("Wildcards (*): Matches any character sequence.");
    println!("Example: *://*.reddit.com/* (Matches all Reddit pages on HTTP/HTTPS)");
    let match_pattern: String = Input::with_theme(&theme)
        .with_prompt("Enter Primary Match Pattern")
        .interact_text()
        .unwrap();

    // 4. Exclude Patterns
    let mut excludes = Vec::new();
    println!("\n--- EXCLUSION HELP ---");
    println!("Allows you to block specific sub-pages (e.g., *://old.reddit.com/comments/*)");
    loop {
        let exclude: String = Input::with_theme(&theme)
            .with_prompt("Add Exclude Pattern (leave empty to finish)")
            .allow_empty(true)
            .interact_text()
            .unwrap();
        if exclude.is_empty() {
            break;
        }
        excludes.push(format!("// @exclude-match {}", exclude));
    }

    // 5. Run-At
    println!("\n--- RUN-AT HELP ---");
    println!("- document-start: ASAP (before DOM exists)");
    println!("- document-body: When body is available");
    println!("- document-end: When DOMContentLoaded triggers");
    println!("- document-idle: (Default) After page and resources load");
    let run_at_options = &[
        "document-idle",
        "document-start",
        "document-body",
        "document-end",
    ];
    let run_at_idx = Select::with_theme(&theme)
        .with_prompt("When should the script run?")
        .items(run_at_options)
        .default(0)
        .interact()
        .unwrap();
    let run_at = run_at_options[run_at_idx];

    // 6. Grants
    println!("\n--- GRANT HELP ---");
    println!(
        "Grants allow access to Tampermonkey APIs. Use 'none' for maximum security if not needed."
    );
    let grant_options = &[
        "none",
        "GM_xmlhttpRequest",
        "GM_setValue",
        "GM_getValue",
        "GM_addStyle",
        "unsafeWindow",
    ];
    let grant_indices = MultiSelect::with_theme(&theme)
        .with_prompt("Select required API grants (Space to select)")
        .items(grant_options)
        .interact()
        .unwrap();

    let grants: String = if grant_indices.is_empty() {
        "// @grant        none".to_string()
    } else {
        grant_indices
            .iter()
            .map(|&i| format!("// @grant        {}", grant_options[i]))
            .collect::<Vec<_>>()
            .join("\n")
    };

    // Processing files
    let timestamp = Utc::now().timestamp().to_string();
    let project_dir = root.join(&name);
    fs::create_dir_all(&project_dir).expect("Failed to create project directory");

    let template_content = fs::read_to_string(&config.template_file).expect("Template read failed");

    let processed_header = template_content
        .replace("{{NAME}}", &name)
        .replace("{{DESCRIPTION}}", &description)
        .replace("{{MATCH}}", &match_pattern)
        .replace("{{EXCLUDES}}", &excludes.join("\n"))
        .replace("{{VERSION}}", &timestamp)
        .replace("{{RUN_AT}}", run_at)
        .replace("{{GRANTS}}", &grants)
        .replace("{{GH_USER}}", &config.gh_user)
        .replace("{{GH_REPO}}", &config.gh_repo)
        .replace("{{GAT}}", &config.gat)
        .replace("{{PATH}}", &name)
        .replace("{{FILENAME}}", "logic.js");

    fs::write(project_dir.join("loader.user.js"), processed_header)
        .expect("Failed to write loader file");

    let logic_path = project_dir.join("logic.js");
    if !logic_path.exists() {
        let default_logic = format!(
            "(function() {{\n    'use strict';\n    console.log('{} logic loaded');\n}})();",
            name
        );
        fs::write(logic_path, default_logic).expect("Failed to write logic file");
    }

    println!("\nSuccess: Project '{}' setup complete.", name);
}

fn update_all(root: &PathBuf) {
    let timestamp = Utc::now().timestamp().to_string();
    for entry in WalkDir::new(root)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.path().extension().map_or(false, |ext| ext == "js")
                && e.path().to_str().unwrap().contains(".user.js")
        })
    {
        let content = fs::read_to_string(entry.path()).unwrap();
        let lines: Vec<String> = content
            .lines()
            .map(|line| {
                if line.contains("@version") {
                    format!("// @version      {}", timestamp)
                } else {
                    line.to_string()
                }
            })
            .collect();
        fs::write(entry.path(), lines.join("\n")).unwrap();
    }
    Command::new("git").args(["add", "."]).status().unwrap();
    Command::new("git")
        .args(["commit", "-m", &format!("Update versions: {}", timestamp)])
        .status()
        .unwrap();
    Command::new("git").args(["push"]).status().unwrap();
}
