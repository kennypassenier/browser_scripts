'use strict';

if (window === window.top) { // Don't run in iframes
  console.log(`This is still working`);

  // --- CSS (inject once) ---
  injectStyles(`yt-custom-styles`, STYLES);

  // --- Helpers ---

  // Resolves with the element, or with null once giveUpAfter has passed — an
  // element that never appears used to keep this polling for the whole session.
  function waitForElement(selector, timeOut = 100, giveUpAfter = 30000) {
    const startedAt = Date.now();
    return new Promise(resolve => {
      const checkElement = () => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
        } else if (Date.now() - startedAt > giveUpAfter) {
          console.log(`[youtube] gave up waiting for ${selector}`);
          resolve(null);
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
    const voiceInput = await waitForElement(`#voice-search-button`);
    if (!voiceInput) return;
    const pipButton = document.createElement(`button`);
    pipButton.id = `pipButton`;
    pipButton.textContent = `PiP`;
    pipButton.addEventListener(`click`, togglePictureInPicture);
    voiceInput.after(pipButton);
  }

  function togglePictureInPicture() {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled) {
      const video = document.querySelector(`video`);
      if (video) video.requestPictureInPicture();
    }
  }

  // DOESN'T WORK YET
  function pipOnTimer() {
    const title = document.title.toLowerCase();
    if (title.includes(`timer`)) {
      setTimeout(() => {
        const pipButton = document.querySelector(`#pipButton`);
        if (pipButton) pipButton.click();
      }, 1000);
    }
  }

  // --- Timer search protocol ---

  function timerProtocol() {
    const queryString = window.location.search.split(`?search_query=`)[1];
    if (!queryString) return;

    const inputs = queryString.split(`+`);
    if (inputs.length <= 1) return;
    if (inputs[0] !== `timer`) return;

    const intervalId = setInterval(() => {
      const firstResult = document.querySelector(`ytd-video-renderer`);
      if (!firstResult) return;
      // A renderer without a link is still loading; wait for the next tick.
      const link = firstResult.querySelector(`a`)?.href;
      if (!link) return;
      clearInterval(intervalId);
      window.location.replace(link);
    }, 1000);
  }

  // --- Cracking The Cryptic protocol ---

  async function clickTimestampLink(chapterNameString) {
    const chapterElements = document.querySelectorAll(
      `ytd-macro-markers-list-item-renderer.ytd-horizontal-card-list-renderer`,
    );
    for (const chapterElement of chapterElements) {
      const rulesElement = chapterElement.querySelector(`[title="${chapterNameString}"]`);
      if (rulesElement) {
        rulesElement.click();
        return;
      }
    }
  }

  async function getChannelName(attemptsLeft = 40) {
    const selector = `#container > #text-container > #text`;
    const element = await waitForElement(selector);
    if (!element || attemptsLeft <= 0) return ``;
    // The element renders before YouTube fills it in, so an empty one means
    // "not ready yet" rather than "no channel". (This used to test .length on
    // the element itself, which is undefined, so the retry never happened.)
    const channelName = element.textContent.trim();
    if (channelName.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 250));
      return getChannelName(attemptsLeft - 1);
    }
    return channelName;
  }

  async function crackingTheCrypticProtocol() {
    const channelName = await getChannelName();
    if (channelName.trim() === `Cracking The Cryptic`) {
      const expandButton = await waitForElement(`#expand`);
      if (!expandButton) return;
      expandButton.click();
      clickTimestampLink(`Rules`);
    }
  }

  // --- Main ---

  async function main() {
    timerProtocol();
    await createPiPButton();
    setTimeout(pipOnTimer, 1000);
    setTimeout(async () => {
      await crackingTheCrypticProtocol();
    }, 1000);
  }

  main();
}
