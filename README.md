# mikolajkurek.github.io

One-page portfolio and interactive CV. Static HTML/CSS/ES modules with no build step. See `DESIGN.md` for the design system.

## Run locally

```bash
python3 -m http.server 4173
```

Then open http://127.0.0.1:4173. ES modules need a server, so opening `index.html` directly won't work.

## Edit content

All content lives in `index.html`, one `<section class="panel">` per page.

- **Add a project:** copy a `<button class="pcard">` in `#work` and its matching `<article class="pw">` in the project detail below the cards. Add a stop for it on the map's yellow line (`data-goto="work" data-card="p-…"`).
- **Add a timeline entry:** copy a `<li class="row">` in `#about`. `data-kind` and `data-lane` drive the filter and the metro line.

## The CV file

The Download CV button links to `assets/Mikolaj_Kurek_CV.pdf`. Replace that file with your own PDF; nothing generates it.

## Deploy

Push to a repo named `mikolajkurek.github.io` (or enable Pages on any repo). There is nothing to build.
