// Referrer link van Mobile Vikings: geeft gratis Viking Points.
(() => {
    if (!new URL(window.location.href).searchParams.has('tag')) {
        const separator = window.location.search ? '&' : '?';
        window.location.replace(window.location.href + separator + 'tag=mobilevikin07-21&ascsubtag=127214');
    }
})();