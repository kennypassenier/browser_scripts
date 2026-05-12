'use strict';

// This script runs on all reddit.com subdomains.
// - www.reddit.com  → redirected immediately to old.reddit.com
// - old.reddit.com  → dark theme injected, sidebar hidden, auto-login via RES
//   - /comments/ pages → comment cleanup (embed removal, rickroll detection)
//   - all other pages  → frontpage (show-images, sidebar toggle)
// - any other subdomain → custom filtering layer (post/author/flair/domain filters, hide posts)

// ─── Config ───────────────────────────────────────────────────────────────────
// Edit these lists to control what gets filtered on the frontpage.

const PAYWALL_REMOVAL_SERVICE = "https://www.smry.ai/proxy?url=";
const LOCALSTORAGE_TTL = 1000 * 60 * 60 * 72; // 72 hours

const TITLE_BLOCK_LIST = [
    "kanye",
    "pokemon",
    "pokémon",
    "pikachu",
    "bitcoin",
    "cryptocurrency",
    " nft ",
    "fungible",
    "doge",
    "blockchain",
    "official trailer",
    "nft ",
    " nft",
    "predictions tournament",
    "twitter",
    "marjorie taylor greene",
    "shapiro",
    "andrew tate",
    "rainbow bridge",
    "mug shot",
    "mugshot",
    "airdrop",
    "layerzero",
    "ted cruz",
    "boebert",
    "kissinger",
    "aaron rodgers",
    "drake",
    "andy dick",
    "doherty",
    "giuliani",
    "fox news",
    "biden",
    "jake paul",
    "logan paul",
    "tina peters",
    "liam payne",
    "pope",
    "ozzy",
    "slams",
    "no kings",
    "no-kings",
];

const SUBREDDIT_BLOCK_LIST = [
    "meme",
    "circlejerk",
    "okbuddy",
    "mains",
    "anime",
    "crypto",
    "india",
    "snark",
];

const SUBREDDIT_ALLOW_LIST = [
    "r/wholesomememes",
];

const AUTHOR_BLOCK_LIST = [
    "mekyas23",
    "cooperationapples",
    "noveljazzlike9473",
];

const FLAIR_BLOCK_LIST = [
    "mourning/loss",
    "rainbow bridge",
    "pet loss",
    "trump news",
];

const SITES_FIXED = [
    "www.nytimes.com",
];

const SITES_WITH_PAYWALL = [
    "www.forbes.com",
    "www.wjtv.com",
    "www.independent.co.uk",
    "www.theguardian.com",
    "www.wusa9.com",
    "www.theatlantic.com",
    "www.washingtonpost.com",
];

const TRASH_SITES = [
    "nypost.com",
];

// ─── Shared utilities ────────────────────────────────────────────────────────

const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const generateSeparator = () => {
    const sep = document.createElement("span");
    sep.textContent = " | ";
    sep.className = "separator";
    return sep;
};

const removeParentOfAllNodes = (nodes) => {
    nodes.forEach((node) => {
        const target = node.parentElement;
        target.parentElement.removeChild(target);
    });
};

const detectRickroll = () => {
    for (const link of document.querySelectorAll("a")) {
        if (link.href.includes("dQw4w9WgXcQ")) {
            link.title = link.textContent;
            link.textContent = "--> RICKROLL <--";
        }
    }
};

// The user span in the header contains karma counts, mail icons, and other noise.
// We strip it down to just the username link and the RES account switcher icon,
// keeping the header clean without breaking RES account switching.
const simplifyUserHeader = (el) => {
    const accountSwitcher = el.querySelector("#RESAccountSwitcherIcon");
    const userlink = el.querySelector("a");
    el.textContent = "";
    el.appendChild(userlink);
    el.appendChild(accountSwitcher);
};

// Old Reddit wraps each post in a <div class="thing">. Many elements (title links,
// subreddit labels, hide buttons) are deep children of it. This helper lets us
// reach the post container from any descendant without brittle parentNode chains.
const getPostElement = (el) => el.closest('.thing');

