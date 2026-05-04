# Android PWA Setup

This is the canonical setup for running Quick Record on Android.

## Rule

- The app is served as a PWA over HTTPS.
- The app code lives in one repository.
- User records live in a separate private GitHub repository as Markdown files.
- Android uses the browser-installed PWA, not a native app.

## Prerequisites

- A GitHub account.
- Two GitHub repositories:
  - `quick-record-app` for the web app.
  - `quick-record-data` for records.
- A GitHub token with `Contents: Read and write` on `quick-record-data`.
- A hosting target for the app, such as Cloudflare Pages.

## 1. Create the repositories

1. Create `quick-record-app`.
2. Create `quick-record-data` as a private repository.
3. Initialize `quick-record-data` with a README so it has a default branch.

## 2. Push the app

From the project root:

```powershell
git init
git add .
git commit -m "feat: initial quick record pwa"
git branch -M main
git remote add origin https://github.com/<user>/quick-record-app.git
git push -u origin main
```

## 3. Create the token

GitHub path:

```text
Settings -> Developer settings -> Personal access tokens -> Fine-grained tokens
```

Grant:

- Repository access: only `quick-record-data`
- Permissions: `Contents` = `Read and write`

## 4. Deploy the app

In Cloudflare Pages:

```text
Workers & Pages -> Create application -> Pages -> Connect to Git
```

Use:

- Framework preset: `None`
- Production branch: `main`
- Build command: empty
- Build output directory: `.`

## 5. Install on Android

1. Open the Pages URL in Chrome on Android.
2. Use the browser menu to install the app.
3. Launch the installed icon from the home screen.

## 6. Configure sync

In the app settings, enter:

- Owner: your GitHub username
- Repo: `quick-record-data`
- Branch: `main`
- Root Path: `QuickRecord`
- Token: the fine-grained token

## 7. Verify

1. Save a short note.
2. Tap Sync.
3. Confirm a Markdown file appears in `quick-record-data` under `QuickRecord/records/...`.

On desktop, the same PWA URL works in Ubuntu and Windows.
