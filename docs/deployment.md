# Deployment

The application is published from the `main` branch by
`.github/workflows/pages.yml`.

The workflow:

1. installs the locked Node.js dependencies;
2. runs strict TypeScript, ESLint, unit/integration, Chromium end-to-end, and
   automated accessibility checks;
3. creates a static export with the `/Aviel` GitHub Pages base path; and
4. deploys the verified artifact to GitHub Pages.

The same source remains compatible with the existing Sites/Cloudflare Worker
deployment. `GITHUB_PAGES=true` enables static-export settings only inside the
GitHub Pages build.

GitHub Pages must use **GitHub Actions** as its publishing source. The expected
repository URL is:

`https://naortm.github.io/Aviel/`