// Old Reddit's sidebar takes up a lot of horizontal space and is rarely needed.
// This adds a "Sidebar" link to the top-right header that shows/hides it on demand.
// The sidebar starts hidden. The link gets a strikethrough when the sidebar is hidden
// (strikethrough = "this thing is off"), consistent with the Filter toggle in runModernFrontpage.
// Shared between runCommentsPage and runFrontpage.
const setupSidebarToggle = () => {
    const sidebar = document.querySelector(".side");
    const header = document.querySelector("#header-bottom-right");
    if (!sidebar || !header) return;

    const sidebarLink = document.createElement("a");
    sidebarLink.id = "sidebarToggle";
    sidebarLink.href = "#";
    sidebarLink.className = "strikeThrough";
    sidebarLink.textContent = "Sidebar";
    header.appendChild(generateSeparator());
    header.appendChild(sidebarLink);

    sidebar.style.display = "none";

    sidebarLink.addEventListener("click", async (e) => {
        e.preventDefault();
        e.target.classList.toggle("animateLink", true);
        sidebar.style.display = sidebar.style.display === "none" ? "block" : "none";
        sidebarLink.classList.toggle("strikeThrough");
        await timeout(2000);
        e.target.classList.toggle("animateLink", false);
    });
};

// Injects the dark theme and UI cleanup CSS for old.reddit.com.
// Covers: dark background, white text, enlarged collapse bars, hidden clutter
// (scores, gold, share, report, badges, notifications, etc.), and nav button restyling.
// The id guard prevents double-injection if the script somehow runs twice.
function injectStyles() {
    if (document.getElementById('reddit-custom-styles')) return;
    const style = document.createElement('style');
    style.id = 'reddit-custom-styles';
    style.textContent = `
    .fixedSite{ color: #DE781F !important; }
    .trashSite{ color: #253529 !important; }
    .paywall{ color: #1F85DE !important; }
    .strikeThrough{ text-decoration: line-through; color: white !important; }
    .animateLink{ animation-duration: 3s; animation-name: fadeIn; animation-timing-function: ease; }
    #NREMailCount[title="new mail!"]{
        display: flex; width: 100%; min-width: 2rem;
        justify-content: center; align-content: center; align-items: center;
        color: black; font-size: 1.4rem; min-height: 1.5rem; font-family: Verdana;
    }
    #NREMailCount:hover{ display: block; }
    .linkflairlabel{ font-size: 2vh; }
    .commentarea .midcol{ float: right; }
    .entry{ padding-left: 25px; }
    .commentarea .comment > .entry > .tagline > .expand{
        padding: 10px !important; display: inline-block !important;
        min-width: 2em !important; text-align: center !important;
    }
    div.res-expando-box{ background-color: transparent !important; }
    body, #sr-header-area, #RESShortcutsEditContainer > *, #RESShortcutsEditContainer,
    .debuginfo, .content, .res-expando-box, .top-matter{
        background-color: black !important; color: white !important;
    }
    p.debuginfo, .subbarlink, #srDropdownContainer a{ color: white !important; }
    div.nav-buttons{
        display: flex; align-items: center; justify-content: center;
        height: 10vh; width: 100vw; margin-top: 20vh; margin-bottom: 20vh;
    }
    span.next-button, span.prev-button{ margin: 2vh !important; padding: 2vh; }
    span.next-button a, span.prev-button a{
        height: 100%; font-size: 8vh; background: black !important;
        color: white !important; padding: 0.2vw;
    }
    span.next-button a:hover, span.prev-button a:hover{ background: white; color: black; }
    @keyframes fadeIn { from { color: black; opacity: 0; } to { opacity: 1; } }
    .happening-now-wrap, span.score, .userattrs, span.score-hidden, .awardings-bar,
    .listing-chooser, .give-gold-button, .share, .save-button, .saveComments,
    .crosspost-button, .report-button, .footer-parent, .presence_circle,
    .infobar-toaster-container, #notifications, #chat-v2, .badge-count{
        display: none !important;
    }
    `;
    document.head.appendChild(style);
}

// ─── URL routing ─────────────────────────────────────────────────────────────

const host = location.host;
const path = location.pathname;
const isOldReddit = host === 'old.reddit.com';
const isComments = /\/comments\//.test(path);
const isWww = host.startsWith('www.');

if (isWww) {
    // Redirect www.reddit.com to old.reddit.com, preserving the path and query string.
    location.replace(location.protocol + '//old.reddit.com' + path + location.search);
} else if (isOldReddit && isComments) {
    // A thread/comments page on old Reddit — different layout from the frontpage.
    runCommentsPage();
} else if (isOldReddit) {
    // The frontpage (or a subreddit listing) on old Reddit.
    runFrontpage();
} else {
    // Fallback for any other subdomain — runs the custom filtering layer.
    runModernFrontpage();
}

// ─── old.reddit.com — comments page ─────────────────────────────────────────

