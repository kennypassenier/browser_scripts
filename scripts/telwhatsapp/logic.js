'use strict';

// Universal tel: → WhatsApp rewriter.
//
// Runs on every page (frames included) and turns every telephone link into a
// WhatsApp chat link, so a click opens the WhatsApp desktop app instead of a
// dialer that does not exist on this machine.
//
// Numbers are normalised to E.164 (digits only, no +) before the link is built:
//   +32 471 23 45 67   → 32471234567
//   0032/471.23.45.67  → 32471234567
//   0471 23 45 67      → 32471234567   national trunk 0 → default country code
//   471 23 45 67       → 32471234567   no trunk, short enough to be national
//   +32 (0)471 234 567 → 32471234567   a parenthesised trunk zero is dropped
//   02 123 45 67       → 3221234567    landline, 8-digit national number
//   +1 800 555 0199    → 18005550199   foreign numbers keep their own code
//   tel:112            → left alone     too short to be a real subscriber number
//
// Out of scope: phone numbers that exist only as plain text (no tel: link), and
// numbers dialled by site JavaScript via location.href = `tel:…`.

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIG = {
  debug: false,                 // Set true for verbose logging of every rewrite

  // Country code used when a number carries none of its own.
  defaultCountryCode: `32`,     // Belgium

  // Length of a national (subscriber) number for the default country code.
  // Belgium: 8 digits for landlines (2 123 45 67), 9 for mobile (471 23 45 67).
  defaultNationalDigits: [8, 9],

  // A bare number (no +, no 00, no leading 0) of at least this many digits
  // cannot be a national number here, so it must already carry a country code.
  bareInternationalDigits: 10,

  // api.whatsapp.com is used rather than wa.me so the existing `whatsapp`
  // userscript, which auto-closes the hand-off tab, keeps matching.
  waBase: `https://api.whatsapp.com/send?phone=`,

  openInNewTab: true,           // The hand-off tab closes itself again
  shadowDom: true,              // Also walk into open shadow roots
  scanDebounceMs: 200,
};

// ─── Logger ───────────────────────────────────────────────────────────────────

const log = {
  info: (...args) => CONFIG.debug && console.log(`[tel-wa]`, ...args),
  warn: (...args) => CONFIG.debug && console.warn(`[tel-wa]`, ...args),
};

// ─── Number normalisation ─────────────────────────────────────────────────────

const TEL_SCHEME = /^\s*(?:tel|callto)\s*:(?:\/\/)?/i;

// Everything after these markers is an extension, not part of the number.
const EXTENSION = /,|;|\bext\.?\b|\btoestel\b|\bposte\b|\bx\b/i;

/**
 * Turn any telephone link target into an E.164 number without the leading `+`,
 * which is the form WhatsApp expects in its ?phone= parameter.
 *
 * @param   {string}      href - Full href (`tel:…`) or a bare number string
 * @returns {string|null}        Digits only, or null when it is not a number
 *                               WhatsApp could ever reach (short codes, 112, …)
 */
function toE164(href) {
  let raw = String(href || ``);

  try {
    raw = decodeURIComponent(raw);
  } catch {
    // Malformed percent escapes — keep the string as it came in.
  }

  raw = raw.replace(TEL_SCHEME, ``).trim();

  // RFC 3966 parameters: tel:0471234567;ext=12;phone-context=+32
  // phone-context carries the country code for numbers written locally.
  let context = ``;
  const paramStart = raw.indexOf(`;`);
  if (paramStart !== -1) {
    const params = raw.slice(paramStart + 1);
    raw = raw.slice(0, paramStart);
    const contextMatch = /phone-context=([^;]+)/i.exec(params);
    if (contextMatch && contextMatch[1].trim().startsWith(`+`)) {
      context = contextMatch[1].trim();
    }
  }

  raw = raw.split(EXTENSION)[0];

  // `+32 (0)471 …` — the parenthesised trunk zero is never part of the number.
  raw = raw.replace(/\(\s*0\s*\)/g, ``);

  if (context && !raw.trim().startsWith(`+`)) raw = context + raw;

  const isInternational = /^\s*\+/.test(raw);
  const digits = raw.replace(/\D/g, ``);
  if (!digits) return null;

  const cc = CONFIG.defaultCountryCode;
  let e164;

  if (isInternational) {
    e164 = digits;                                  // +32 471 …, +1 800 …
  } else if (digits.startsWith(`00`)) {
    e164 = digits.slice(2);                         // 0032 471 …
  } else if (digits.startsWith(`0`)) {
    e164 = cc + digits.slice(1);                    // 0471 …, 02 …
  } else if (digits.length >= CONFIG.bareInternationalDigits) {
    e164 = digits;                                  // 32471234567 written bare
  } else {
    e164 = cc + digits;                             // 471 23 45 67
  }

  // `+32 0471 …` — some sites keep the trunk zero after the country code.
  if (e164.startsWith(`${cc}0`)) e164 = cc + e164.slice(cc.length + 1);

  // E.164: at most 15 digits, and a country code never starts with 0.
  if (!/^[1-9]\d{7,14}$/.test(e164)) return null;

  // For our own country the national length is known, so a number that does not
  // fit it is mangled (or a short code) and must not become a WhatsApp link.
  if (e164.startsWith(cc)) {
    const national = e164.length - cc.length;
    if (!CONFIG.defaultNationalDigits.includes(national)) return null;
  }

  return e164;
}

