# Atlas landing page

Static GitHub Pages site for the **bank-atlas** and **mail-atlas** projects.

## Local preview

Open `index.html` in a browser, or serve the folder:

```bash
npx --yes serve .
```

## Deploy to GitHub Pages

1. Copy this folder to `pages/` in **bank-atlas** or **mail-atlas** (or both).
2. In the repo on GitHub: **Settings → Pages → Build and deployment → GitHub Actions**.
3. Push to `main`. The workflow deploys `pages/` on every push.

Project site URLs:

- `https://ggarciasoft.github.io/bank-atlas/`
- `https://ggarciasoft.github.io/mail-atlas/`

Both show the same unified Atlas landing page with links to each repository.