// Cleans up a thread page on old.reddit.com.
// - Injects the shared dark theme
// - Removes embedded comment previews (.embed-comment) and their wrappers
// - Removes inline "show child comments" toggles (.toggleChildren) and their wrappers
// - Flags any YouTube rickroll links with visible text so they can't sneak by
// - Strips karma/noise from the header user span (same as the frontpage)
// - Hides the sidebar by default and adds a toggle for it in the header
function runCommentsPage() {
    injectStyles();
    simplifyUserHeader(document.querySelector("span.user"));
    removeParentOfAllNodes(document.querySelectorAll(".embed-comment"));
    removeParentOfAllNodes(document.querySelectorAll(".toggleChildren"));
    detectRickroll();
    setupSidebarToggle();
    // TODO: add custom menu items here (e.g. Reveddit/Unddit links)
}

// ─── old.reddit.com — frontpage ─────────────────────────────────────────────

// Sets up the old Reddit listing page (frontpage or subreddit).
// - Injects the shared dark theme
// - Strips the user span down to just the username link + RES account switcher icon
// - Hides the sidebar by default and adds a toggle for it in the header
// - Auto-clicks the RES "show images" button so images expand immediately
// - Auto-logs in using the first account in the RES account switcher, if not already logged in
function runFrontpage() {
    // RES (Reddit Enhancement Suite) adds a "show images" button to the listing header.
    // A short delay is needed because RES injects it slightly after page load.
    const clickShowImages = async () => {
        await timeout(100);
        document.querySelector(".res-show-images a").click();
    };

    // If Reddit shows a login link (i.e. we're not logged in), open the RES account
    // switcher dropdown and click the first account to auto-login. The interval polls
    // because the RES dropdown renders asynchronously after the icon is clicked.
    const loginUser = () => {
        const userSpan = document.querySelector("#header-bottom-right span");
        const loginLink = userSpan.querySelector("a.login-link");
        if (loginLink) {
            const switcher = userSpan.querySelector("#RESAccountSwitcherIcon");
            switcher.click();
            const inter = setInterval(() => {
                const accountItem = document.querySelector(".RESHover.RESHoverDropdownList ul li");
                if (accountItem) {
                    accountItem.click();
                    clearInterval(inter);
                }
            }, 20);
        }
    };

    injectStyles();
    const user = document.querySelector("span.user");
    simplifyUserHeader(user);
    setupSidebarToggle();
    clickShowImages();
    loginUser();
}

// ─── custom filtering — frontpage ────────────────────────────────────────────

