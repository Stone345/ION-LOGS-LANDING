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
| `.htaccess` | Redirects for Apache/LiteSpeed hosting (see below) |

Every number in the demos is synthetic, and the footer says so. Don't claim CLIA, CAP, 21 CFR Part 11 or HIPAA compliance on this page; the app doesn't make those claims either.

## Hosting: keep old links working

Before this site existed, the app ran on `www.ionlogs.com`, so there are bookmarks, inspector links and printed QR labels such as `www.ionlogs.com/s/e/FRG-01`. Wherever this site is hosted, **any path that isn't a file of this site must redirect to the same path on `https://app.ionlogs.com`**, keeping the query string.

- **Apache / LiteSpeed (e.g. Hostinger):** `.htaccess` already does this, plus `ionlogs.com` → `www` and HTTPS.
- **Other hosts:** add the equivalent rule ("if no file matches, redirect `/*` to `https://app.ionlogs.com/:splat`").

## Going live

1. Deploy this repo to the host.
2. At Hostinger DNS, point `@` and `www` at the new host (today they point at the app's Render service).
3. Check `https://www.ionlogs.com/`, `https://ionlogs.com/` and an old link like `https://www.ionlogs.com/login` (should land on `app.ionlogs.com/login`).

`app.ionlogs.com` keeps pointing at Render and needs no change.
