# IONLOGS landing page

The public site at **www.ionlogs.com**. The app itself lives at **app.ionlogs.com** (repo [`Stone345/IONLOGS`](https://github.com/Stone345/IONLOGS)).

Plain HTML, CSS and JavaScript. No build step, no dependencies.

## Preview locally

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080.

## What's here

| Path | What it is |
| --- | --- |
| `index.html` | The page |
| `assets/css/site.css` | Styles. Colours come from the logo: `#08070c` background, `#fd2f69` pink, `#f7f6f9` white |
| `assets/js/site.js` | The interactive demos (round, recall, column gauge, reports) and the hero spectrum |
| `assets/video/` | Hero background: autosampler footage, played forward then backward so it loops without a jump (WebM + MP4, 1280×720, no audio) |
| `assets/img/` | Video poster, social share image (`og.jpg`), logo banner, iPhone icon |
| `favicon.svg` | Browser tab icon |
| `demo.php` | Sends demo requests by email and keeps a private copy |
| `.htaccess` | Redirects for Apache/LiteSpeed hosting (see below) |

Every number in the demos is synthetic, and the footer says so. Don't claim CLIA, CAP, 21 CFR Part 11 or HIPAA compliance on this page; the app doesn't make those claims either.

## Demo requests

The **Request a demo** form (`#demo`, near the bottom of the page) posts to `demo.php`, which runs on Hostinger's PHP:

- Each request is emailed to **ionlabllc@gmail.com** from `no-reply@ionlogs.com`. Hitting **Reply** answers the person who asked.
- A copy of every request is saved in `domains/ionlogs.com/demo-requests/requests.jsonl` on the hosting account (one level above `public_html`, so it can't be opened from the web). Open it in hPanel → File Manager if an email ever goes missing.
- Spam protection: a hidden field bots fill in, a minimum time on the page, and limits of 5 requests per visitor and 60 in total per hour.
- Change the receiving address with `TO_EMAIL` at the top of `demo.php`.

## Updating styles or scripts

Hostinger's CDN keeps CSS and JS for 7 days. When you change `assets/css/site.css` or `assets/js/site.js`, bump the `?v=` number on its link in `index.html` (e.g. `site.css?v=2` → `site.css?v=3`) so visitors get the new file straight away.

## Hosting: keep old links working

Before this site existed, the app ran on `www.ionlogs.com`, so there are bookmarks, inspector links and printed QR labels such as `www.ionlogs.com/s/e/FRG-01`. Wherever this site is hosted, **any path that isn't a file of this site must redirect to the same path on `https://app.ionlogs.com`**, keeping the query string.

- **Apache / LiteSpeed (e.g. Hostinger):** `.htaccess` already does this, plus `ionlogs.com` → `www` and HTTPS.
- **Other hosts:** add the equivalent rule ("if no file matches, redirect `/*` to `https://app.ionlogs.com/:splat`").

## Where it's live

Hostinger website `ionlogs.com` (Web hosting), deployed from this repo's `main` branch: every push to `main` goes live within a minute. DNS at Hostinger: `@` and `www` → Hostinger; `app` → the app on Render.