// Custom filtering layer for the Reddit frontpage listing.
// This is not a response to Reddit's UI — it's a personal comfort layer built from scratch.
// - Adds "Filter" and "Hide posts" buttons to the header
// - Classifies external links by domain (paywall, trash site, fixed site) using CSS classes
// - Filters posts by title keywords, author, and flair (driven by the config lists at the top)
// - Persists hidden posts in localStorage so they stay hidden across page loads (72h TTL)
// - Resizes the next/prev navigation buttons at the bottom of the listing
function runModernFrontpage() {
    if (/\/comments\//.test(path)) return;

    const storage = window.localStorage;
    let filterIsActive = true;

    // ── Helpers ───────────────────────────────────────────────────────────────

    const isTitleClean = (title) => {
        const lower = title.toLowerCase();
        return !TITLE_BLOCK_LIST.some(term => lower.includes(term.toLowerCase()));
    };

    const isFlairAllowed = (flair) => {
        if (flair.length === 0) return true;
        const lower = flair.toLowerCase();
        return !FLAIR_BLOCK_LIST.some(term => lower.includes(term.toLowerCase()));
    };

    // active=true adds strikethrough, active=false removes it.
    const setStrikeThrough = (el, active) => {
        el.classList.toggle("strikeThrough", active);
    };

    const saveHiddenPost = (postId) => {
        const hiddenPosts = JSON.parse(storage.getItem('hiddenPosts')) || [];
        const alreadySaved = hiddenPosts.some(e => e.postId === postId);
        if (!alreadySaved) {
            hiddenPosts.push({ postId, timestamp: Date.now() });
            storage.setItem('hiddenPosts', JSON.stringify(hiddenPosts));
        }
    };

    // ── Core logic ────────────────────────────────────────────────────────────

    const addCustomMenu = () => {
        const header = document.querySelector("#header-bottom-right");
        const filterLink = document.createElement("a");
        filterLink.id = "filterToggle";
        filterLink.href = "#";
        filterLink.textContent = "Filter";
        const hideAllLink = document.createElement("a");
        hideAllLink.id = "hideAllButton";
        hideAllLink.href = "#";
        hideAllLink.textContent = "Hide posts";
        header.appendChild(generateSeparator());
        header.appendChild(filterLink);
        header.appendChild(generateSeparator());
        header.appendChild(hideAllLink);
    };

    // Marks external post links with CSS classes based on their domain.
    // Runs once on page load — does not need to re-run when filter toggles.
    const classifyPostLinks = () => {
        for (const entry of document.querySelectorAll(".thing a.title")) {
            const post = getPostElement(entry);
            if (post.dataset.url.startsWith("/r")) continue;
            const url = new URL(post.dataset.url);
            const titleLink = post.querySelector(".title > a");
            if (SITES_FIXED.includes(url.hostname)) {
                titleLink.classList.add("fixedSite");
            }
            if (SITES_WITH_PAYWALL.includes(url.hostname)) {
                titleLink.classList.add("paywall");
                titleLink.href = `${PAYWALL_REMOVAL_SERVICE}${post.dataset.url}`;
            }
            if (TRASH_SITES.includes(url.hostname)) {
                titleLink.classList.add("trashSite");
            }
        }
    };

    // Shows or hides posts based on title, author, flair, and hidden-post list.
    // Called on load and whenever the filter is toggled.
    const filterEntries = () => {
        const hiddenPosts = JSON.parse(storage.getItem("hiddenPosts")) || [];
        for (const entry of document.querySelectorAll(".thing a.title")) {
            const post = getPostElement(entry);
            const postId = post.dataset.fullname;
            const author = post.dataset?.author?.toLowerCase();
            const flair = post.querySelector(".flairrichtext")?.title ?? "";
            if (!postId) continue;

            if (hiddenPosts.some(e => e.postId === postId)) {
                post.style.display = "none";
                continue;
            }

            const titleText = entry.text;
            if (titleText === undefined) continue;

            const shouldFilter = !isTitleClean(titleText)
                || AUTHOR_BLOCK_LIST.includes(author)
                || !isFlairAllowed(flair);
            if (shouldFilter) {
                post.style.display = filterIsActive ? "none" : "block";
            }
        }
    };

    const filterSubreddit = () => {
        for (const entry of document.querySelectorAll(".subreddit")) {
            const currentString = entry.textContent.toLowerCase();
            const isBlocked = SUBREDDIT_BLOCK_LIST.some(term => currentString.includes(term));
            const isAllowed = SUBREDDIT_ALLOW_LIST.includes(currentString);
            if (isBlocked && !isAllowed) {
                getPostElement(entry).style.display = "none";
            }
        }
    };

    const cleanLocalStorage = () => {
        const hiddenPosts = JSON.parse(storage.getItem("hiddenPosts"));
        if (!hiddenPosts) return;
        const cutoffDate = Date.now() - LOCALSTORAGE_TTL;
        const filtered = hiddenPosts.filter(e => e.timestamp >= cutoffDate);
        if (filtered.length !== hiddenPosts.length) {
            storage.setItem("hiddenPosts", JSON.stringify(filtered));
        }
    };

    const changeNavigationButtons = () => {
        setTimeout(() => {
            const parent = document.querySelector(".nextprev");
            if (!parent) return;
            const next = document.querySelector(".next-button");
            const prev = document.querySelector(".prev-button");
            parent.textContent = "";
            if (prev) {
                prev.querySelector("a").textContent = "<<<";
                parent.append(prev);
            }
            if (next) {
                next.querySelector("a").textContent = ">>>";
                parent.append(next);
            }
        }, 1000);
    };

    // ── Main ──────────────────────────────────────────────────────────────────

    addCustomMenu();
    const filterToggle = document.querySelector("#filterToggle");
    const hideAllButton = document.querySelector("#hideAllButton");

    filterToggle.addEventListener("click", async (e) => {
        e.preventDefault();
        e.target.classList.toggle("animateLink", true);
        filterIsActive = !filterIsActive;
        filterEntries();
        setStrikeThrough(filterToggle, !filterIsActive); // strikethrough = filter is OFF
        await timeout(2000);
        e.target.classList.toggle("animateLink", false);
    });

    hideAllButton.addEventListener("click", async (e) => {
        e.preventDefault();
        e.target.classList.toggle("animateLink", true);
        for (const button of document.querySelectorAll(".noCtrlF[data-event-action='hide']")) {
            saveHiddenPost(getPostElement(button).dataset.fullname);
        }
        filterEntries();
        await timeout(2000);
        e.target.classList.toggle("animateLink", false);
    });

    classifyPostLinks();
    filterEntries();
    filterSubreddit();
    cleanLocalStorage();
    changeNavigationButtons();
}
