// Referrer link van Mobile Vikings: geeft 2% terug in Viking Points.
// Appends the referrer params to whatever bol.com page is loaded, unless they are
// already present (which would cause an infinite redirect loop).
'use strict';
(() => {
  const REFERRER_PARAMS = `Referrer=ADVNLPPcef4ec00d7e0c6fd005677cfdf680037264&utm_source=37264&utm_medium=Affiliates&utm_campaign=CPS&utm_content=txl`;

  const url = new URL(window.location.href);
  if (!url.searchParams.has(`Referrer`) && !sessionStorage.getItem(`bol_referrer_applied`)) {
    sessionStorage.setItem(`bol_referrer_applied`, `1`);
    // Built through URLSearchParams so the parameters land before a #fragment
    // instead of inside it, which produced a broken URL on any anchored page.
    for (const pair of REFERRER_PARAMS.split(`&`)) {
      const [key, value] = pair.split(`=`);
      url.searchParams.set(key, value);
    }
    window.location.replace(url.toString());
  }
})();
