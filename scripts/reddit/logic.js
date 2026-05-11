'use strict';
// Time to live is one day in milliseconds
const localStorageTimeToLive = 1000 * 60 * 60 * 72;
const storage = window.localStorage;
let filterIsActive = true; // Filter is on by default


const subredditFilterList = [
    "meme",
    "circlejerk",
    "okbuddy",
    "mains",
    "anime",
    "crypto",
    "india",
    "snark",
];
const subredditWhiteList = ["r/wholesomememes"];
const titleFilterList = [
    "kanye",
    "pokemon",
    "pokémon",
    "pikachu",
    "bitcoin",
    "cryptocurrency",
    " nft ",
    "fungible",
    "doge",
    "blockchain",
    "official trailer",
    "nft ",
    " nft",
    "predictions tournament",
    "twitter",
    "marjorie taylor greene",
    "shapiro",
    "andrew tate",
    "rainbow bridge",
    // "elon musk",
    // "musk",
    // "elon",
    "mug shot",
    "mugshot",
    "airdrop",
    "layerzero",
    "ted cruz",
    "boebert",
    "kissinger",
    "aaron rodgers",
    "drake",
    "andy dick",
    "doherty",
    "giuliani",
    "fox news",
    "biden",
    "jake paul",
    "logan paul",
    "tina peters",
    "liam payne",
    "pope",
    "ozzy",
    "slams",
    "no kings",
    "no-kings",
];

const sitesFixed = [
    "www.nytimes.com",
];
const authorFilterList = [
    "mekyas23",
    "cooperationapples",
    "noveljazzlike9473"
];
const paywallRemovalService = "https://www.smry.ai/proxy?url=";
const sitesWithPaywall = [
    "www.forbes.com",
    "www.wjtv.com",
    "www.independent.co.uk",
    "www.theguardian.com",
    "www.wusa9.com",
    "www.theatlantic.com",
    "www.washingtonpost.com",
];
const trashSites = [
    "nypost.com",
];
const bannedFlairList = [
    "mourning/loss",
    "rainbow bridge",
    "pet loss",
    "trump news",
];

// Functions
const timeout = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}
const isTitleClean = (title, titleFilterList) => {
    title = title.toLowerCase();
    for (let filterItem of titleFilterList) {
        if (title.includes(filterItem.toLowerCase())) {
            console.log(`Blocked: Title contains '${filterItem}'`);
            return false;
        }
    }
    return true;
};

