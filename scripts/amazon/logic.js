const referralTag = "mobilevikin07-21";

const url = new URL(window.location.href);

// Alleen uitvoeren op amazon.com.be
if (
    url.hostname === "www.amazon.com.be" ||
    url.hostname === "amazon.com.be"
) {
    // Voeg de tag toe of overschrijf bestaande tag
    url.searchParams.set("tag", referralTag);

    // Alleen redirecten als de URL veranderd is
    if (window.location.href !== url.toString()) {
        window.location.replace(url.toString());
    }
}