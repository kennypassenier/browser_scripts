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
    debug: true,            // Set true to enable verbose logging and expose window._reddit
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
        flairs: ["mourning/loss", "rainbow bridge", "pet loss", "trump news"],
    },

    sites: {
        fixed: ["www.nytimes.com"],
        paywall: [
            "www.forbes.com", "www.wjtv.com", "www.independent.co.uk",
            "www.theguardian.com", "www.wusa9.com", "www.theatlantic.com",
            "www.washingtonpost.com",
        ],
        trash: ["nypost.com"],
    },
};

// ─── Logger ───────────────────────────────────────────────────────────────────
// Namespaced console wrapper. log.info is silenced unless CONFIG.debug is true.

const log = {
    info: (...args) => CONFIG.debug && console.log('[reddit]', ...args),
    warn: (...args) => console.warn('[reddit]', ...args),
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
        this.el = el;
        this.id = el.dataset.fullname;
        this.author = el.dataset.author?.toLowerCase() ?? "";
        this.url = el.dataset.url ?? "";
        this.titleLink = el.querySelector(".title > a");
        this.title = this.titleLink?.textContent ?? "";
        this.flair = el.querySelector(".flairrichtext")?.title ?? "";
        this.subreddit = el.querySelector(".subreddit")?.textContent?.toLowerCase() ?? "";
    }

    // ── Computed properties ──────────────────────────────────────────────────

    get isExternal() { return !this.url.startsWith("/r"); }
    get hostname() {
        if (!this.isExternal) return null;
        try { return new URL(this.url).hostname; }
        catch { log.warn(`Post: invalid URL "${this.url}" on post ${this.id}`); return null; }
    }
    get isTitleBlocked() { return matchesBlockList(this.title, CONFIG.filter.titles); }
    get isAuthorBlocked() { return CONFIG.filter.authors.includes(this.author); }
    get isFlairBlocked() { return this.flair.length > 0 && matchesBlockList(this.flair, CONFIG.filter.flairs); }
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
        if (CONFIG.sites.fixed.includes(hostname)) this.titleLink.classList.add("fixedSite");
        if (CONFIG.sites.trash.includes(hostname)) this.titleLink.classList.add("trashSite");
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
    const header = document.querySelector("#header-bottom-right");
    if (!sidebar) { log.warn('setupSidebarToggle: sidebar (.side) not found'); return; }
    if (!header) { log.warn('setupSidebarToggle: header (#header-bottom-right) not found'); return; }

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
            if (post.isHiddenIn(hiddenList)) {
                post.hide();
                hiddenCount++;
                if (CONFIG.debug) log.info(`filterEntries [hidden] "${post.title}"`);
                continue;
            }
            if (post.isBlocked) {
                filterIsActive ? post.hide() : post.show();
                filteredCount++;
                if (CONFIG.debug) {
                    const reasons = [
                        post.isTitleBlocked && `title`,
                        post.isAuthorBlocked && `author:${post.author}`,
                        post.isFlairBlocked && `flair:${post.flair}`,
                    ].filter(Boolean).join(', ');
                    log.info(`filterEntries [blocked (${reasons})] "${post.title}"`);
                }
            }
        }
        log.info(`filterEntries: ${hiddenCount} permanently hidden, ${filteredCount} filtered (filter ${filterIsActive ? 'on' : 'off'})`);
    };

    const filterSubreddit = () => {
        let count = 0;
        for (const post of Post.getAll()) {
            if (post.isSubredditBlocked) {
                post.hide();
                count++;
                if (CONFIG.debug) log.info(`filterSubreddit [blocked] r/${post.subreddit} — "${post.title}"`);
            }
        }
        log.info(`filterSubreddit: ${count} posts hidden by subreddit`);
    };

    // ── Bootstrap ─────────────────────────────────────────────────────────────

    addCustomMenu();
    const filterToggle = document.querySelector("#filterToggle");
    const hideAllButton = document.querySelector("#hideAllButton");

    if (!filterToggle) log.warn('applyPostFilters: #filterToggle not found after addCustomMenu');
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
    { match: () => location.host.startsWith('www.'), run: redirectToOldReddit },
    { match: () => location.host === 'old.reddit.com' && /\/comments\//.test(location.pathname), run: setupCommentsPage },
    { match: () => location.host === 'old.reddit.com', run: setupRedditPage },
    { match: () => true, run: applyPostFilters },
];

