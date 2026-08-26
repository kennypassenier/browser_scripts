'use strict';
console.log(window.location);

// Returns true when it navigated away, so the caller can stop working on a page
// that is about to be replaced.
function removeMobileLink() {
  let { host } = window.location;

  if (!host.startsWith(`m.`)) return false;

  host = host.substr(2);
  // Keep the query and the hash — dropping them used to lose the page you were on.
  const { protocol, pathname, search, hash } = window.location;
  window.location = `${protocol}//${host}${pathname}${search}${hash}`;
  return true;
}

function getPageNumberInfo() {
  let [currentPage, maxPages] = document.querySelector(`[role=presentation] > span`).nextSibling.textContent.split(` of `);
  currentPage = parseInt(currentPage);
  maxPages = parseInt(maxPages);
  console.log(`Current page: ${currentPage}/${maxPages}`);
  return [currentPage, maxPages];
}

// Resolves with the element, or with null after giveUpAfter — without the
// timeout the interval kept polling for the rest of the page's life.
async function waitForAndGetElement(selector, giveUpAfter = 15000) {
  const startedAt = Date.now();
  return new Promise(resolve => {
    const interval = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(interval);
        resolve(element);
        return;
      }
      if (Date.now() - startedAt > giveUpAfter) {
        clearInterval(interval);
        console.log(`Gave up waiting for ${selector}`);
        resolve(null);
      }
    }, 250);
  });
}

function isFromType(identifier) {
  return window.location.pathname.includes(identifier);
}

async function clickSeeMore() {
  // Clicks the element that loads all the
  // titles for this person
  let element = await waitForAndGetElement(`.ipc-see-more__text`);
  if (element) element.click();
}

function main() {
  // IMDB has multiple types of pages, such as
  // name for people
  // title for series and movies
  // mediaviewer for both of the above
  if (removeMobileLink()) return;
  if (isFromType(`mediaviewer`)) {
    console.log(`Media viewer`);
    // findPerson("Carrie-Anne Moss"); // Find a specific person by name in the photo carrousel
  }
  if (isFromType(`name`)) {
    console.log(`IMDB Person`);
    clickSeeMore();
  }
}


main();
