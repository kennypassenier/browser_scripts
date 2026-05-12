// Referrer link van Mobile Vikings: geeft gratis Viking Points.
// Uses localStorage with a 5-minute TTL as the loop guard — sessionStorage gets wiped
// by Amazon's cross-domain affiliate redirects, but localStorage survives them.
(() => {
    const REFERRER_PARAMS = "tag=mobilevikin07-21&ascsubtag=127214";
    const TTL = 5 * 60 * 1000; // 5 minutes

    const url = new URL(window.location.href);
    if (url.searchParams.has('tag')) return;

    const lastApplied = localStorage.getItem('amazon_referrer_applied');
    if (lastApplied && Date.now() - parseInt(lastApplied) < TTL) return;

    localStorage.setItem('amazon_referrer_applied', Date.now().toString());
    const separator = window.location.search ? '&' : '?';
    window.location.replace(window.location.href + separator + REFERRER_PARAMS);
})();