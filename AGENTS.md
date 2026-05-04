# Repository Guidelines

## Project Structure & Module Organization

This repository contains a zero-dependency PWA for quick text capture and GitHub-backed Markdown sync.

Architecture rule: keep the app as an HTTPS PWA. Store user records in a separate private GitHub data repository, one Markdown file per record.

- `index.html`: main application shell.
- `src/app.js`: UI wiring, capture flow, settings, and sync actions.
- `src/db.js`: IndexedDB persistence.
- `src/github.js`: GitHub REST API sync logic.
- `src/markdown.js` and `src/ids.js`: record serialization, paths, and IDs.
- `src/styles.css`: responsive app styling.
- `sw.js` and `manifest.webmanifest`: PWA/offline support.
- `server.mjs`: local static preview server.
- `tests/`: single-process Node test runner and module tests.
- `docs/plans/`: design plans.
- `docs/runbooks/`: operational setup guides.

## Build, Test, and Development Commands

- `node server.mjs`: run the local preview server at `http://127.0.0.1:4173`.
- `npm start`: same as above, when `npm` is available.
- `node tests/run.mjs`: run the repository test suite without spawning subprocesses.
- `npm test`: package script for the same test suite.
- `node --check src/app.js`: syntax-check an individual module.

There is no build step; the app is served as plain HTML, CSS, and JavaScript modules.

## Coding Style & Naming Conventions

Use modern JavaScript modules with 2-space indentation, semicolons, and explicit named exports. Prefer small pure helpers for serialization and sync boundaries. Keep browser-only APIs inside UI/storage modules so shared logic remains testable in Node.

Use `camelCase` for functions and variables, `UPPER_CASE` for constants, and descriptive file names such as `markdown.js` or `github.js`.

## Testing Guidelines

Tests use Node's built-in `assert` module through `tests/run.mjs`. Add test cases to the runner for pure modules, especially Markdown formatting, path generation, and GitHub API helpers. Test files may follow `tests/<module>.test.mjs`, but keep `tests/run.mjs` as the command entry point.

Run `node tests/run.mjs` before handing off changes.

## Commit & Pull Request Guidelines

This directory currently has no Git history, so no existing commit convention can be inferred. Use concise Conventional Commit-style messages going forward, for example `feat: add pull conflict handling` or `fix: preserve local pending records`.

Pull requests should include a short summary, test results, screenshots for UI changes, and notes for any GitHub token, sync, or Obsidian behavior changes.

## Security & Configuration Tips

Never commit GitHub tokens or local browser storage exports. Keep tokens scoped to the target private repository when possible. Treat generated Markdown records as user data and avoid logging record content in sync errors.
