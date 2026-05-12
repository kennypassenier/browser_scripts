// Referrer link van Mobile Vikings: geeft gratis Viking Points.
// Uses a 7-day localStorage TTL as loop guard. Amazon strips the tag param from the URL
// after processing it, so we can't use URL params to detect "already applied".
(() => {
    const KEY = 'amazon_tag_applied';
    const TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

    const last = localStorage.getItem(KEY);
    if (last && Date.now() - parseInt(last) < TTL) return;

    localStorage.setItem(KEY, Date.now().toString());
    const sep = window.location.search ? '&' : '?';
    window.location.replace(window.location.href + sep + 'tag=mobilevikin07-21&ascsubtag=127214');
})();