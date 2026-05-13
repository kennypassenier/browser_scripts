'use strict';

// This script runs on all reddit.com subdomains.
// - www.reddit.com  → redirected immediately to old.reddit.com
// - old.reddit.com  → dark theme injected, sidebar hidden, auto-login via RES
//   - /comments/ pages → comment cleanup (embed removal, rickroll detection)
//   - all other pages  → frontpage (show-images, sidebar toggle, navigation)
// - any other subdomain → custom filtering layer (post/author/flair/domain filters)

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIG = {
    paywallService: "https://www.smry.ai/proxy?url=",
    localStorageTtl: 1000 * 60 * 60 * 72, // 72 hours

    filter: {
        titles: [
            "kanye", "pokemon", "pokémon", "pikachu",
            "bitcoin", "cryptocurrency", " nft ", "fungible", "doge", "blockchain",
            "official trailer", "nft ", " nft",
            "predictions tournament",
            "twitter",
            "marjorie taylor greene", "shapiro", "andrew tate",
            "rainbow bridge", "mug shot", "mugshot",
            "airdrop", "layerzero",
            "ted cruz", "boebert", "kissinger", "aaron rodgers",
            "drake", "andy dick", "doherty", "giuliani", "fox news", "biden",
            "jake paul", "logan paul", "tina peters", "liam payne",
            "pope", "ozzy",
            "slams",
            "no kings", "no-kings",
        ],
        subreddits: {
            blocked: ["meme", "circlejerk", "okbuddy", "mains", "anime", "crypto", "india", "snark"],
            allowed: ["r/wholesomememes"],
        },
        authors: ["mekyas23", "cooperationapples", "noveljazzlike9473"],
        flairs:  ["mourning/loss", "rainbow bridge", "pet loss", "trump news"],
    },

    sites: {
        fixed:   ["www.nytimes.com"],
        paywall: [
            "www.forbes.com", "www.wjtv.com", "www.independent.co.uk",
            "www.theguardian.com", "www.wusa9.com", "www.theatlantic.com",
            "www.washingtonpost.com",
        ],
        trash:   ["nypost.com"],
    },
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const STYLES = `
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

// ─── Utilities ────────────────────────────────────────────────────────────────

const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Resolves with the element immediately if already in the DOM,
// otherwise waits for it to appear via MutationObserver.
const waitForElement = (selector) => new Promise(resolve => {
    const el = document.querySelector(selector);
    if (el) { resolve(el); return; }
    const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) { observer.disconnect(); resolve(el); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
});

// Wraps an async action with the animateLink CSS animation (fade in/out over 2s).
const withAnimation = async (el, fn) => {
    el.classList.toggle("animateLink", true);
    await fn();
    await timeout(2000);
    el.classList.toggle("animateLink", false);
};

// Returns true if the value (case-insensitive) matches any term in the list.
const matchesBlockList = (value, list) =>
    list.some(term => value.toLowerCase().includes(term.toLowerCase()));

const generateSeparator = () => {
    const sep = document.createElement("span");
    sep.textContent = " | ";
    sep.className = "separator";
    return sep;
};

const removeParentOfAllNodes = (nodes) => {
    nodes.forEach(node => node.parentElement.parentElement.removeChild(node.parentElement));
};

// Injects the dark theme and UI cleanup CSS. The id guard prevents double-injection.
const injectStyles = () => {
    if (document.getElementById('reddit-custom-styles')) return;
    const style = document.createElement('style');
    style.id = 'reddit-custom-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
};

// The user span in the header contains karma counts, mail icons, and other noise.
// We strip it down to just the username link and the RES account switcher icon.
const simplifyUserHeader = (el) => {
    const accountSwitcher = el.querySelector("#RESAccountSwitcherIcon");
    const userlink = el.querySelector("a");
    el.textContent = "";
    el.appendChild(userlink);
    el.appendChild(accountSwitcher);
};

// Old Reddit wraps each post in a <div class="thing">. This reaches it from any descendant.
const getPostElement = (el) => el.closest('.thing');

// RES adds a "show images" button to the listing header. Clicks it the moment it appears.
const clickShowImages = async () => {
    const btn = await waitForElement(".res-show-images a");
    btn.click();
};

// Replaces the plain-text next/prev page links with large <<< / >>> arrows.
const changeNavigationButtons = async () => {
    const parent = await waitForElement(".nextprev");
    const next = document.querySelector(".next-button");
    const prev = document.querySelector(".prev-button");
    parent.textContent = "";
    if (prev) { prev.querySelector("a").textContent = "<<<"; parent.append(prev); }
    if (next) { next.querySelector("a").textContent = ">>>"; parent.append(next); }
};

// Removes localStorage entries for hidden posts older than CONFIG.localStorageTtl.
const cleanLocalStorage = () => {
    const hiddenPosts = JSON.parse(window.localStorage.getItem("hiddenPosts"));
    if (!hiddenPosts) return;
    const cutoff = Date.now() - CONFIG.localStorageTtl;
    const filtered = hiddenPosts.filter(e => e.timestamp >= cutoff);
    if (filtered.length !== hiddenPosts.length) {
        window.localStorage.setItem("hiddenPosts", JSON.stringify(filtered));
    }
};

// Adds a "Sidebar" link to the top-right header that shows/hides the sidebar on demand.
// The link starts with a strikethrough (sidebar is hidden by default).
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
        await withAnimation(e.target, async () => {
            sidebar.style.display = sidebar.style.display === "none" ? "block" : "none";
            sidebarLink.classList.toggle("strikeThrough");
        });
    });
};

// ─── Page functions ───────────────────────────────────────────────────────────

const runRedirect = () => {
    location.replace(location.protocol + '//old.reddit.com' + location.pathname + location.search);
};

// Cleans up a thread page on old.reddit.com.
const runCommentsPage = () => {
    injectStyles();
    simplifyUserHeader(document.querySelector("span.user"));
    removeParentOfAllNodes(document.querySelectorAll(".embed-comment"));
    removeParentOfAllNodes(document.querySelectorAll(".toggleChildren"));

    // Flag any YouTube rickroll links with visible text so they can't sneak by.
    for (const link of document.querySelectorAll("a")) {
        if (link.href.includes("dQw4w9WgXcQ")) {
            link.title = link.textContent;
            link.textContent = "--> RICKROLL <--";
        }
    }

    setupSidebarToggle();
    clickShowImages();
};

// Sets up the old Reddit listing page (frontpage or subreddit).
const runFrontpage = () => {
    // If not logged in, open the RES account switcher dropdown and click the first account.
    const loginUser = async () => {
        const userSpan = document.querySelector("#header-bottom-right span");
        if (!userSpan.querySelector("a.login-link")) return;
        userSpan.querySelector("#RESAccountSwitcherIcon").click();
        const item = await waitForElement(".RESHover.RESHoverDropdownList ul li");
        item.click();
    };

    injectStyles();
    simplifyUserHeader(document.querySelector("span.user"));
    setupSidebarToggle();
    clickShowImages();
    loginUser();
    changeNavigationButtons();
};

// Custom filtering layer for the Reddit frontpage listing.
// Adds "Filter" and "Hide posts" buttons, classifies links by domain, filters posts
// by title/author/flair, and persists hidden posts in localStorage (72h TTL).
const runModernFrontpage = () => {
    if (/\/comments\//.test(location.pathname)) return;

    const storage = window.localStorage;
    let filterIsActive = true;

    // ── Helpers ───────────────────────────────────────────────────────────────

    const isTitleClean    = (title) => !matchesBlockList(title, CONFIG.filter.titles);
    const isFlairAllowed  = (flair) => flair.length === 0 || !matchesBlockList(flair, CONFIG.filter.flairs);
    const setStrikeThrough = (el, active) => el.classList.toggle("strikeThrough", active);

    const saveHiddenPost = (postId) => {
        const hiddenPosts = JSON.parse(storage.getItem('hiddenPosts')) || [];
        if (!hiddenPosts.some(e => e.postId === postId)) {
            hiddenPosts.push({ postId, timestamp: Date.now() });
            storage.setItem('hiddenPosts', JSON.stringify(hiddenPosts));
        }
    };

    const createHeaderLink = (id, text) => {
        const a = document.createElement("a");
        a.id = id; a.href = "#"; a.textContent = text;
        return a;
    };

    // ── Core logic ────────────────────────────────────────────────────────────

    const addCustomMenu = () => {
        const header = document.querySelector("#header-bottom-right");
        header.appendChild(generateSeparator());
        header.appendChild(createHeaderLink("filterToggle", "Filter"));
        header.appendChild(generateSeparator());
        header.appendChild(createHeaderLink("hideAllButton", "Hide posts"));
    };

    // Marks external post links with CSS classes based on their domain (runs once on load).
    const classifyPostLinks = () => {
        for (const entry of document.querySelectorAll(".thing a.title")) {
            const post = getPostElement(entry);
            if (post.dataset.url.startsWith("/r")) continue;
            const { hostname } = new URL(post.dataset.url);
            const titleLink = post.querySelector(".title > a");
            if (CONFIG.sites.fixed.includes(hostname))   titleLink.classList.add("fixedSite");
            if (CONFIG.sites.trash.includes(hostname))   titleLink.classList.add("trashSite");
            if (CONFIG.sites.paywall.includes(hostname)) {
                titleLink.classList.add("paywall");
                titleLink.href = `${CONFIG.paywallService}${post.dataset.url}`;
            }
        }
    };

    // Shows or hides posts based on title, author, flair, and the hidden-post list.
    const filterEntries = () => {
        const hiddenPosts = JSON.parse(storage.getItem("hiddenPosts")) || [];
        for (const entry of document.querySelectorAll(".thing a.title")) {
            const post = getPostElement(entry);
            const postId = post.dataset.fullname;
            if (!postId) continue;

            if (hiddenPosts.some(e => e.postId === postId)) {
                post.style.display = "none";
                continue;
            }

            const titleText = entry.text;
            if (titleText === undefined) continue;

            const author = post.dataset?.author?.toLowerCase();
            const flair  = post.querySelector(".flairrichtext")?.title ?? "";

            const shouldFilter = !isTitleClean(titleText)
                || CONFIG.filter.authors.includes(author)
                || !isFlairAllowed(flair);

            if (shouldFilter) post.style.display = filterIsActive ? "none" : "block";
        }
    };

    const filterSubreddit = () => {
        for (const entry of document.querySelectorAll(".subreddit")) {
            const name = entry.textContent.toLowerCase();
            const isBlocked = matchesBlockList(name, CONFIG.filter.subreddits.blocked);
            const isAllowed = CONFIG.filter.subreddits.allowed.includes(name);
            if (isBlocked && !isAllowed) getPostElement(entry).style.display = "none";
        }
    };

    // ── Bootstrap ─────────────────────────────────────────────────────────────

    addCustomMenu();
    const filterToggle  = document.querySelector("#filterToggle");
    const hideAllButton = document.querySelector("#hideAllButton");

    filterToggle.addEventListener("click", async (e) => {
        e.preventDefault();
        await withAnimation(e.target, async () => {
            filterIsActive = !filterIsActive;
            filterEntries();
            setStrikeThrough(filterToggle, !filterIsActive);
        });
    });

    hideAllButton.addEventListener("click", async (e) => {
        e.preventDefault();
        await withAnimation(e.target, async () => {
            for (const btn of document.querySelectorAll(".noCtrlF[data-event-action='hide']")) {
                saveHiddenPost(getPostElement(btn).dataset.fullname);
            }
            filterEntries();
        });
    });

    classifyPostLinks();
    filterEntries();
    filterSubreddit();
    cleanLocalStorage();
    changeNavigationButtons();
};

// ─── Router ───────────────────────────────────────────────────────────────────

const routes = [
    { match: () => location.host.startsWith('www.'),                                             run: runRedirect },
    { match: () => location.host === 'old.reddit.com' && /\/comments\//.test(location.pathname), run: runCommentsPage },
    { match: () => location.host === 'old.reddit.com',                                           run: runFrontpage },
    { match: () => true,                                                                          run: runModernFrontpage },
];

routes.find(r => r.match()).run();