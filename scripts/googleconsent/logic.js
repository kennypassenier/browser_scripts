'use strict';
function main() {
  const intervalId = setInterval(() => {
    console.log(`Trying to click consent button`);
    let spans = document.querySelectorAll(`span`);
    spans.forEach(span => {
      if (span.textContent === `Alles accepteren` || span.textContent === `Accept all`) {
        const parent = span.parentElement;
        console.log(`Parent found: `);
        console.log(parent);
        parent.click();
        clearInterval(intervalId); // Stop checking once the parent is clicked
      }
    });
  }, 1000); // Check every second
}

main();
