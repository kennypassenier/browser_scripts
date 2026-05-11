'use strict';
if (location.host !== 'old.reddit.com' || !/\/comments\//.test(location.pathname)) return;

const generateSeperator = () => {
    const seperator = document.createElement("span");
    seperator.textContent = " | ";
    seperator.className = "seperator";
    return seperator;
}
const addCustomMenu = () => {
    // const header = document.querySelector("#header-bottom-right");
    // const removedLink = document.createElement("a");
    // removedLink.id = "reveddit";
    // removedLink.href = `https://reveddit.com${window.location.pathname}`;
    // removedLink.target = "_blank";
    // removedLink.textContent = "Reveddit";
    // header.appendChild(generateSeperator());
    // header.appendChild(removedLink);
    // const removedLink2 = document.createElement("a");
    // removedLink2.id = "unddit";
    // removedLink2.href = `https://unddit.com${window.location.pathname}`;
    // removedLink2.target = "_blank";
    // removedLink2.textContent = "Unddit";
    // header.appendChild(generateSeperator());
    // header.appendChild(removedLink2);
}
const removeParentOfAllNodes = (nodes) => {
    nodes.forEach((node) => {
        let target = node.parentElement;
        target.parentElement.removeChild(target);
    });
}
const detectRickroll = () => {
    const links = document.querySelectorAll("a");
    for (let link of links) {
        if (link.href.includes("dQw4w9WgXcQ")) {
            link.title = link.textContent;
            link.textContent = "--> RICKROLL <--";
        }
    }
}
const main = () => {
    console.log("Start of main (comments)");
    removeParentOfAllNodes(document.querySelectorAll(".embed-comment"));
    removeParentOfAllNodes(document.querySelectorAll(".toggleChildren"));
    detectRickroll();
    addCustomMenu();
    console.log("End of main (comments)");
}

main();
