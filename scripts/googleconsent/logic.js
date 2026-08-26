'use strict';

// Skips the consent.google.com interstitial that appears in incognito windows
// when opening a Google app (Maps, Translate, News, Search, …).
//
// Primary route — no clicking at all. The interstitial URL carries the page you
// were actually going to as its `continue` parameter:
//
//   https://consent.google.com/m?continue=https://maps.google.com/maps&gl=BE&…
//
// Google's own bypass flag is `ucbcb=1`: requesting the destination with it set
// skips the interstitial (verified — maps.google.com/maps redirects straight to
// the consent page, maps.google.com/maps?ucbcb=1 goes to the map). So we simply
// re-request the destination with that flag instead of answering the dialog.
// Nothing is consented to and no cookie is written.
//
// Fallback — only if there is no usable `continue` (or the bypass bounced us
// back here): answer the dialog in the DOM. The old version of this script did
// only that, matched Dutch/English button text and was therefore both language
// dependent and racy against Google's late-rendering UI.

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIG = {
  debug: false,                 // Set true for verbose logging

  bypassParam: `ucbcb`,         // Google's skip-the-interstitial flag
  bypassValue: `1`,

  // Only follow `continue` to Google's own properties — the parameter is
  // attacker-controllable in a crafted link, and this is an open redirect.
  allowedHosts: /(?:^|\.)(?:google\.[a-z]{2,3}(?:\.[a-z]{2})?|youtube\.com|blogger\.com)$/i,

  // Which button the DOM fallback presses. `reject` keeps the dialog from
  // storing ad-consent; switch to `accept` if a Google app ever misbehaves.
  fallbackChoice: `reject`,

  fallbackTimeoutMs: 10000,     // Stop hunting for buttons after this long
  fallbackIntervalMs: 300,
};

// Button labels per choice, normalised to lowercase. Covers the languages the
// Belgian consent page serves (hl=nl / en / fr / de).
const LABELS = {
  reject: [
    `alles afwijzen`, `alle afwijzen`, `afwijzen`, `alles weigeren`, `weigeren`,
    `reject all`, `reject`, `decline all`, `decline`, `no, thanks`,
    `tout refuser`, `refuser tout`, `refuser`,
    `alle ablehnen`, `ablehnen`,
  ],
  accept: [
    `alles accepteren`, `alle accepteren`, `accepteren`, `ik ga akkoord`, `akkoord`,
    `accept all`, `accept`, `i agree`, `agree`,
    `tout accepter`, `accepter tout`, `accepter`, `j'accepte`,
    `alle akzeptieren`, `akzeptieren`, `ich stimme zu`,
  ],
};

// ─── Logger ───────────────────────────────────────────────────────────────────

const log = {
  info: (...args) => CONFIG.debug && console.log(`[googleconsent]`, ...args),
  warn: (...args) => console.warn(`[googleconsent]`, ...args),
};

// ─── Bypass route ─────────────────────────────────────────────────────────────

const ATTEMPT_KEY = `googleconsent:bypassed`;

/** sessionStorage is per tab and per origin, which is exactly the loop scope. */
function readAttempt() {
  try {
    return window.sessionStorage.getItem(ATTEMPT_KEY);
  } catch {
    return null;                // Storage blocked — fall back to clicking.
  }
}

function writeAttempt(value) {
  try {
    window.sessionStorage.setItem(ATTEMPT_KEY, value);
  } catch {
    // Nothing to do; the click fallback still works.
  }
}

/**
 * The page the interstitial is holding, with the bypass flag set.
 *
 * @returns {string|null} Absolute URL, or null when there is nothing safe to
 *                        follow (missing, non-https, or a non-Google host).
 */
function bypassTarget() {
  const raw = new URL(window.location.href).searchParams.get(`continue`);
  if (!raw) return null;

  let target;
  try {
    target = new URL(raw, window.location.href);
  } catch {
    return null;
  }

  if (target.protocol !== `https:`) return null;
  if (!CONFIG.allowedHosts.test(target.hostname)) {
    log.warn(`continue points outside Google, ignoring:`, target.hostname);
    return null;
  }
  if (target.hostname === window.location.hostname) return null;   // Would loop

  target.searchParams.set(CONFIG.bypassParam, CONFIG.bypassValue);
  return target.href;
}

// ─── DOM fallback ─────────────────────────────────────────────────────────────

const CLICKABLE = `button, [role="button"], input[type="submit"], input[type="button"], a[href]`;

const normalise = text => String(text || ``).replace(/\s+/g, ` `).trim().toLowerCase();

/** Every string a user would read as this element's label. */
function labelsOf(element) {
  return [
    element.textContent,
    element.getAttribute(`aria-label`),
    element.getAttribute(`value`),
    element.getAttribute(`title`),
  ].map(normalise).filter(Boolean);
}

// Deliberately no layout-based visibility test: the consent dialog is a fixed
// overlay, and fixed elements report offsetParent === null even when on screen.
const isUnclickable = element => element.disabled === true
  || element.hidden === true
  || element.getAttribute(`aria-hidden`) === `true`;

function findChoiceButton(wanted) {
  const labels = LABELS[wanted] || [];
  for (const element of document.querySelectorAll(CLICKABLE)) {
    if (isUnclickable(element)) continue;
    const found = labelsOf(element);
    if (labels.some(label => found.includes(label))) return element;
  }
  return null;
}

function clickFallback() {
  const started = Date.now();
  // Preferred choice first; if that button never shows up, take the other one —
  // any answer dismisses the interstitial, being stuck on it is the worst case.
  const order = CONFIG.fallbackChoice === `accept` ? [`accept`, `reject`] : [`reject`, `accept`];

  const intervalId = setInterval(() => {
    const elapsed = Date.now() - started;
    for (const choice of order) {
      const button = findChoiceButton(choice);
      if (!button) continue;
      // Only settle for the second choice once the page has had time to render.
      if (choice !== order[0] && elapsed < CONFIG.fallbackTimeoutMs / 2) continue;
      log.info(`clicking "${choice}" button:`, button);
      clearInterval(intervalId);
      button.click();
      return;
    }
    if (elapsed > CONFIG.fallbackTimeoutMs) {
      clearInterval(intervalId);
      log.warn(`no consent button found within ${CONFIG.fallbackTimeoutMs}ms`);
    }
  }, CONFIG.fallbackIntervalMs);
}

// ─── Entry point ──────────────────────────────────────────────────────────────

function main() {
  // Embedded consent frames have nowhere to navigate to: answer them in place.
  if (window.top !== window.self) {
    clickFallback();
    return;
  }

  const target = bypassTarget();
  if (!target) {
    log.info(`no usable continue parameter, answering the dialog instead`);
    clickFallback();
    return;
  }

  // Back on the interstitial after the bypass already ran for this destination:
  // the flag did not take, so stop redirecting and answer the dialog.
  if (readAttempt() === target) {
    log.warn(`bypass did not stick for ${target}, answering the dialog instead`);
    clickFallback();
    return;
  }

  writeAttempt(target);
  log.info(`skipping consent, going to`, target);
  window.location.replace(target);
}

main();
