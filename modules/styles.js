'use strict';

/**
 * Injects a <style> tag into document.head.
 * Safe to call multiple times — the id guard prevents double-injection.
 *
 * @param {string} id  - A unique id for the style element (e.g. 'reddit-custom-styles')
 * @param {string} css - The CSS string to inject
 */
const injectStyles = (id, css) => {
    if (document.getElementById(id)) return;
    const style = document.createElement(`style`);
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
};
