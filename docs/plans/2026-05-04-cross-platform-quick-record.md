# Cross-Platform Quick Record Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a first-version text capture app that works across Android, Ubuntu, and Windows, syncs through GitHub, and writes Obsidian-friendly Markdown.

**Architecture:** Use a browser-based PWA so Android does not need native Git or SQLite. Store records locally in IndexedDB, serialize each record as a standalone Markdown file, and sync files through the GitHub Contents and Git Trees APIs.

**Tech Stack:** HTML, CSS, JavaScript modules, IndexedDB, GitHub REST API, Node.js built-in test runner.

---

### Task 1: Project Skeleton

**Files:**
- Create: `package.json`
- Create: `server.mjs`
- Create: `index.html`
- Create: `src/styles.css`
- Create: `src/app.js`

**Steps:**
1. Add a zero-dependency Node project.
2. Add a static preview server.
3. Add the PWA page shell.
4. Add mobile-first CSS.

### Task 2: Record Format

**Files:**
- Create: `src/ids.js`
- Create: `src/markdown.js`
- Test: `tests/markdown.test.mjs`

**Steps:**
1. Generate stable record ids and device ids.
2. Serialize records into Markdown with JSON-compatible frontmatter values.
3. Parse Markdown back into records.
4. Test round-trips and path generation.

### Task 3: Local Storage

**Files:**
- Create: `src/db.js`

**Steps:**
1. Open an IndexedDB database.
2. Store records by `id`.
3. Query recent records.
4. Track sync metadata.

### Task 4: GitHub Sync

**Files:**
- Create: `src/github.js`
- Test: `tests/github.test.mjs`

**Steps:**
1. Read settings for owner, repo, branch, root path, and token.
2. Pull Markdown files from GitHub recursively.
3. Import unknown or changed records.
4. Push pending records as individual Markdown files.

### Task 5: UI and Verification

**Files:**
- Modify: `src/app.js`
- Modify: `README.md`

**Steps:**
1. Save records from the capture box.
2. Render recent records and sync status.
3. Provide settings for GitHub configuration.
4. Document Android, Ubuntu, Windows, and Obsidian usage.
5. Run `node --test tests/*.test.mjs`.
