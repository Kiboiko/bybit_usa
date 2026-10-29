# Google Ads tags (switched off)

Removed from the site on 2026-10-28 at the owner's request. Nothing in this folder is deployed.

`google-ads-conversions.txt` holds all 218 `AW-<account>/<label>` pairs that used to be wired in.

## How it was wired (to switch it back on)

1. `index.html`, inside `<head>`: a `dataLayer`/`gtag()` stub, one `gtag('config', 'AW-<account>')` per
   line (the part before the `/`), and the library loaded from `window.addEventListener('load', ...)`
   as `https://www.googletagmanager.com/gtag/js?id=AW-17461494815` (not a blocking `<script async>`).
2. `js/main.js`: a `GOOGLE_ADS_CONVERSIONS` array of the pairs plus a helper that does
   `window.gtag('event', 'conversion', { send_to: pair })` for each, called right after the success
   message of a lead submit.
3. Bump the `?v=` on the two script tags in `index.html`.

All 218 accounts at once kept the browser's main thread busy for ~78 s after page load (180 long tasks);
if tags come back, send fewer accounts or stagger the `config` calls.

Not removed: `api/leads.php` still writes the `?gtag_id=` URL parameter into column I of the sheet.
That is just a text value from the ad link, it does not load any Google script.
