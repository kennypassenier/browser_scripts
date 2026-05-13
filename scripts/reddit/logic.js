'use strict';

// Runs on all reddit.com subdomains via Tampermonkey.
//
// Route map:
//   www.reddit.com          → redirectToOldReddit() — bounces immediately to old.reddit.com
//   old.reddit.com/comments → setupCommentsPage()   — dark theme + comment cleanup
//   old.reddit.com/*        → setupRedditPage()     — dark theme + sidebar + auto-login
//   *.reddit.com            → applyPostFilters()    — personal post filter (hide/classify)

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIG = {
    debug: false,            // Set true to enable verbose logging and expose window._reddit
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

// ─── Logger ───────────────────────────────────────────────────────────────────
// Namespaced console wrapper. log.info is silenced unless CONFIG.debug is true.

const log = {
    info:  (...args) => CONFIG.debug && console.log('[reddit]', ...args),
    warn:  (...args) => console.warn('[reddit]', ...args),
    error: (...args) => console.error('[reddit]', ...args),
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
    nodes.forEach(node => {
        const parent = node.parentElement;
        if (!parent) { log.warn('removeParentOfAllNodes: node has no parent', node); return; }
        const grandparent = parent.parentElement;
        if (!grandparent) { log.warn('removeParentOfAllNodes: parent has no grandparent', node); return; }
        grandparent.removeChild(parent);
    });
};

// Injects the dark theme and UI cleanup CSS. The id guard prevents double-injection.
const injectStyles = () => {
    if (document.getElementById('reddit-custom-styles')) return;
    const style = document.createElement('style');
    style.id = 'reddit-custom-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
    log.info('Styles injected');
};

// The user span in the header contains karma counts, mail icons, and other noise.
// We strip it down to just the username link and the RES account switcher icon.
const simplifyUserHeader = (el) => {
    if (!el) { log.warn('simplifyUserHeader: user element not found — is RES active?'); return; }
    const accountSwitcher = el.querySelector("#RESAccountSwitcherIcon");
    const userlink = el.querySelector("a");
    if (!userlink) { log.warn('simplifyUserHeader: no user link found inside header span'); return; }
    el.textContent = "";
    el.appendChild(userlink);
    if (accountSwitcher) el.appendChild(accountSwitcher);
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

    get isExternal() { return !this.url.startsWith("/r"); }
    get hostname() {
        if (!this.isExternal) return null;
        try { return new URL(this.url).hostname; }
        catch { log.warn(`Post: invalid URL "${this.url}" on post ${this.id}`); return null; }
    }
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
        if (!hostname) return;
        if (CONFIG.sites.fixed.includes(hostname))   this.titleLink.classList.add("fixedSite");
        if (CONFIG.sites.trash.includes(hostname))   this.titleLink.classList.add("trashSite");
        if (CONFIG.sites.paywall.includes(hostname)) {
            this.titleLink.classList.add("paywall");
            this.titleLink.href = `${CONFIG.paywallService}${this.url}`;
        }
    }

    // Persists this post's id in the hiddenPosts localStorage list.
    saveHidden() {
        try {
            const list = JSON.parse(localStorage.getItem("hiddenPosts")) || [];
            if (!list.some(e => e.postId === this.id)) {
                list.push({ postId: this.id, timestamp: Date.now() });
                localStorage.setItem("hiddenPosts", JSON.stringify(list));
                log.info(`Post ${this.id} saved as hidden`);
            }
        } catch (err) {
            log.error('saveHidden: failed to update localStorage', err);
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

    // Returns the hiddenPosts array from localStorage, resetting it if corrupted.
    static getHiddenList() {
        try {
            return JSON.parse(localStorage.getItem("hiddenPosts")) || [];
        } catch (err) {
            log.error('Post.getHiddenList: localStorage data is corrupted, resetting', err);
            localStorage.removeItem("hiddenPosts");
            return [];
        }
    }
}

// RES adds a "show images" button to the listing header. Clicks it the moment it appears.
const clickShowImages = async () => {
    const btn = await waitForElement(".res-show-images a");
    btn.click();
    log.info('Show images clicked');
};

// Replaces the plain-text next/prev page links with large <<< / >>> arrows.
const changeNavigationButtons = async () => {
    const parent = await waitForElement(".nextprev");
    const next = document.querySelector(".next-button");
    const prev = document.querySelector(".prev-button");
    parent.textContent = "";
    if (prev) { prev.querySelector("a").textContent = "<<<"; parent.append(prev); }
    if (next) { next.querySelector("a").textContent = ">>>"; parent.append(next); }
    if (!prev && !next) log.warn('changeNavigationButtons: no prev or next button found');
    log.info('Navigation buttons updated');
};

// Removes localStorage entries for hidden posts older than CONFIG.localStorageTtl.
const cleanLocalStorage = () => {
    try {
        const hiddenPosts = JSON.parse(window.localStorage.getItem("hiddenPosts"));
        if (!hiddenPosts) return;
        const cutoff = Date.now() - CONFIG.localStorageTtl;
        const filtered = hiddenPosts.filter(e => e.timestamp >= cutoff);
        if (filtered.length !== hiddenPosts.length) {
            window.localStorage.setItem("hiddenPosts", JSON.stringify(filtered));
            log.info(`cleanLocalStorage: removed ${hiddenPosts.length - filtered.length} expired entries`);
        }
    } catch (err) {
        log.error('cleanLocalStorage: failed to parse hiddenPosts, resetting', err);
        window.localStorage.removeItem("hiddenPosts");
    }
};

// Adds a "Sidebar" link to the top-right header that shows/hides the sidebar on demand.
// The link starts with a strikethrough (sidebar is hidden by default).
const setupSidebarToggle = () => {
    const sidebar = document.querySelector(".side");
    const header  = document.querySelector("#header-bottom-right");
    if (!sidebar) { log.warn('setupSidebarToggle: sidebar (.side) not found'); return; }
    if (!header)  { log.warn('setupSidebarToggle: header (#header-bottom-right) not found'); return; }

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

    log.info('Sidebar toggle added');
};

// ─── Page functions ───────────────────────────────────────────────────────────

// www.reddit.com is just a redirect shell — all customizations live on old.reddit.com.
const redirectToOldReddit = () => {
    log.info('Redirecting www → old.reddit.com');
    location.replace(location.protocol + '//old.reddit.com' + location.pathname + location.search);
};

// Runs on a reddit comments page (old.reddit.com/r/*/comments/*).
// Injects the dark theme, strips header noise, removes embedded comment previews
// and inline child-comment toggles, flags rickroll links, and sets up the sidebar toggle.
const setupCommentsPage = () => {
    log.info('setupCommentsPage: starting');
    injectStyles();
    simplifyUserHeader(document.querySelector("span.user"));
    removeParentOfAllNodes(document.querySelectorAll(".embed-comment"));
    removeParentOfAllNodes(document.querySelectorAll(".toggleChildren"));

    let rickrollCount = 0;
    for (const link of document.querySelectorAll("a")) {
        if (link.href.includes("dQw4w9WgXcQ")) {
            link.title = link.textContent;
            link.textContent = "--> RICKROLL <--";
            rickrollCount++;
        }
    }
    if (rickrollCount > 0) log.warn(`setupCommentsPage: flagged ${rickrollCount} rickroll link(s)`);

    setupSidebarToggle();
    clickShowImages();
    log.info('setupCommentsPage: done');
};

// Runs on the reddit listing page (frontpage, subreddit, multireddit) on old.reddit.com.
// Injects the dark theme, strips header noise, adds the sidebar toggle, auto-clicks
// RES show-images, auto-logs in via RES if not logged in, and enlarges the pagination buttons.
const setupRedditPage = () => {
    log.info('setupRedditPage: starting');

    // If not logged in, open the RES account switcher dropdown and click the first account.
    const loginUser = async () => {
        const userSpan = document.querySelector("#header-bottom-right span");
        if (!userSpan) { log.warn('loginUser: #header-bottom-right span not found'); return; }
        if (!userSpan.querySelector("a.login-link")) return; // already logged in
        const switcherIcon = userSpan.querySelector("#RESAccountSwitcherIcon");
        if (!switcherIcon) { log.warn('loginUser: RES account switcher not found — is RES installed?'); return; }
        switcherIcon.click();
        const item = await waitForElement(".RESHover.RESHoverDropdownList ul li");
        item.click();
        log.info('loginUser: auto-login triggered');
    };

    injectStyles();
    simplifyUserHeader(document.querySelector("span.user"));
    setupSidebarToggle();
    clickShowImages();
    loginUser();
    changeNavigationButtons();
    log.info('setupRedditPage: done');
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
    if (!isListingPage) { log.info(`applyPostFilters: skipping non-listing path "${location.pathname}"`); return; }

    log.info('applyPostFilters: starting');
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
        if (!header) { log.warn('addCustomMenu: #header-bottom-right not found — buttons not added'); return; }
        header.appendChild(createSeparator());
        header.appendChild(createHeaderLink("filterToggle", "Filter"));
        header.appendChild(createSeparator());
        header.appendChild(createHeaderLink("hideAllButton", "Hide posts"));
        log.info('addCustomMenu: Filter and Hide posts buttons added');
    };

    // Classifies all external post links by domain type (runs once on load).
    const classifyPostLinks = () => {
        const posts = Post.getAll();
        log.info(`classifyPostLinks: processing ${posts.length} posts`);
        for (const post of posts) post.classify();
    };

    // Shows or hides posts based on their block status and the hidden-posts list.
    const filterEntries = () => {
        const hiddenList = Post.getHiddenList();
        let hiddenCount = 0, filteredCount = 0;
        for (const post of Post.getAll()) {
            if (!post.id) continue;
            if (post.isHiddenIn(hiddenList)) { post.hide(); hiddenCount++; continue; }
            if (post.isBlocked) { filterIsActive ? post.hide() : post.show(); filteredCount++; }
        }
        log.info(`filterEntries: ${hiddenCount} permanently hidden, ${filteredCount} filtered (filter ${filterIsActive ? 'on' : 'off'})`);
    };

    const filterSubreddit = () => {
        let count = 0;
        for (const post of Post.getAll()) {
            if (post.isSubredditBlocked) { post.hide(); count++; }
        }
        log.info(`filterSubreddit: ${count} posts hidden by subreddit`);
    };

    // ── Bootstrap ─────────────────────────────────────────────────────────────

    addCustomMenu();
    const filterToggle  = document.querySelector("#filterToggle");
    const hideAllButton = document.querySelector("#hideAllButton");

    if (!filterToggle)  log.warn('applyPostFilters: #filterToggle not found after addCustomMenu');
    if (!hideAllButton) log.warn('applyPostFilters: #hideAllButton not found after addCustomMenu');

    filterToggle?.addEventListener("click", async (e) => {
        e.preventDefault();
        await withAnimation(e.target, async () => {
            filterIsActive = !filterIsActive;
            filterEntries();
            setStrikeThrough(filterToggle, !filterIsActive);
        });
    });

    hideAllButton?.addEventListener("click", async (e) => {
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
    log.info('applyPostFilters: done');
};

// ─── Router ───────────────────────────────────────────────────────────────────
// Evaluated top-to-bottom; first matching route wins.

const routes = [
    { match: () => location.host.startsWith('www.'),                                             run: redirectToOldReddit },
    { match: () => location.host === 'old.reddit.com' && /\/comments\//.test(location.pathname), run: setupCommentsPage },
    { match: () => location.host === 'old.reddit.com',                                           run: setupRedditPage },
    { match: () => true,                                                                          run: applyPostFilters },
];

const matchedRoute = routes.find(r => r.match());
if (!matchedRoute) {
    log.warn('Router: no matching route for', location.href);
} else {
    log.info(`Router: matched → ${matchedRoute.run.name}()`);
    matchedRoute.run();
}

// ─── Debug / test harness ─────────────────────────────────────────────────────
// Only active when CONFIG.debug = true.
// Set CONFIG.debug = true in the Config section above, then open the browser console.
//
// Usage:
//   window._reddit.runTests()     — print a pass/fail report for all features on this page
//   window._reddit.Post.getAll()  — inspect all Post objects on the current listing
//   window._reddit.cleanLocalStorage()  — manually trigger localStorage cleanup
//   window._reddit.applyPostFilters()   — re-run the filter layer without a page reload

if (CONFIG.debug) {
    // Each test returns true (pass), false (fail), or throws (error).
    // Tests are naturally scoped — they check DOM state after the page functions have run,
    // so tests that don't apply to the current page will simply fail as "not found".
    const tests = {
        // Styles & theme
        'Dark theme injected':            () => !!document.getElementById('reddit-custom-styles'),

        // Header elements
        'Sidebar toggle present':         () => !!document.getElementById('sidebarToggle'),
        'Filter button present':          () => !!document.getElementById('filterToggle'),
        'Hide posts button present':      () => !!document.getElementById('hideAllButton'),

        // Navigation
        'Prev button replaced with <<<':  () => document.querySelector('.prev-button a')?.textContent === '<<<',
        'Next button replaced with >>>':  () => document.querySelector('.next-button a')?.textContent === '>>>',

        // Comments page cleanup
        'Embed comments removed':         () => document.querySelectorAll('.embed-comment').length === 0,
        'Child comment toggles removed':  () => document.querySelectorAll('.toggleChildren').length === 0,

        // User header
        'User karma stripped from header':() => !document.querySelector('span.user .userkarma'),

        // Post class
        'Posts found on page':            () => Post.getAll().length > 0,
        'localStorage readable':          () => { Post.getHiddenList(); return true; },
    };

    window._reddit = {
        // Expose config and core class for inspection
        config: CONFIG,
        Post,

        // Re-expose all page functions so they can be called manually from the console
        redirectToOldReddit,
        setupCommentsPage,
        setupRedditPage,
        applyPostFilters,

        // Re-expose utility functions
        cleanLocalStorage,
        changeNavigationButtons,
        clickShowImages,

        // Runs all tests and prints a grouped pass/fail report in the console.
        runTests() {
            console.group(`[reddit] Test report — ${location.href}`);
            let passed = 0, failed = 0;
            for (const [name, fn] of Object.entries(tests)) {
                try {
                    const result = fn();
                    if (result) { console.log(`  ✓ ${name}`); passed++; }
                    else        { console.warn(`  ✗ ${name}`); failed++; }
                } catch (err) {
                    console.error(`  ✗ ${name} — threw: ${err.message}`); failed++;
                }
            }
            console.log(`\n  ${passed} passed, ${failed} failed`);
            console.groupEnd();
        },
    };

    log.info('Debug mode active — run window._reddit.runTests() to check all features on this page.');
}