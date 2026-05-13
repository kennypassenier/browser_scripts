'use strict';
console.log(window.location);

function removeMobileLink() {
  let { host } = window.location;

  if (host.startsWith(`m.`)) {
    host = host.substr(2);
    const newPath = `${window.location.protocol}//${host}${window.location.pathname}`;
    window.location = newPath;
  }
}

function getPageNumberInfo() {
  let [currentPage, maxPages] = document.querySelector(`[role=presentation] > span`).nextSibling.textContent.split(` of `);
  currentPage = parseInt(currentPage);
  maxPages = parseInt(maxPages);
  console.log(`Current page: ${currentPage}/${maxPages}`);
  return [currentPage, maxPages];
}

async function waitForAndGetElement(selector) {
  return new Promise(resolve => {
    const interval = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(interval);
        resolve(element);
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
  element.click();
}

function main() {
  // IMDB has multiple types of pages, such as
  // name for people
  // title for series and movies
  // mediaviewer for both of the above
  removeMobileLink();
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
