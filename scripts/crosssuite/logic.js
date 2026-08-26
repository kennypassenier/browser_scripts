'use strict';
// Fills in the appointment form. The page is an Angular app, so it is polled for
// until the form exists instead of guessing a fixed delay, and every field is
// filled defensively: one renamed input should not abort the whole fill.

const FIELDS = [
  [`#ea-forename-inp`, `Kenny`],
  [`#ea-surname-inp`, `Passenier`],
  [`#initials`, `kp`],
  [`#ea-email-inp`, `kennypassenier@gmail.com`],
  [`#ea-birth-day-inp`, `25`],
  [`#ea-birth-month-inp`, `09`],
  [`#ea-birth-year-inp`, `1986`],
  [`#nr`, `22`],
  [`#city`, `Kampenhout`],
  [`#ea-cellphone-inp`, `485472050`],
  [`#comments`, ``],
  [`input[name="addr_psc"]`, `1910`],
  [`input[name="street"]`, `Daallaan`],
];

const MALE_RADIO = `#ea-male-rad`;
const READY_SELECTOR = `#ea-forename-inp`;   // Last field to render is good enough as a signal
const GIVE_UP_AFTER_MS = 30000;
const CHECK_INTERVAL_MS = 500;

function enterData() {
  for (const [selector, value] of FIELDS) {
    const input = document.querySelector(selector);
    if (!input) {
      console.log(`crossuite: field ${selector} not found, skipping`);
      continue;
    }
    enterInput(input, value);
  }

  // Toggle male
  const maleRadio = document.querySelector(MALE_RADIO);
  if (maleRadio) {
    // maleRadio.checked = true;
    maleRadio.click();
  } else {
    console.log(`crossuite: ${MALE_RADIO} not found, gender left untouched`);
  }
}

function enterInput(inputElement, data) {
  // Angular wants to validate, so we need to dispatch the input event manually
  inputElement.value = data;
  inputElement.dispatchEvent(new Event(`input`, {
    bubbles: true,
    cancelable: true,
  }));
}

function waitForForm() {
  const startedAt = Date.now();
  const intervalId = setInterval(() => {
    if (document.querySelector(READY_SELECTOR)) {
      clearInterval(intervalId);
      enterData();
      return;
    }
    if (Date.now() - startedAt > GIVE_UP_AFTER_MS) {
      clearInterval(intervalId);
      console.log(`crossuite: form did not appear within ${GIVE_UP_AFTER_MS / 1000}s`);
    }
  }, CHECK_INTERVAL_MS);
}

waitForForm();
