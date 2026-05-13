'use strict';
function injectStyles() {
  if (document.getElementById(`google-custom-styles`)) return;
  const style = document.createElement(`style`);
  style.id = `google-custom-styles`;
  style.textContent = `
        body,
        a,
        a:visited,
        cite,
        span,
        .main,
        #top_nav *,
        #appbar,
        #searchform *,
        #footcnt *,
        #wp-tabs-container,
        div[role=heading] {
            background-color: #374151;
            color: #F3F4F6;
            border: none;
        }
        #rso em,
        #result-stats {
            color: white;
        }
    `;
  document.head.appendChild(style);
}

function main() {
  injectStyles();
  const commands = [
    {
      name: `!bass`,
      url: `https://www.youtube.com/results?search_query=rocksmith+bass+`,
    },
    {
      name: `!cover`,
      url: `https://www.youtube.com/results?search_query=bass+cover+`,
    },
    {
      name: `minutes`,
      execute: youtubeTimer,
    },
    {
      name: `r/`,
      url: `https://old.reddit.com/`,
    },
    {
      name: `imdb`,
      execute: gotoImdbUrl,
    },
  ];


  // Get the query info
  let queryString = new URLSearchParams(window.location.search).get(`q`);
  console.log(`Query string: `);
  console.log(queryString);
  for (const command of commands) {
    // Commands that start with a !
    if (queryString.startsWith(`${command.name}`)) {
      let queryEncoded;
      // Check if it is a command that starts with a "!"
      if (queryString.startsWith(`!`)) {
        // We do + 1 because we want the length of the command, plus the first space after the word
        queryEncoded = encodeURI(queryString.substring(command.name.length + 1, queryString.length));
      } else {
        queryEncoded = encodeURI(queryString);
      }
      console.log(queryEncoded);
      window.location.replace(`${command.url}${queryEncoded}`);
      break;
    } else if (queryString.includes(command.name)) {
      // Check if the command is anywhere else in the query string
      command.execute(queryString);
    }
  }
  setTimeout(() => {
    IMDBLinksToTheTop();
  }, 1000);
}



function gotoImdbUrl() {
  let target = document.querySelector(`a[href^='https://www.imdb']`);
  if (target) {
    window.location.replace(target.href);
  } else {
    console.log(`Couldn't find an imdb link`);
  }
}

function youtubeTimer(queryString) {
  const youtubeSearchPage = `https://www.youtube.com/results?search_query=timer+${queryString.split(` `)[1]}+minutes`;
  // console.log(queryString);
  // console.log(youtubeSearchPage);
  window.location.replace(youtubeSearchPage);
}

function IMDBLinksToTheTop() {
  const parent = document.querySelector(`#kp-wp-tab-overview`);
  // console.log("Parent: ");
  // console.log(parent);

  // Get all the direct children of the parent
  const children = parent.querySelectorAll(`:scope > div`);
  // console.log("There are " + children.length + " children");

  // Create a variable to store the IMDb link element
  let imdbLinkElement = null;

  // Iterate over the children and find the IMDb link
  children.forEach(child => {
    // console.log(child);
    // Check if this child contains an IMDb link (you may need to adjust this selector)
    const imdbLink = child.querySelector(`a[href*='imdb.com']`);
    // console.log("IMDB Link: ");
    // console.log(imdbLink);

    if (imdbLink) {
      // IMDb link found, store the element and remove it from the current position
      imdbLinkElement = child;
      child.remove();
    }
  });

  // Insert the IMDb link element at the top of the parent's children
  if (imdbLinkElement) {
    parent.insertBefore(imdbLinkElement, parent.firstChild);
    return;
  }
}



main();
