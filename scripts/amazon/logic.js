(async () => {
    const targetURL = "https://www.amazon.com.be/?&_encoding=UTF8&tag=mobilevikin07-21&ascsubtag=127214";

    // Check if the current URL matches the bol.com homepage
    if (window.location.href === "https://www.amazon.com.be/") {
        // Redirect to the target URL
        window.location.href = targetURL;
    }
})();
// Free mobile viking points with this referrer link