# UserScript Manager (Rust Edition)

A professional-grade management system for UserScripts using GitHub as a Source of Truth. This tool handles multi-platform environments (Windows/Linux) via a unified Rust binary.

## Project Structure

*   `[project-name]/`: Contains the logic (`logic.js`) and the auto-generated metadata header (`loader.user.js`).
*   `modules/`: Folder for shared JavaScript libraries and reusable code.
*   `templates/`: Contains the `header.template` file used for project generation.
*   `.env`: Local configuration for API keys and repository details (not tracked by Git).
*   `src/`: Rust source code for the management utility.

## Prerequisites

1.  **Rust**: Install via [rustup.rs](https://rustup.rs/).
2.  **Git**: Ensure Git is installed and your local machine is authenticated with GitHub.
3.  **Tampermonkey**: Browser extension installed in your target browser(s).

## Installation

1.  **Environment Setup**: Create a `.env` file in the root directory:
```bash
GH_USER=your_github_username
GH_REPO=your_repository_name
GAT=your_github_access_token
TEMPLATE_FILE=templates/header.template
```

2.  **Template Setup**: Create `templates/header.template` with the following structure:
```javascript
// ==UserScript==
// @name         {{NAME}} Loader
// @namespace    Custom.Automation
// @version      {{VERSION}}
// @description  {{DESCRIPTION}}
// @author       YourName
// @match        {{MATCH}}
{{EXCLUDES}}
// @run-at       {{RUN_AT}}
{{GRANTS}}
// @require      [https://raw.githubusercontent.com/](https://raw.githubusercontent.com/){{GH_USER}}/{{GH_REPO}}/main/{{PATH}}/{{FILENAME}}?token={{GAT}}
// ==/UserScript==
```

3.  **Compilation**: Build the release binary:
```bash
cargo build --release
```

## Usage

### Running the Manager
- **Linux**: `./target/release/monkey-manager`
- **Windows**: `.\target\release\monkey-manager.exe`

### Commands
- **New Project**: An interactive wizard with built-in documentation for:
    *   **Match Patterns**: Wildcard syntax explanations.
    *   **Exclusion Match**: Loop to add specific URLs to block.
    *   **Run-at**: Choose between start, body, end, or idle timings.
    *   **API Grants**: Multi-select menu for Tampermonkey internal APIs.
- **Update All**: Bumps timestamps on all scripts in the repository, then performs a Git commit and push automatically.

## Developer Workflow

1.  **Initialization**: Use the manager to create a new website script.
2.  **Push to GitHub**: Run `Update All` to commit and push the generated files to your repository.
3.  **Install via Raw Link**:
    *   Navigate to your repository on GitHub.
    *   Open the `loader.user.js` file for your script (under `scripts/<name>/`).
    *   Click the **Raw** button.
    *   Tampermonkey will detect the UserScript header and prompt you to **Install**.
4.  **Coding**: Edit your `logic.js` locally using your preferred IDE.
5.  **Deployment**: Run `Update All` in the manager. Tampermonkey will see the version bump on GitHub and update the script in your browser automatically.

## Troubleshooting

- **Authentication Errors**: If you get 404 or 403 errors, your GitHub Token (GAT) has likely expired. Update your `.env` with a fresh token.
- **Immediate Update**: If you don't want to wait for Tampermonkey's daily check, go to the Tampermonkey Dashboard -> Utilities -> **Check for userscript updates**.
- **Wildcards**: For match patterns, remember that `*` matches everything in that segment. Use `*://domain.com/*` for general coverage.