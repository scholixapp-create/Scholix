# Signed-in mobile layout checks

Run against the **development frontend only** (no API server or database needed):

```sh
npm_config_manage_package_manager_versions=false pnpm --filter @workspace/scholix exec playwright install chromium
MOBILE_TEST_BASE_URL=http://localhost:8080 npm_config_manage_package_manager_versions=false pnpm --filter @workspace/scholix test:mobile
```

Use the frontend workflow's actual port if it differs, or its `.replit.dev` URL.
On Replit the configuration uses the preinstalled system Chromium to avoid
downloaded-browser library mismatches. Elsewhere it uses Playwright's installed
Chromium; `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can explicitly select a browser.
The configuration rejects production hosts. Browser routing intercepts every API
request; unknown endpoints and all writes fail rather than falling through to an
API server. The deliberately invalid fixture token only exercises client session
restoration through the intercepted `/api/auth/me` response. Production auth and
role guards are not altered, and no development sign-in route is added.

The matrix covers 320px and 390px screens with normal and reduced motion for
tutor, parent, student and admin roles. It checks scrollable navigation, long
names, a single bounded notifications panel, notification scrolling and dismissal,
parent forms, admin dialogs/search, student history/settings, tutor earnings cards
and the tablet table, page overflow, computed WCAG AA status-badge contrast, and
running animations under reduced motion.

Screenshots, failure traces and the HTML report are written under the ignored
`generated-artifacts/mobile/` directory. Screenshots are visual-review evidence,
not pixel-diff baselines. Review them when shared branding or navigation changes.
These fixtures check presentation, not backend authorization or saving data.
