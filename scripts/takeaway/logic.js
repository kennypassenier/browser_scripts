'use strict';
// Fills in the checkout form. Values are written through a native setter and
// followed by input/change events, otherwise a framework-backed form keeps its
// own (empty) state and throws the values away on submit.

const FIELDS = [
  [`#address`, `Daallaan 22`],
  [`#town`, `Kampenhout`],
  [`#surname`, `Kenny Passenier`],
  [`#email`, `mendax1@gmail.com`],
  [`#phonenumber`, `+32485472050`],
  [`#deliverytime`, `asap`],
];

const GIVE_UP_AFTER_MS = 60000;
const CHECK_INTERVAL_MS = 2000;

let checkInterval; // declared here so fillInForm can reference it before it's assigned
const startedAt = Date.now();

const setValue = (element, value) => {
  const prototype = element instanceof HTMLSelectElement
    ? HTMLSelectElement.prototype
    : element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, `value`)?.set;
  if (setter) {
    setter.call(element, value);
  } else {
    element.value = value;
  }
  for (const type of [`input`, `change`]) {
    element.dispatchEvent(new Event(type, { bubbles: true }));
  }
};

const fillInForm = () => {
  const found = FIELDS.map(([selector, value]) => [document.querySelector(selector), value]);

  if (found.every(([element]) => element)) {
    console.log(`All required elements exist.`);
    for (const [element, value] of found) setValue(element, value);
    clearInterval(checkInterval); // Stop checking after elements are found
    return;
  }

  // The checkout form never showed up — stop polling instead of logging forever.
  if (Date.now() - startedAt > GIVE_UP_AFTER_MS) {
    clearInterval(checkInterval);
    console.log(`Checkout form did not appear within ${GIVE_UP_AFTER_MS / 1000}s, giving up.`);
    return;
  }
  console.log(`Still waiting for all elements to be available...`);
};

// Check every X seconds (e.g., 2000 ms = 2 seconds)
checkInterval = setInterval(fillInForm, CHECK_INTERVAL_MS);
