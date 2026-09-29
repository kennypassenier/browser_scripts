// AUTO-GENERATED — do not edit directly. Edit styles.css instead.
'use strict';
const STYLES = `/*
 * Gemini caps every chat column at 708px (the "extended-and-xl-grid" layout)
 * and the input bar at 660px. Widen all of them to one shared width.
 */
:root {
    /* Horizontal room kept free on each side of the chat column. */
    --kp-gemini-gutter: 48px;
}

/* The gutter lives on the conversation itself, so nothing inside it can reach the edges. */
.conversation-container {
    box-sizing: border-box !important;
    padding-inline: var(--kp-gemini-gutter) !important;
}

/* Gemini's own width tokens, read by several components. */
chat-window-content,
input-container {
    --bard-chat-window-content-width-default: 100% !important;
    --bard-chat-window-max-width-default: 100% !important;
}

/* Every block of an answer (paragraphs, lists, code, tables). */
.conversation-container .markdown > *,
/* The prompt row and everything framing an answer. */
.conversation-container user-query,
.conversation-container model-response-disclaimers,
.response-container .response-container-header,
.response-container .response-container-footer,
.response-container-content .bot-name,
.response-container-content .imported-chat-label,
.response-footer,
thinking-overlay,
.attachment-container {
    max-width: 100% !important;
}

/* Action row (copy, thumbs, ...) is offset against the old 708px column. */
model-response message-actions {
    max-width: 100% !important;
    margin-inline: -6px auto !important;
}

/* Prompt bubble: allow it to grow with the column. */
.user-query-bubble-with-background {
    max-width: 75% !important;
}

/* Input bar lines up with the chat column. */
.input-area-container {
    /* input-container already pads 16px per side. */
    max-width: calc(100% - 2 * (var(--kp-gemini-gutter) - 16px)) !important;
}

/*
 * Tables scroll inside a full-width wrapper and are pushed right by padding
 * computed against the old 708px column; line them up with the text instead.
 */
.conversation-container .markdown > .horizontal-scroll-wrapper {
    max-width: none !important;
}
.markdown .table-block .table-content {
    padding-inline: 0 !important;
}
`;