const addCustomMenu = () => {
    // console.log("Start custom menu");
    const header = document.querySelector("#header-bottom-right"); // We need this to attach the customMenu too
    const filterLink = document.createElement("a");
    filterLink.id = "filterToggle";
    filterLink.href = "#";
    filterLink.textContent = "Filter";
    //console.log(filterLink);
    const hideAllLink = document.createElement("a");
    hideAllLink.id = "hideAllButton";
    hideAllLink.href = "#";
    hideAllLink.textContent = "Hide posts";
    //console.log(hideAllLink);
    header.appendChild(generateSeperator());
    header.appendChild(filterLink);
    header.appendChild(generateSeperator());
    header.appendChild(hideAllLink);
    // console.log("End custom menu");
}
const filterEntries = async () => {
    // Filter entries by title
    let hiddenPosts = await JSON.parse(storage.getItem("hiddenPosts")) || [];
    // console.log("Here are all the hidden posts: ");
    // console.table(hiddenPosts);
    //if(!hiddenPosts){
    //	await storage.setItem("hiddenPosts", JSON.stringify(hiddenPosts));
    //}
    for (let entry of document.querySelectorAll(".thing a.title")) {
        const parent = entry.parentElement.parentElement.parentElement.parentElement;
        const author = parent.dataset?.author?.toLowerCase();

        // console.log(entry);
        // console.log(parent);
        const flair = parent.querySelector(".flairrichtext")?.title !== undefined ? parent.querySelector(".flairrichtext").title : "";
        // console.log(flair);

        // If the url links to a sitesFixed website, add the "fixedSite" class so we know not to follow that link. 
        // If the url links to a website where we use a paywall removal service, ass the "paywall" class and change the link directly to that removal service
        // Select the link in the title element (child) from the parent 
        // We only do this check if the url doesn't begin with "r/" so we know it links to an external site
        if (!parent.dataset.url.startsWith("/r")) {

            const url = new URL(parent.dataset.url);
            const titleLink = parent.querySelector(".title > a");

            if (sitesFixed.includes(url.hostname)) {
                //console.log("Entry points to " + url);
                //console.log("This site is on the list of sites that are fixed");
                titleLink.classList.add("fixedSite");

            }
            if (sitesWithPaywall.includes(url.hostname)) {
                //console.log(parent);
                //console.log("Entry points to " + url);
                //console.log("This site is on the outline list");
                titleLink.classList.add("paywall");
                // Change the link so it points directly to the paywall removal site
                titleLink.href = `${paywallRemovalService}https://${url.host}.${url.pathname}`;
            }
            if (trashSites.includes(url.hostname)) {
                // console.log("Trashy site detected");
                // console.log(url.hostname);
                // console.log(url);
                titleLink.classList.add("trashSite");
            }
        }
        const titleId = parent.dataset.fullname;
        //console.log("title id: " + titleId);
        let postIsMarkedAsHidden = false;
        if (hiddenPosts && titleId) {
            postIsMarkedAsHidden = hiddenPosts.filter((e) => {
                //console.log(e.postId, titleId);
                return e.postId === titleId;

            }).length > 0;
            //console.log("marked as hidden: " + postIsMarkedAsHidden);
            if (postIsMarkedAsHidden) {
                //console.log("Found post to hide: ");
                //console.log(entry);
                //console.log(titleId);
                entry.parentNode.parentNode.parentNode.parentNode.style.display = "none";
            }
            else {
                let titleText = entry.text;
                //console.log("Title text: " + titleText);
                if (titleText !== undefined) {
                    // Conditions where we don't censor the entry: 
                    // Title is clean 
                    // The author isn't in the banned author list 
                    // The flair isn't in the banned flair list
                    if (isTitleClean(titleText, titleFilterList) && authorFilterList.indexOf(author) === -1 && isNotInBannedFlairList(flair)) {
                        // No need to censor
                        //console.log("No need to filter: " + titleText);
                    }
                    else {
                        //console.log("Found a possible censored author: " + author);
                        //console.log("TITLE:");
                        //console.log(titleText);
                        //console.log(entry);
                        // We only check this here because we need to show entries when we turn off the filter
                        if (filterIsActive) {
                            //console.log("Filter is on");
                            entry.parentNode.parentNode.parentNode.parentNode.style.display = "none";
                        }
                        else {
                            //console.log("Filter is off");
                            entry.parentNode.parentNode.parentNode.parentNode.style.display = "block";
                        }
                    }
                }
            }
        }
        else {
            console.warn("no hiddenPosts or no titleId");
            console.warn("hiddenPosts: ");
            console.warn(hiddenPosts);
            console.warn("titleId: ");
            console.warn(titleId);
        }
    }
}
const toggleFilter = () => {
    filterIsActive = !filterIsActive;
}
const generateSeperator = () => {
    let seperator = document.createElement("span");
    seperator.textContent = " | ";
    seperator.className = "seperator";
    //console.log(seperator);
    return seperator;
}
const hideElement = (el) => {
    el.style.display = "none";
}
const applyStrikeThrough = (bool, el) => {
    if (bool) {
        el.classList.toggle("strikeThrough", false);
    }
    else {
        el.classList.toggle("strikeThrough", true);
    }
}
const isNotInBannedFlairList = (flair) => {
    if (flair.length === 0) {
        return true;
    }

    let answer = bannedFlairList.filter((item) => {
        return flair.toLowerCase().includes(item.toLowerCase());
    });

    // console.log(answer);
    // console.log(answer.length);
    return answer.length === 0;


}
const filterSubreddit = (filterList, whiteList) => {
    let isInWhiteList = false;
    for (let entry of document.querySelectorAll(".subreddit")) {
        let currentString = entry.textContent.toLowerCase();
        for (let subFilterIndex in filterList) {
            if (currentString.indexOf(filterList[subFilterIndex]) != -1) {
                //console.log("Found subreddit to potentially block");
                // Hide the post unless it is on the whiteList
                for (let whiteListIndex in whiteList) {
                    if (whiteList[whiteListIndex] === currentString) {
                        isInWhiteList = true;
                    }
                    else {
                        isInWhiteList = false;
                    }
                }
                if (!isInWhiteList) {
                    //console.log(isInWhiteList);
                    //console.log("Blocking item.");
                    //console.log(entry.parentNode.parentNode.parentNode.parentNode);
                    hideElement(entry.parentNode.parentNode.parentNode.parentNode);
                }
            }
        }
    }
}
const cleanLocalStorage = () => {
    let hiddenPosts = JSON.parse(storage.getItem("hiddenPosts"));
    const cutoffDate = Date.now() - localStorageTimeToLive;
    if (hiddenPosts) {
        let newHiddenPosts = hiddenPosts.filter((e) => {
            return e.timestamp >= cutoffDate;
        });
        if (hiddenPosts.length !== newHiddenPosts.length) {
            storage.setItem("hiddenPosts", JSON.stringify(newHiddenPosts));
        }
    }
}
const changeNavigationButtons = () => {
    setTimeout(() => {
        const next = document.querySelector(".next-button");
        const prev = document.querySelector(".prev-button");
        // Clear the parent of any text and items
        let parent = document.querySelector(".nextprev");
        if (!parent) return;
        parent.textContent = "";
        if (prev) {
            // Change link text
            prev.querySelector("a").textContent = "<<<";
            parent.append(prev);
        }
        if (next) {
            next.querySelector("a").textContent = ">>>";
            parent.append(next);
        }
    }, 1000);
}

