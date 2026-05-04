# Quick Record

Quick Record is a first-version text capture app for Android, Ubuntu, and Windows. It is a PWA, stores records locally in IndexedDB, and syncs each record to GitHub as an individual Markdown file.

## Why This Shape

Android cannot assume local `git` or native SQLite. A PWA keeps the same app surface across Android, Ubuntu, and Windows:

- Local-first capture through IndexedDB.
- GitHub sync through the REST API.
- One Markdown file per record to avoid Git conflicts.
- Obsidian can read the synced repo directly.

## Run Locally

```bash
node server.mjs
```

Open:

```text
http://127.0.0.1:4173
```

## GitHub Setup

Create a private GitHub repository with an initial commit. Then create a token that can read and write repository contents for that repository.

In the app settings, fill:

- `Owner`: GitHub user or organization.
- `Repo`: repository name.
- `Branch`: usually `main`.
- `Root Path`: default `QuickRecord`.
- `Token`: GitHub token.

The token is stored only in the browser on that device. Do not put it in the repository.

For the canonical Android setup, see [docs/runbooks/android-pwa-setup.md](docs/runbooks/android-pwa-setup.md). Chinese guide: [docs/runbooks/android-pwa-setup.zh-CN.md](docs/runbooks/android-pwa-setup.zh-CN.md).

## Sync Layout

Records are written as standalone Markdown files:

```text
QuickRecord/
  records/
    2026/
      05/
        04/
          20260504-221301-dev12345-rec67890.md
```

Example file:

```markdown
---
id: "rec_..."
created: "2026-05-04T22:13:01+08:00"
updated: "2026-05-04T22:13:01+08:00"
device: "dev_..."
source: "quick-record"
tags: ["inbox"]
---

Text content
```

## Obsidian

Recommended options:

1. Clone the GitHub repository into an Obsidian vault folder.
2. Use the Obsidian Git plugin on desktop to pull the repo.
3. On Android, use the PWA for capture and Obsidian for reading or later organization.

Because each record is a separate file, multi-device capture should not create normal Markdown merge conflicts.

## Tests

```bash
node tests/run.mjs
```
