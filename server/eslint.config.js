// @ts-check
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'eslint.config.js'],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      // Advisory, not blocking — scattered `/* eslint-disable max-len */`
      // comments throughout the existing codebase imply this was an
      // intended convention at some point, but there's real pre-existing
      // code that would trip an error-level rule. Warn rather than fail
      // CI on code written before this config existed.
      'max-len': ['warn', { code: 120, ignoreUrls: true }],

      // Framework-idiomatic patterns in this codebase legitimately have
      // unused parameters that can't be removed: Express error-handling
      // middleware requires exactly 4 parameters (err, req, res, next)
      // for Express to recognize it as an error handler via arity-based
      // dispatch, even when req/next go unused in the body. Warn instead
      // of error so this doesn't block CI, and allow a leading
      // underscore as the documented way to mark "intentionally unused".
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  }
);
