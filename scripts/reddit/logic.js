'use strict';

// Runs on all reddit.com subdomains via Tampermonkey.
//
// Route map:
//   www.reddit.com          → redirectToOldReddit() — bounces immediately to old.reddit.com
//   old.reddit.com/comments → setupCommentsPage()     — dark theme + comment thread cleanup
//   old.reddit.com/*        → setupRedditPage()     — dark theme + sidebar + auto-login
//   *.reddit.com            → applyPostFilters()    — personal post filter (hide/classify)

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

const createSeparator = () => {
    const sep = document.createElement("span");
    sep.textContent = " | ";
    sep.className = "separator";
    return sep;
};

// Removes the immediate DOM parent of each node in the list.
// Used to strip wrapper elements along with their child in one pass.
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

// Post wraps a .thing DOM element with typed properties and action methods.
// All querySelector calls happen once at construction time, keeping loops clean.
class Post {
    constructor(el) {
        this.el        = el;
        this.id        = el.dataset.fullname;
        this.author    = el.dataset.author?.toLowerCase() ?? "";
        this.url       = el.dataset.url ?? "";
        this.titleLink = el.querySelector(".title > a");
        this.title     = this.titleLink?.textContent ?? "";
        this.flair     = el.querySelector(".flairrichtext")?.title ?? "";
        this.subreddit = el.querySelector(".subreddit")?.textContent?.toLowerCase() ?? "";
    }

    // ── Computed properties ──────────────────────────────────────────────────

    get isExternal()         { return !this.url.startsWith("/r"); }
    get hostname()           { return this.isExternal ? new URL(this.url).hostname : null; }
    get isTitleBlocked()     { return matchesBlockList(this.title, CONFIG.filter.titles); }
    get isAuthorBlocked()    { return CONFIG.filter.authors.includes(this.author); }
    get isFlairBlocked()     { return this.flair.length > 0 && matchesBlockList(this.flair, CONFIG.filter.flairs); }
    get isSubredditBlocked() {
        return matchesBlockList(this.subreddit, CONFIG.filter.subreddits.blocked)
            && !CONFIG.filter.subreddits.allowed.includes(this.subreddit);
    }
    get isBlocked() { return this.isTitleBlocked || this.isAuthorBlocked || this.isFlairBlocked; }

    // ── Actions ──────────────────────────────────────────────────────────────

    hide() { this.el.style.display = "none"; }
    show() { this.el.style.display = "block"; }

    // Applies a CSS class to the title link based on its domain type.
    // Rewrites the href to route paywall links through the removal service.
    classify() {
        if (!this.isExternal || !this.titleLink) return;
        const { hostname } = this;
        if (CONFIG.sites.fixed.includes(hostname))   this.titleLink.classList.add("fixedSite");
        if (CONFIG.sites.trash.includes(hostname))   this.titleLink.classList.add("trashSite");
        if (CONFIG.sites.paywall.includes(hostname)) {
            this.titleLink.classList.add("paywall");
            this.titleLink.href = `${CONFIG.paywallService}${this.url}`;
        }
    }

    // Persists this post's id in the hiddenPosts localStorage list.
    saveHidden() {
        const list = JSON.parse(localStorage.getItem("hiddenPosts")) || [];
        if (!list.some(e => e.postId === this.id)) {
            list.push({ postId: this.id, timestamp: Date.now() });
            localStorage.setItem("hiddenPosts", JSON.stringify(list));
        }
    }

    // Returns true if this post appears in the provided hidden-posts array.
    isHiddenIn(hiddenList) {
        return hiddenList.some(e => e.postId === this.id);
    }

    // ── Static helpers ───────────────────────────────────────────────────────

    // Returns a Post instance for every .thing in the current listing.
    static getAll() {
        return [...document.querySelectorAll(".thing[data-fullname]")].map(el => new Post(el));
    }

    // Returns the raw hiddenPosts array from localStorage.
    static getHiddenList() {
        return JSON.parse(localStorage.getItem("hiddenPosts")) || [];
    }
}

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
    header.appendChild(createSeparator());
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

// www.reddit.com is just a redirect shell — all customizations live on old.reddit.com.
const redirectToOldReddit = () => {
    location.replace(location.protocol + '//old.reddit.com' + location.pathname + location.search);
};

// Runs on a reddit comments page (old.reddit.com/r/*/comments/*).
// Injects the dark theme, strips header noise, removes embedded comment previews
// and inline child-comment toggles, flags rickroll links, and sets up the sidebar toggle.
const setupCommentsPage = () => {
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

// Runs on the reddit listing page (frontpage, subreddit, multireddit) on old.reddit.com.
// Injects the dark theme, strips header noise, adds the sidebar toggle, auto-clicks
// RES show-images, auto-logs in via RES if not logged in, and enlarges the pagination buttons.
const setupRedditPage = () => {
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

// Runs on all non-old.reddit.com subdomains — the personal content filtering layer.
// Only activates on listing pages (frontpage and subreddits); skips comments pages,
// user profiles, message inboxes, preferences, and any other non-listing URL.
// Adds "Filter" and "Hide posts" buttons to the header, colours external links by domain
// (paywall/trash/fixed), and hides posts matching the title/author/flair block lists.
// Posts marked via "Hide posts" are persisted in localStorage with a 72h TTL.
const applyPostFilters = () => {
    // Only run on listing pages: the frontpage (/) or a subreddit (/r/...), but not threads.
    const isListingPage = /^\/$|^\/r\//.test(location.pathname) && !/\/comments\//.test(location.pathname);
    if (!isListingPage) return;

    let filterIsActive = true;

    // ── Helpers ───────────────────────────────────────────────────────────────

    const setStrikeThrough = (el, active) => el.classList.toggle("strikeThrough", active);

    const createHeaderLink = (id, text) => {
        const a = document.createElement("a");
        a.id = id; a.href = "#"; a.textContent = text;
        return a;
    };

    // ── Core logic ────────────────────────────────────────────────────────────

    const addCustomMenu = () => {
        const header = document.querySelector("#header-bottom-right");
        header.appendChild(createSeparator());
        header.appendChild(createHeaderLink("filterToggle", "Filter"));
        header.appendChild(createSeparator());
        header.appendChild(createHeaderLink("hideAllButton", "Hide posts"));
    };

    // Classifies all external post links by domain type (runs once on load).
    const classifyPostLinks = () => {
        for (const post of Post.getAll()) post.classify();
    };

    // Shows or hides posts based on their block status and the hidden-posts list.
    const filterEntries = () => {
        const hiddenList = Post.getHiddenList();
        for (const post of Post.getAll()) {
            if (!post.id) continue;
            if (post.isHiddenIn(hiddenList))  { post.hide(); continue; }
            if (post.isBlocked) filterIsActive ? post.hide() : post.show();
        }
    };

    const filterSubreddit = () => {
        for (const post of Post.getAll()) {
            if (post.isSubredditBlocked) post.hide();
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
            for (const post of Post.getAll()) post.saveHidden();
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
// Evaluated top-to-bottom; first matching route wins.

const routes = [
    { match: () => location.host.startsWith('www.'),                                             run: redirectToOldReddit },
    { match: () => location.host === 'old.reddit.com' && /\/comments\//.test(location.pathname), run: setupCommentsPage },
    { match: () => location.host === 'old.reddit.com',                                           run: setupRedditPage },
    { match: () => true,                                                                          run: applyPostFilters },
];

routes.find(r => r.match()).run();