// ─── Link rewriting ───────────────────────────────────────────────────────────

const TEL_SELECTOR = `a[href^="tel:" i], a[href^="callto:" i]`;
let selectorSupported = true;

/** All telephone anchors inside one root, with a fallback for old selector engines. */
function telAnchors(root) {
  if (selectorSupported) {
    try {
      return root.querySelectorAll(TEL_SELECTOR);
    } catch {
      selectorSupported = false;
    }
  }
  return [...root.querySelectorAll(`a[href]`)]
    .filter(anchor => TEL_SCHEME.test(anchor.getAttribute(`href`) || ``));
}

/** Add rel tokens without dropping the ones the site already set. */
function addRel(anchor, ...tokens) {
  const rel = (anchor.getAttribute(`rel`) || ``).split(/\s+/).filter(Boolean);
  for (const token of tokens) if (!rel.includes(token)) rel.push(token);
  anchor.setAttribute(`rel`, rel.join(` `));
}

/**
 * Rewrite one anchor in place. Safe to call repeatedly: an anchor whose href is
 * no longer a tel: link is simply skipped.
 *
 * @returns {boolean} true when this call changed the anchor
 */
function convertAnchor(anchor) {
  const href = anchor.getAttribute(`href`);
  if (!href || !TEL_SCHEME.test(href)) return false;

  const e164 = toE164(href);
  if (!e164) {
    // Emergency and service numbers land here — leaving them as tel: is correct.
    anchor.dataset.telWaSkipped = href;
    log.warn(`not a WhatsApp-reachable number, left alone:`, href);
    return false;
  }

  anchor.dataset.telWaOriginal = href;
  anchor.dataset.telWa = e164;
  anchor.setAttribute(`href`, CONFIG.waBase + e164);
  if (CONFIG.openInNewTab) {
    anchor.setAttribute(`target`, `_blank`);
    addRel(anchor, `noopener`, `noreferrer`);
  }
  if (!anchor.getAttribute(`title`)) anchor.setAttribute(`title`, `WhatsApp: +${e164}`);

  log.info(`${href} → +${e164}`);
  return true;
}

// ─── Scanning ─────────────────────────────────────────────────────────────────

const observedRoots = new WeakSet();
let observer = null;

/** Visit a root and every open shadow root nested inside it. */
function eachRoot(root, visit) {
  visit(root);
  if (!CONFIG.shadowDom) return;
  for (const element of root.querySelectorAll(`*`)) {
    if (element.shadowRoot) eachRoot(element.shadowRoot, visit);
  }
}

function scan() {
  let converted = 0;
  eachRoot(document, root => {
    if (observer && !observedRoots.has(root)) {
      observedRoots.add(root);
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [`href`],
      });
    }
    for (const anchor of telAnchors(root)) {
      if (convertAnchor(anchor)) converted++;
    }
  });
  if (converted) log.info(`converted ${converted} link(s)`);
}

let scanPending = false;

function scheduleScan() {
  if (scanPending) return;
  scanPending = true;
  const run = () => {
    scanPending = false;
    scan();
  };
  if (typeof window.requestIdleCallback === `function`) {
    window.requestIdleCallback(run, { timeout: CONFIG.scanDebounceMs * 5 });
  } else {
    setTimeout(run, CONFIG.scanDebounceMs);
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

function main() {
  observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      // Our own href rewrites also fire here; only tel: values are worth a scan.
      if (mutation.type === `attributes`) {
        const href = mutation.target.getAttribute?.(`href`) || ``;
        if (!TEL_SCHEME.test(href)) continue;
      }
      scheduleScan();
      return;
    }
  });

  scan();

  // Links inserted between two scans still work: the anchor is rewritten during
  // the capture phase, before the browser resolves the click's default action.
  const rewriteFromEvent = event => {
    const path = event.composedPath ? event.composedPath() : [event.target];
    for (const node of path) {
      if (node?.tagName === `A` && TEL_SCHEME.test(node.getAttribute?.(`href`) || ``)) {
        convertAnchor(node);
        return;
      }
    }
  };
  for (const type of [`click`, `auxclick`, `contextmenu`]) {
    document.addEventListener(type, rewriteFromEvent, true);
  }
}

// Exposed for debugging: _telWa.toE164(`0471/23.45.67`), _telWa.scan().
window._telWa = { CONFIG, toE164, convertAnchor, scan };

main();
