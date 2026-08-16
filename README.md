# ScanForge — Universal Website & Code Analyzer

A Flask app that scans a **live URL** or an uploaded **.zip codebase** and returns an
AI-generated audit covering SEO, performance, security and code quality.

The app now has three pages instead of opening straight into the tool:

| Route    | Page                             | File                     |
|----------|-----------------------------------|--------------------------|
| `/`      | Landing page (marketing)          | `templates/landing.html` |
| `/login` | Sign in / sign up (tabbed)        | `templates/login.html`   |
| `/app`   | Audit console — the tool itself   | `templates/app.html`     |

## Design

Everything — name, palette, layout, copy — was built from scratch for this
project, not copied from any reference site. It's a **diagnostics /
systems-monitor** identity, since the product's job is literally to scan and
report, and it ships **light-mode only**:

- **Palette** — a soft off-white base with a mint-teal signal color
  (`#16f0c4`) as the primary accent, paired with violet, amber, coral and
  green for the different result states. The one exception is the hero's
  "live scan monitor" and the sample-report panel, which are deliberately
  kept dark — like a terminal window sitting on a light page — since that's
  the product's own report output, not the site chrome.
- **Type** — Space Grotesk for headings, Inter for body copy, JetBrains Mono
  for data, labels and terminal-style readouts.
- **Signature element** — the hero's animated scan monitor: a sweeping scan
  line over a waveform, live score bars, and a findings panel that reads like
  a code review rather than a spreadsheet.
- **Icon** — a rounded teal square with a minimal "pulse line" mark, used as
  the favicon and the `</>` brand mark across all three pages.

## The audit console workflow

This was the main functional request: one scan at a time, with a running,
countable history.

1. You run a scan (URL or ZIP) from **Audit Console**. While it's running you
   see a loader; the moment it resolves, only that scan's result — its score,
   passed checks, warnings and critical risks — is shown on screen.
2. That result is immediately saved into the scan history and the counters
   update (sidebar badge + "Total Audits Run" pill), so after your 2nd scan
   it says 2, after your 100th it says 100.
3. Switch to **History** to see every past scan in a table (target, type,
   score, time). Click **View Report** on any row to reopen that scan's full
   passed/warning/error breakdown in a modal, without losing your current
   session.

History is kept in the browser's `localStorage`, scoped per signed-in email,
so different demo accounts on the same browser don't mix scans (see below).

## Sign in / sign up

`/login` is a dedicated page (not a popup) with **Sign In** / **Sign Up**
tabs, matching layout in spirit but with the project's own palette, type and
copy. It has no user database yet, so it's a **front-end demo**: submitting
either form saves `{ name, email }` to `localStorage` and redirects to
`/app`. Visiting `/app` without that session bounces you back to `/login`
(see the guard at the top of `static/js/main.js`) and **Sign out** in the
sidebar clears it.

To make this real:

1. Add a `users` table/model (e.g. via `flask-sqlalchemy`).
2. Add `POST /signup` and `POST /login` routes in `app.py` that hash
   passwords (`werkzeug.security.generate_password_hash` is already a
   dependency) and set a server-side session/cookie.
3. Update `submitAuth()` in `static/js/auth.js` to `fetch()` those routes
   instead of writing straight to `localStorage`.
4. Move scan history from `localStorage` into a database table keyed by user
   ID, and have `app.py` serve it instead of `main.js` reading the browser.

## Project structure

```
Universal Website & Code Analyzer/
├── requirements.txt
├── README.md
├── site-scope-analyzer/
│   ├── app.py              # Flask routes
│   └── analyzer.py         # Groq/OpenAI-powered scan logic
├── templates/
│   ├── landing.html        # Marketing landing page  ("/")
│   ├── login.html          # Sign in / sign up        ("/login")
│   └── app.html            # Audit console             ("/app")
└── static/
    ├── css/
    │   ├── landing.css     # Shared brand styles: landing + login pages
    │   └── style.css       # Audit console styles
    └── js/
        ├── landing.js      # Landing page interactions
        ├── auth.js         # Login/signup tab + demo-session logic
        └── main.js         # Audit console logic, history, session guard
```

## Setup

1. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Add your Groq API key.** Create a `.env` file inside
   `site-scope-analyzer/` (or the project root) with:
   ```
   GROQ_API_KEY=your_key_here
   ```
   Get a free key at [console.groq.com](https://console.groq.com). Without
   it, scans will return an error but the site itself still works.

3. **Run the app**
   ```bash
   cd "site-scope-analyzer"
   python app.py
   ```
   Visit `http://127.0.0.1:5000/` for the landing page. From there, **Create
   free account** or **Sign in** takes you to `/login`, which hands off to
   `/app` (the audit console) once you submit either form.

## How the analyzer works

- **Live URL** — `analyze_live_url()` fetches the page with `requests`,
  extracts the title and a text snippet with `BeautifulSoup`, then sends that
  to Llama 3.3 (via the Groq API) for a structured SEO/performance/security
  review.
- **ZIP upload** — `analyze_zip_file()` reads the archive's file list and
  sends it to the same model for a project-structure and code-quality review.
- Both return JSON with `scores`, `passed`, `warnings`, and `errors`, which
  `main.js` renders on screen and appends to the scan history table.

## Notes for deployment

- `app.run(debug=True, port=5000)` is for local development only — use a
  production WSGI server (gunicorn, waitress) before deploying.
- The 50 MB upload cap and `.zip`-only restriction are enforced server-side
  in `app.py`.
- Responsive down to mobile: the nav collapses to a menu button, the auth
  page stacks to a single column, and the dashboard sidebar becomes a top bar.

## Deploying to Vercel

This repo already includes `vercel.json`, so it deploys as-is:

1. Push this project to a GitHub repo (make sure `.env` is **not** included
   — `.gitignore` already excludes it).
2. On [vercel.com](https://vercel.com), **Add New → Project**, and import
   that repo.
3. Framework preset: leave it as **Other** — `vercel.json` handles the
   build (it points Vercel at `site-scope-analyzer/app.py` via
   `@vercel/python`, and routes every request to it, including `/static/...`,
   which Flask serves itself).
4. Before deploying, open **Environment Variables** and add:
   - Key: `GROQ_API_KEY`
   - Value: your actual key from [console.groq.com](https://console.groq.com)
5. Click **Deploy**.

A few things that behave differently on Vercel because it's serverless
(each request can run in a fresh, mostly-read-only environment):

- **File uploads** — `app.py` already saves ZIP uploads to
  `tempfile.gettempdir()` (which resolves to Vercel's writable `/tmp`)
  instead of a project folder, and deletes the file right after analyzing
  it. No change needed.
- **Scan history** — it's stored in the browser (`localStorage`), not on the
  server, so it isn't affected by serverless functions being stateless
  between requests.
- **Cold starts / timeouts** — the first request after idle time can take a
  second or two longer to boot. If a ZIP analysis is large enough to run
  long, Vercel's Hobby plan caps a single function at a limited duration —
  if you hit that, either upgrade the plan or extend it via a `functions`
  block in `vercel.json` (see Vercel's docs on `maxDuration`).

