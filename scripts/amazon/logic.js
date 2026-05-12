// Referrer link van Mobile Vikings: geeft gratis Viking Points.
// Applies affiliate params once per tab session. sessionStorage prevents re-applying
// after Amazon's own internal redirects strip the tag param from the URL.
(() => {
    const REFERRER_PARAMS = "_encoding=UTF8&tag=mobilevikin07-21&ascsubtag=127214";

    if (!sessionStorage.getItem('amazon_referrer_applied')) {
        sessionStorage.setItem('amazon_referrer_applied', '1');
        const url = new URL(window.location.href);
        if (!url.searchParams.has('tag')) {
            const separator = window.location.search ? '&' : '?';
            window.location.replace(window.location.href + separator + REFERRER_PARAMS);
        }
    }
})();