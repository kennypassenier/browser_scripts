// ESLint flat config (ESLint v9+)
// Run manually:  npx eslint scripts/
// Auto-runs on:  git commit (via .git/hooks/pre-commit)

export default [
    {
        // Only lint our userscript source files
        files: ['scripts/**/*.js'],

        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',       // userscripts are not ES modules
            globals: {
                window:    'readonly',
                document:  'readonly',
                location:  'readonly',
                console:   'readonly',
                localStorage: 'readonly',
                MutationObserver: 'readonly',
                setTimeout: 'readonly',
                URL:       'readonly',
            },
        },

        rules: {
            // ── Semicolons ────────────────────────────────────────────────
            // 'always' = require semicolons everywhere (recommended)
            // 'never'  = ban semicolons (ASI-reliant style)
            'semi': ['error', 'always'],

            // ── Quotes ───────────────────────────────────────────────────
            // 'single'  = enforce single quotes  → 'hello'
            // 'double'  = enforce double quotes  → "hello"
            // 'backtick'= enforce template literals everywhere
            // avoidEscape: true = allow the other quote to avoid escaping
            'quotes': ['error', 'single', { avoidEscape: true }],

            // ── Template literals ─────────────────────────────────────────
            // Flags 'hello ' + name — forces `hello ${name}` instead
            'prefer-template': 'error',

            // ── Indentation ───────────────────────────────────────────────
            // Number = spaces per level. 'tab' = use tabs.
            'indent': ['error', 4],

            // ── Spacing inside braces ─────────────────────────────────────
            // 'always' → { foo }   'never' → {foo}
            'object-curly-spacing': ['error', 'always'],

            // ── Trailing commas ───────────────────────────────────────────
            // 'none'    = never
            // 'es5'     = only where valid in ES5 (objects, arrays)
            // 'all'     = including function parameters (ES2017+)
            'comma-dangle': ['error', 'always-multiline'],

            // ── Arrow function body braces ────────────────────────────────
            // 'as-needed' = omit braces when body is a single expression
            // 'always'    = always require braces
            'arrow-body-style': ['error', 'as-needed'],

            // ── Arrow function parameter parens ───────────────────────────
            // 'as-needed' = omit parens for single param → x => x
            // 'always'    = always require parens        → (x) => x
            'arrow-parens': ['error', 'as-needed'],

            // ── const vs let ─────────────────────────────────────────────
            // Flags variables that are never reassigned — use const instead
            'prefer-const': 'error',

            // ── var is banned ─────────────────────────────────────────────
            // Force let/const over var
            'no-var': 'error',

            // ── Equality ─────────────────────────────────────────────────
            // 'always' = require === and !== (bans == and !=)
            // 'smart'  = allow == for null checks (x == null catches both null and undefined)
            'eqeqeq': ['error', 'always'],

            // ── Unused variables ─────────────────────────────────────────
            // Flags declared variables that are never used
            'no-unused-vars': ['warn', { args: 'none' }],

            // ── Console ───────────────────────────────────────────────────
            // We use a custom log wrapper, so raw console calls are suspicious
            // 'warn' = flag them as warnings, not errors
            // Set to 'off' if you want to allow them freely
            'no-console': 'warn',

            // ── Spacing before function parens ────────────────────────────
            // 'never'  = no space → function foo() {}
            // 'always' = space    → function foo () {}
            // anonymous/arrow can be configured separately
            'space-before-function-paren': ['error', {
                anonymous:  'never',
                named:      'never',
                asyncArrow: 'always',   // async (x) => {}
            }],

            // ── Keyword spacing ───────────────────────────────────────────
            // Requires spaces around keywords: if (x) not if(x)
            'keyword-spacing': ['error', { before: true, after: true }],

            // ── Space before blocks ───────────────────────────────────────
            // Requires space before { in blocks: if (x) { not if (x){
            'space-before-blocks': 'error',

            // ── Newline at end of file ────────────────────────────────────
            // 'always' = require a trailing newline
            // 'never'  = forbid it
            'eol-last': ['error', 'always'],
        },
    },
];
