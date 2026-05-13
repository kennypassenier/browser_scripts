// ESLint flat config (ESLint v9+)
// Run manually:    npx eslint scripts/
// Run with fixes:  npx eslint scripts/ --fix
// Auto-runs on:    git commit (via .git/hooks/pre-commit — auto-fixes and re-stages)

export default [
    {
        // Only lint our userscript source files
        files: [`scripts/**/*.js`],

        languageOptions: {
            ecmaVersion: 2022,
            sourceType: `script`,       // userscripts are not ES modules
            globals: {
                // Standard browser globals
                window: `readonly`,
                document: `readonly`,
                location: `readonly`,
                console: `readonly`,
                localStorage: `readonly`,
                sessionStorage: `readonly`,
                MutationObserver: `readonly`,
                setTimeout: `readonly`,
                setInterval: `readonly`,
                clearInterval: `readonly`,
                clearTimeout: `readonly`,
                URL: `readonly`,
                URLSearchParams: `readonly`,
                Event: `readonly`,
                KeyboardEvent: `readonly`,
                MouseEvent: `readonly`,
                // Greasemonkey / Tampermonkey globals
                GM_addStyle: `readonly`,
                GM_getValue: `readonly`,
                GM_setValue: `readonly`,
                GM_xmlhttpRequest: `readonly`,
                unsafeWindow: `readonly`,
                // modules/styles.js
                injectStyles: `readonly`,
            },
        },

        rules: {

            // ── Semicolons ────────────────────────────────────────────────────
            // Require semicolons everywhere. Auto-fixed.
            'semi': [`error`, `always`],
            // Space after ; in for-loop heads:  for (let i = 0; i < n; i++). Auto-fixed.
            'semi-spacing': [`error`, { before: false, after: true }],
            // Removes ;; double semicolons. Auto-fixed.
            'no-extra-semi': `error`,

            // ── Quotes / Template literals ────────────────────────────────────
            // Force template literals for ALL strings. Auto-fixed.
            // Combined with prefer-template: 'hello ' + var → `hello ${var}`
            'quotes': [`error`, `backtick`],
            // Flags string concatenation that should be an interpolation. Auto-fixed.
            'prefer-template': `error`,

            // ── Indentation ───────────────────────────────────────────────────
            // 2 spaces per level. Auto-fixed.
            'indent': [`error`, 2],

            // ── Trailing whitespace ───────────────────────────────────────────
            // Removes trailing spaces at the end of lines. Auto-fixed.
            'no-trailing-spaces': `error`,

            // ── Newline at end of file ────────────────────────────────────────
            // Many Unix tools (diff, cat, wc -l) expect a final newline.
            // Without it, the last line appears incomplete in diffs. Auto-fixed.
            'eol-last': [`error`, `always`],

            // ── Object/array/paren spacing ────────────────────────────────────
            'object-curly-spacing': [`error`, `always`],   // { foo: 1 }. Auto-fixed.
            'array-bracket-spacing': [`error`, `never`],   // [1, 2] — no spaces. Auto-fixed.
            'space-in-parens': [`error`, `never`],          // foo(bar) not foo( bar ). Auto-fixed.

            // ── Operator / punctuation spacing ───────────────────────────────
            'space-infix-ops': `error`,                                          // a + b not a+b. Auto-fixed.
            'key-spacing': [`error`, { beforeColon: false, afterColon: true }],  // { foo: 1 }. Auto-fixed.
            'comma-spacing': [`error`, { before: false, after: true }],          // [a, b]. Auto-fixed.
            // typeof x  not  typeof(x);  i++  not  i ++. Auto-fixed.
            'space-unary-ops': [`error`, { words: true, nonwords: false }],

            // ── Commas ────────────────────────────────────────────────────────
            // Trailing commas only on multi-line constructs. Auto-fixed.
            'comma-dangle': [`error`, `always-multiline`],
            // Comma at end of line (normal style), not at start. Auto-fixed.
            'comma-style': [`error`, `last`],

            // ── Brace style & block padding ───────────────────────────────────
            // Opening brace on same line: if (x) { } else { }. Auto-fixed.
            'brace-style': [`error`, `1tbs`],
            // No blank lines immediately inside {} blocks. Auto-fixed.
            'padded-blocks': [`error`, `never`],

            // ── Arrow functions ───────────────────────────────────────────────
            // Omit {} when body is a single expression:  x => x * 2. Auto-fixed.
            'arrow-body-style': [`error`, `as-needed`],
            // Omit parens for single param:  x => x  not  (x) => x. Auto-fixed.
            'arrow-parens': [`error`, `as-needed`],
            // x => x  not  x=>x. Auto-fixed.
            'arrow-spacing': [`error`, { before: true, after: true }],
            // arr.map(function(x) { return x; })  →  arr.map(x => x). Auto-fixed.
            'prefer-arrow-callback': `error`,

            // ── Spacing before function parens ────────────────────────────────
            // Controls whether a space appears between the function name/keyword
            // and its opening parenthesis.
            //   named: 'never'    → function foo() {}   (no space after name)
            //   anonymous: 'never'→ setTimeout(function() {})
            //   asyncArrow: 'always' → async (x) => {}  (space required)
            'space-before-function-paren': [`error`, {
                anonymous: `never`,
                named: `never`,
                asyncArrow: `always`,
            }],

            // ── Keywords ─────────────────────────────────────────────────────
            // if (x)  not  if(x). Auto-fixed.
            'keyword-spacing': [`error`, { before: true, after: true }],

            // ── Variables ─────────────────────────────────────────────────────
            // Converts var → let automatically. Auto-fixed.
            'no-var': `error`,
            // Flags use of undeclared variables (catches typos like windw.location).
            // Globals like window/document are declared in languageOptions.globals above.
            'no-undef': `error`,
            // Only flags let/const used before their declaration (real ReferenceError risk).
            // functions: false = hoisted function declarations are fine.
            'no-use-before-define': [`error`, { functions: false, classes: true, variables: true }],

            // ── Equality ─────────────────────────────────────────────────────
            // Require === and !==.
            'eqeqeq': [`error`, `always`],

            // ── Console ───────────────────────────────────────────────────────
            // Warn on raw console calls (we use a custom log wrapper).
            'no-console': `warn`,

            // ── Object dot notation & shorthand ──────────────────────────────
            // obj.foo  not  obj['foo']. Auto-fixed.
            'dot-notation': [`error`, { allowKeywords: true }],
            // { x }  not  { x: x };  { foo() {} }  not  { foo: function() {} }. Auto-fixed.
            'object-shorthand': [`error`, `always`],
            // const { x } = obj  not  const x = obj.x  (when names match). Warn — not always auto-fixable.
            'prefer-destructuring': [`warn`, {
                VariableDeclarator: { array: false, object: true },
                AssignmentExpression: { array: false, object: false },
            }],

            // ── Control flow ─────────────────────────────────────────────────
            // Removes unnecessary else after a return. Auto-fixed.
            //   if (x) { return 1; } else { return 2; }
            //   →  if (x) { return 1; } return 2;
            'no-else-return': `error`,
            // else { if (...) }  →  else if (...). Auto-fixed.
            'no-lonely-if': `error`,
            // if (1 === x)  →  if (x === 1). Auto-fixed.
            'yoda': [`error`, `never`],

            // ── Strict mode ───────────────────────────────────────────────────
            // Require exactly one 'use strict' at the top of each file.
            'strict': [`error`, `global`],

            // ── Comment spacing ───────────────────────────────────────────────
            // // comment  not  //comment. Auto-fixed.
            'spaced-comment': [`error`, `always`],

            // ── Error prevention ──────────────────────────────────────────────
            'no-dupe-keys': `error`,              // { a: 1, a: 2 }
            'no-duplicate-case': `error`,         // duplicate case in switch
            'no-unreachable': `error`,            // code after return/throw/break
            'no-empty': [`error`, { allowEmptyCatch: true }],
            'no-extra-boolean-cast': `error`,     // !!x where boolean already expected. Auto-fixed.

        },
    },
];
