'use strict';

injectStyles(`sudokupad-custom-styles`, STYLES);

async function removeConflicts() {
  showMouseXY();
  let firstCellCoordinates = getElementCoordinates(`.cell`);
  console.log(`Cell coordinates`);
  console.log(firstCellCoordinates);
  let candidates = document.querySelectorAll(`#cell-candidates > text`);
  for (let candidate of candidates) {
    console.log(candidate);
    console.log(`Parent`);
    console.log(candidate.parentElement);
    let conflicts = candidate.querySelectorAll(`.conflict`);
    for (let conflict of conflicts) {
      console.log(conflict);

      candidate.removeChild(conflict);


      // let originalX = parseFloat(candidate.getAttribute('x'));
      // 	let originalY = parseFloat(candidate.getAttribute('y'));
      // let x = originalX + firstCellCoordinates.x + 20;
      // 	let y = originalY + firstCellCoordinates.y + 20;
      // let conflictValue = conflict.textContent;
      //   simulateClick(x, y);
      // simulateKeypress(conflictValue, candidate);


      // 	console.log(originalX, originalY)
      // console.log(x, y);
      // console.log(conflictValue);
      // await sleep(1000);
      // return;
    }
  }
}


function simulateKeypress(value, element, withCtrl = true, withShift = false, withAlt = false) {
  const valueStr = value.toString(); // Ensure value is a string
  const charCode = valueStr.charCodeAt(0);
  const keyCode = charCode >= 48 && charCode <= 57 ? charCode : 0; // Key codes for '0' to '9' are 48 to 57

  // Create and dispatch keydown event
  let keydownEvent = new KeyboardEvent(`keydown`, {
    key: valueStr,
    code: `Digit${valueStr}`, // Code for numeric keys
    keyCode,
    which: keyCode,
    bubbles: true,
    cancelable: true,
    ctrlKey: withCtrl,
    shiftKey: withShift,
    altKey: withAlt,
    metaKey: false, // Meta key (Cmd/Win) is not used here, set to false
  });
  element.dispatchEvent(keydownEvent);

  // Create and dispatch keyup event
  let keyupEvent = new KeyboardEvent(`keyup`, {
    key: valueStr,
    code: `Digit${valueStr}`, // Code for numeric keys
    keyCode,
    which: keyCode,
    bubbles: true,
    cancelable: true,
    ctrlKey: withCtrl,
    shiftKey: withShift,
    altKey: withAlt,
    metaKey: false, // Meta key (Cmd/Win) is not used here, set to false
  });
  element.dispatchEvent(keyupEvent);
}


function simulateClick(x, y) {
  const element = document.elementFromPoint(x, y);
  if (element) {
    // Create and dispatch mousedown event
    const mousedownEvent = new MouseEvent(`mousedown`, {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
    });
    element.dispatchEvent(mousedownEvent);

    // Create and dispatch mouseup event
    const mouseupEvent = new MouseEvent(`mouseup`, {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
    });
    element.dispatchEvent(mouseupEvent);

    // Create and dispatch click event
    const clickEvent = new MouseEvent(`click`, {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
    });
    element.dispatchEvent(clickEvent);
  } else {
    console.log(`No element found at the specified coordinates.`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function showMouseXY() {
  document.addEventListener(`mousedown`, event => {
    console.log(`Mouse down at coordinates: X=${event.clientX}, Y=${event.clientY}`);
  });
}
function getElementCoordinates(selector) {
  const element = document.querySelector(selector);
  if (element) {
    const rect = element.getBoundingClientRect();
    // Coordinates relative to the viewport
    const x = rect.left + window.scrollX;
    const y = rect.top + window.scrollY;

    console.log(`Element coordinates relative to the viewport: X=${rect.left}, Y=${rect.top}`);
    console.log(`Element coordinates relative to the document: X=${x}, Y=${y}`);

    return { x, y };
  }
  console.log(`Element not found`);
  return null;
}

// setInterval(removeConflicts, 1000);