const testBootstrap = async () => {
    await insertBootstrap(); // Use await to ensure Bootstrap is fully loaded
    console.log("Testing bootstrap");

    // Create an alert using Bootstrap classes
    const alertDiv = document.createElement("div");
    alertDiv.classList.add("alert", "alert-primary");
    alertDiv.role = "alert";
    alertDiv.textContent = "This is the alert div";

    // Append the alert to the body
    document.body.appendChild(alertDiv);
};

const insertBootstrap = () => {
    console.log("Inserting bootstrap");

    return new Promise((resolve) => {
        // Create a link element for the Bootstrap CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css';

        // Create a script element for the Bootstrap JavaScript
        const jsScript = document.createElement('script');
        jsScript.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js'; // Use bootstrap.bundle.min.js for including Popper.js

        // Add an event listener to the script element to resolve the promise when it's fully loaded
        jsScript.onload = resolve;

        // Add the link element to the <head> of the document
        document.head.appendChild(cssLink);

        // Add the script element to the end of the <body> of the document
        document.body.appendChild(jsScript);
    });
};

const main = () => {
    console.log("Start of main (frontpage)");
    // Build custom menu
    addCustomMenu();
    // Elements 
    const filterToggle = document.querySelector("#filterToggle");
    const hideAllButton = document.querySelector("#hideAllButton");
    // Event listeners for custom menu
    filterToggle.addEventListener("click", async (e) => {
        e.preventDefault();
        e.target.classList.toggle("animateLink", true);
        toggleFilter();
        filterEntries();
        applyStrikeThrough(filterIsActive, filterToggle);
        await timeout(2000);
        e.target.classList.toggle("animateLink", false);
    });
    // Poging om bootstrap toe te voegen
    // testBootstrap();
    // Bootstrap wordt wel degelijk toegevoegd, maar intussen ben ik vergeten waarom we bootstrap nodig hebben...





    console.log("Hide all button");
    hideAllButton.addEventListener("click", async (e) => {
        const hideButtons = document.querySelectorAll(".noCtrlF[data-event-action='hide']");
        e.preventDefault();
        e.target.classList.toggle("animateLink", true);
        console.log("Hiding all posts");
        // hideButtons.forEach(e => console.log(e));
        let hiddenPosts = JSON.parse(storage.getItem('hiddenPosts'));
        // New event listener for individual hide butttons
        for (let button of hideButtons) {
            //button.addEventListener("click", (e) => {
            const parent = button.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement;
            // Add this to our "hidden" object located in localStorage
            //console.log(hiddenPosts);
            const postInfo = {
                "postId": parent.dataset.fullname,
                "timestamp": Date.now(),
            }
            //console.log(postInfo);
            if (hiddenPosts) {
                // We need to check the azrray of hiddenPosts first 
                // To see if the item has already been added to the localStorage


                // console.log(postInfo);
                // console.log(hiddenPosts.includes(postInfo));
                // console.table(hiddenPosts);

                if (!hiddenPosts.includes(postInfo))
                    hiddenPosts.push(postInfo);
                // Save to localStorage
                storage.setItem("hiddenPosts", JSON.stringify(hiddenPosts));
                // reload hiddenposts 
                hiddenPosts = JSON.parse(storage.getItem('hiddenPosts'));
            }
            else {
                console.warn("There are no hidden posts stored in our localStorage");
                console.warn("We are going to create it ourselves");
                hiddenPosts = [postInfo];
                // Save to localStorage
                storage.setItem("hiddenPosts", JSON.stringify(hiddenPosts));
                // reload hiddenposts 
                hiddenPosts = JSON.parse(storage.getItem('hiddenPosts'));
            }
            //console.log("Hidden posts: ");
            //console.log(hiddenPosts);

            //})
        }
        filterEntries();
        await timeout(2000);
        e.target.classList.toggle("animateLink", false);

    });
    console.log("Filtering entries");
    filterEntries();
    // Remove subreddits that contain certain keywords
    //console.log("Filtering by subreddit name");
    console.log("Filtering subreddits");
    filterSubreddit(subredditFilterList, subredditWhiteList);
    // When everything is done, we can check if we can let go of some of the values in our localStorage
    console.log("Cleaning up localStorage");
    cleanLocalStorage();
    console.log("Changing navigation buttons at the bottom of the page");
    changeNavigationButtons();
    console.log("End of main (frontpage)");
}

main();