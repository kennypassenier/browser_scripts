// Referrer link van Mobile Vikings: geeft gratis Viking Points.
// Appends the referrer params to whatever amazon.com.be page is loaded, unless they
// are already present (which would cause an infinite redirect loop).
(() => {
    const REFERRER_PARAMS = "_encoding=UTF8&tag=mobilevikin07-21&ascsubtag=127214";

    const url = new URL(window.location.href);
    if (!url.searchParams.has('tag')) {
        const separator = window.location.search ? '&' : '?';
        window.location.replace(window.location.href + separator + REFERRER_PARAMS);
    }
})();