const matchedRoute = routes.find(r => r.match());
if (!matchedRoute) {
    log.warn('Router: no matching route for', location.href);
} else {
    log.info(`Router: matched → ${matchedRoute.run.name}()`);
    matchedRoute.run();
}

// ─── Debug harness ────────────────────────────────────────────────────────────
// Only active when CONFIG.debug = true.
// Set CONFIG.debug = true in the Config section above, then reload the page.
//
// Then open the browser console and run:
//   window._reddit.help()   — print the full feature checklist for manual testing

if (CONFIG.debug) {
    // FEATURES is the single source of truth for everything this script does.
    // Each entry describes one feature: which page to visit, what to look for,
    // and optionally a console command to help inspect or trigger it manually.
    const FEATURES = [
        {
            group: 'www.reddit.com',
            items: [
                {
                    feature: 'Redirect to old.reddit.com',
                    url: 'https://www.reddit.com/',
                    expect: 'Browser immediately lands on https://old.reddit.com/',
                },
            ],
        },
        {
            group: 'old.reddit.com — all pages',
            items: [
                {
                    feature: 'Dark theme applied',
                    url: 'https://old.reddit.com/',
                    expect: 'Background is black, text is white',
                },
                {
                    feature: 'User header simplified',
                    url: 'https://old.reddit.com/',
                    expect: 'Top-right user area shows only username + RES switcher icon, no karma numbers',
                },
                {
                    feature: 'Sidebar hidden by default',
                    url: 'https://old.reddit.com/',
                    expect: 'Right sidebar is not visible on page load',
                },
                {
                    feature: 'Sidebar toggle button',
                    url: 'https://old.reddit.com/',
                    expect: '"Sidebar" link appears in top-right header with strikethrough; click toggles sidebar visibility',
                },
                {
                    feature: 'Show images auto-clicked (RES)',
                    url: 'https://old.reddit.com/',
                    expect: 'Post images expand automatically without manually clicking "show images"',
                    note: 'Requires Reddit Enhancement Suite to be installed',
                },
                {
                    feature: 'Navigation buttons enlarged',
                    url: 'https://old.reddit.com/',
                    expect: 'Bottom of listing shows large "<<<" and ">>>" buttons instead of small text links',
                },
            ],
        },
        {
            group: 'old.reddit.com — listing page only',
            items: [
                {
                    feature: 'Auto-login via RES',
                    url: 'https://old.reddit.com/ (while logged out)',
                    expect: 'RES account switcher opens and first account is clicked automatically',
                    note: 'Only triggers when a login link is detected in the header',
                },
            ],
        },
        {
            group: 'old.reddit.com — comments page',
            items: [
                {
                    feature: 'Dark theme applied',
                    url: 'Any https://old.reddit.com/r/*/comments/* thread',
                    expect: 'Background is black, text is white',
                },
                {
                    feature: 'User header simplified',
                    url: 'Any https://old.reddit.com/r/*/comments/* thread',
                    expect: 'Top-right user area shows only username + RES switcher icon, no karma numbers',
                },
                {
                    feature: 'Sidebar hidden by default',
                    url: 'Any https://old.reddit.com/r/*/comments/* thread',
                    expect: 'Right sidebar is not visible on page load',
                },
                {
                    feature: 'Sidebar toggle button',
                    url: 'Any https://old.reddit.com/r/*/comments/* thread',
                    expect: '"Sidebar" link appears in top-right header; click toggles sidebar visibility',
                },
                {
                    feature: 'Show images auto-clicked (RES)',
                    url: 'Any https://old.reddit.com/r/*/comments/* thread',
                    expect: 'Inline images expand automatically without manually clicking "show images"',
                    note: 'Requires Reddit Enhancement Suite to be installed',
                },
                {
                    feature: 'Embedded comment previews removed',
                    url: 'Any https://old.reddit.com/r/*/comments/* thread',
                    expect: 'No inline .embed-comment blocks visible in the thread',
                },
                {
                    feature: 'Child comment toggles removed',
                    url: 'Any https://old.reddit.com/r/*/comments/* thread',
                    expect: 'No "show child comments" inline toggles visible',
                },
                {
                    feature: 'Rickroll links flagged',
                    url: 'Any thread containing a youtu.be/dQw4w9WgXcQ link',
                    expect: 'Link text replaced with "--> RICKROLL <--"',
                },
            ],
        },
        {
            group: 'reddit.com (non-old) — listing pages only',
            items: [
                {
                    feature: 'Filter button added to header',
                    url: 'Any listing: old.reddit.com/, /r/popular/, /r/AskReddit/, etc.',
                    expect: '"Filter" link appears in top-right header',
                    cmd: '!!document.getElementById("filterToggle")',
                },
                {
                    feature: 'Hide posts button added to header',
                    url: 'Any listing (same as above)',
                    expect: '"Hide posts" link appears in top-right header',
                    cmd: '!!document.getElementById("hideAllButton")',
                },
                {
                    feature: 'Filter toggle hides blocked posts',
                    url: 'Any listing — r/all and r/popular are good for finding varied content',
                    expect: 'Posts matching title/author/flair block lists are hidden; clicking "Filter" shows/hides them',
                    cmd: 'window._reddit.Post.getAll().filter(p => p.isBlocked)',
                },
                {
                    feature: 'Subreddit filter hides blocked subreddits',
                    url: 'Any multi-subreddit listing (r/all, r/popular, frontpage)',
                    expect: 'Posts from blocked subreddits (e.g. r/meme, r/anime) are hidden',
                    cmd: 'window._reddit.Post.getAll().filter(p => p.isSubredditBlocked)',
                },
                {
                    feature: 'Paywall links rerouted',
                    url: 'Any listing — find a Forbes/Guardian/etc post (r/all is easiest)',
                    expect: 'Title link href starts with the smry.ai proxy URL; link is blue',
                    cmd: 'window._reddit.Post.getAll().filter(p => p.hostname && CONFIG.sites.paywall.includes(p.hostname))',
                },
                {
                    feature: 'Trash site links dimmed',
                    url: 'Any listing — find a NY Post link',
                    expect: 'Title link has dark green colour (.trashSite class)',
                    cmd: 'window._reddit.Post.getAll().filter(p => p.hostname && CONFIG.sites.trash.includes(p.hostname))',
                },
                {
                    feature: 'Fixed site links highlighted',
                    url: 'Any listing — find an NYTimes link',
                    expect: 'Title link is orange (.fixedSite class)',
                    cmd: 'window._reddit.Post.getAll().filter(p => p.hostname && CONFIG.sites.fixed.includes(p.hostname))',
                },
                {
                    feature: 'Hide posts persists across page loads',
                    url: 'Any listing',
                    expect: 'Click "Hide posts", reload the page — same posts remain hidden',
                    cmd: 'window._reddit.Post.getHiddenList()',
                },
                {
                    feature: 'applyPostFilters skips non-listing pages',
                    url: 'https://old.reddit.com/u/username or /message/inbox',
                    expect: 'No "Filter" or "Hide posts" buttons appear in the header',
                },
            ],
        },
        {
            group: 'Utilities / localStorage',
            items: [
                {
                    feature: 'Hidden posts expire after 72h',
                    url: 'Any listing page',
                    expect: 'Entries older than 72h are removed from hiddenPosts on next page load',
                    cmd: 'window._reddit.cleanLocalStorage()',
                },
                {
                    feature: 'Inspect all posts on current page',
                    cmd: 'window._reddit.Post.getAll()',
                },
                {
                    feature: 'Inspect hidden posts list',
                    cmd: 'window._reddit.Post.getHiddenList()',
                },
                {
                    feature: 'Clear all hidden posts',
                    cmd: 'localStorage.removeItem("hiddenPosts")',
                },
            ],
        },
    ];

    window._reddit = {
        config: CONFIG,
        Post,
        redirectToOldReddit,
        setupCommentsPage,
        setupRedditPage,
        applyPostFilters,
        cleanLocalStorage,
        changeNavigationButtons,
        clickShowImages,

        // Prints the full feature checklist grouped by page context.
        help() {
            console.group('[reddit] Feature checklist — manual testing guide');
            for (const { group, items } of FEATURES) {
                console.group(`📋 ${group}`);
                for (const item of items) {
                    const lines = [`  • ${item.feature}`];
                    if (item.url) lines.push(`      URL:    ${item.url}`);
                    if (item.expect) lines.push(`      Expect: ${item.expect}`);
                    if (item.note) lines.push(`      Note:   ${item.note}`);
                    if (item.cmd) lines.push(`      Debug:  ${item.cmd}`);
                    console.log(lines.join('\n'));
                }
                console.groupEnd();
            }
            console.groupEnd();
        },
    };

    log.info('Debug mode active — run window._reddit.help() to see the full feature checklist.');
}