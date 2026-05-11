'use strict';

if (window !== window.top) return; // Don't run in iframes

console.log("This is still working");

// --- CSS (inject once) ---
if (!document.getElementById('yt-custom-styles')) {
    const style = document.createElement("style");
    style.id = 'yt-custom-styles';
    style.textContent = `
        ytd-reel-shelf-renderer {
            display: none;
        }
    `;
    document.head.appendChild(style);
}

// --- Helpers ---

function waitForElement(selector, timeOut = 100) {
    return new Promise((resolve) => {
        const checkElement = () => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
            } else {
                timeOut *= 1.2;
                setTimeout(() => checkElement(), timeOut);
            }
        };
        checkElement();
    });
}

// --- PiP ---

async function createPiPButton() {
    const voiceInput = await waitForElement("#voice-search-button");
    const pipButton = document.createElement("button");
    pipButton.id = "pipButton";
    pipButton.textContent = "PiP";
    pipButton.addEventListener("click", togglePictureInPicture);
    voiceInput.after(pipButton);
}

function togglePictureInPicture() {
    if (document.pictureInPictureElement) {
        document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled) {
        const video = document.querySelector("video");
        if (video) video.requestPictureInPicture();
    }
}

// DOESN'T WORK YET
function pipOnTimer() {
    const title = document.title.toLowerCase();
    if (title.includes("timer")) {
        setTimeout(function () {
            const pipButton = document.querySelector("#pipButton");
            if (pipButton) pipButton.click();
        }, 1000);
    }
}

// --- Timer search protocol ---

function timerProtocol() {
    const queryString = window.location.search.split("?search_query=")[1];
    if (!queryString) return;

    const inputs = queryString.split("+");
    if (inputs.length <= 1) return;
    if (inputs[0] !== "timer") return;

    setInterval(function () {
        const firstResult = document.querySelector("ytd-video-renderer");
        if (!firstResult) return;
        const link = firstResult.querySelector("a").href;
        window.location.replace(link);
    }, 1000);
}

// --- Cracking The Cryptic protocol ---

async function clickTimestampLink(chapterNameString) {
    const chapterElements = document.querySelectorAll(
        "ytd-macro-markers-list-item-renderer.ytd-horizontal-card-list-renderer"
    );
    for (const chapterElement of chapterElements) {
        const rulesElement = chapterElement.querySelector(`[title="${chapterNameString}"]`);
        if (rulesElement) {
            rulesElement.click();
            return;
        }
    }
}

async function getChannelName() {
    const selector = "#container > #text-container > #text";
    const channelName = await waitForElement(selector);
    if (channelName.length === 0) return getChannelName();
    return channelName.textContent;
}

async function crackingTheCrypticProtocol() {
    const channelName = await getChannelName();
    if (channelName.trim() === "Cracking The Cryptic") {
        const expandButton = await waitForElement("#expand");
        expandButton.click();
        clickTimestampLink("Rules");
    }
}

// --- Main ---

async function main() {
    timerProtocol();
    await createPiPButton();
    setTimeout(pipOnTimer, 1000);
    setTimeout(async function () {
        await crackingTheCrypticProtocol();
    }, 1000);
}

main();
