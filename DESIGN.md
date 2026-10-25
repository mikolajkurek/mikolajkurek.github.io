# Portfolio and interactive CV: design notes

## Principles (after the October 2026 review)

1. **One focal point per page.** Each panel has one headline idea; supporting text is quieter.
2. **Fewer labels.** Mono type is used only for small metadata (dates, field names), in sentence case. No codes, part numbers or coordinates.
3. **Light only, flat colour.** Every page is a single poster colour from the moodboard; white cards hold dense content.
4. **Playful details stay small.** Pixel motion, stickers and the italic accent face add character without competing with the content.
5. **Plain punctuation.** No em dashes, middle dots or Polish diacritics anywhere in the copy.

## Pages

Every page is white with ink text, except the CV (paper). Each page's colour is the CV metro line of the same name and fills one block in the page. The menu and footer stay neutral.

| # | Page | Colour | Where it shows |
|---|---|---|---|
| 1 | Map | All line colours; the blue is the mascot blue `#242EDB` | The transit map |
| 2 | About (the CV page, `#about`) | Paper `#FAFAF7`, unchanged | The metro |
| 3 | Work | Marigold `#FFC33C` (Work line) | The project card block, full width |
| 4 | Skills | Green `#4BA74A` (Clubs line) | The skills table, full width |
| 5 | Contact | Red `#E2452B` (Certificates line) | The form |

Spare palette colours: sage `#8ABD78`, marigold `#FFC33C`, lemon `#FFE852`.


## Information architecture

- **Loading screen:** the Paris photo (never cropped) sharpens in pixel steps with the name and titles under it, then waits: Enter starts the guided intro, Skip intro goes straight in (no tour, no suggested order).
- **Index:** the site as a transit map filling the page (`js/map.js`), drawn like the CV metro. Four lines leave one grey ring, one per page, in that page's colour, with a stop for each project, school or skill, oldest to newest. Whole lines and stops are clickable; a project stop opens Work and points out that card rather than opening it. Mid-tour, a click on the map makes the guide ask whether to skip and go there. Trains run along them and stops light up as they pass. On every load the guide (Mikolaj as a `·}` face, `js/guide.js`) appears in the middle of the dimmed map and talks the visitor through the lines, moving aside so each line stays in view and waiting for Next, then jumps up next to the name in the top bar, where it gives a tip for each page. Phones get the lines as lists.
- **CV** is the full record as a forked metro map.
- **Work** is a catalogue-style index (after obys): twelve numbered projects in three groups on the left, with one-at-a-time skill filters on a single line (AI and vision, 3D, CAD and printing, Electronics, Data, Simulation, Apps), a giant stepped statement and a live preview of the hovered project on the right. Clicking a row opens the write-up in place. Pictures in write-ups sit in figures with one rule per figure and a shared cell shape, and open in an app-style viewer (`js/viewer.js`).
- **More** is the last menu item: a panel that opens straight down in the same bar style, with Instagram and GitHub. The CV is only offered through the Download CV button (an uploaded PDF).
- Deep links: `#p-brachy`, `#p-sorter` and the other project ids open Work with that project.

## Type

- **Alte Haas Grotesk**, Regular and Bold: everything. Tracking -2% for body, -4.5% for headings, -6% for display.
- **Geist Mono**: dates and field labels only.
- **Silkscreen**: the pixel tag sticker only.

Alte Haas ships in `assets/fonts` with its licence file, as the licence requires.

## Motion

- **Page change:** a pixel wave spreads from the click, ordered by distance and broken up with a Bayer dither. Each cell flashes the accent colour before settling. Cover 0.42 s, reveal 0.52 s.
- **Click:** pixel ring burst (unchanged).
- **Hover:** snake underline made of 5 px blocks with a raised accent head. It settles into a clean line when it reaches the end and slithers off on leave.
- **CV load:** the metro rail draws down station by station; each stop pops in as the line reaches it and its text rises alongside.
- **Index map:** lines draw in, stops pop in order, trains step 8 px every 45 ms. **Hovers:** nav items and links share the snake underline; buttons invert.
- **Project write-ups:** wipe in, sections rise in, results count up.
- **Photo:** resolves from 8 px blocks to full resolution.
- `prefers-reduced-motion` turns all of this off.

## Stickers

No stickers remain; they were removed to keep pages clean.

## Signature details

- **Header:** the menu is a solid bar in the text colour; the current page shows through as a tab in the page colour.
- **CV metro map:** education is the trunk running the full height; work (green), clubs and events (marigold) and certificates (red) fork off it into their own lanes, and ongoing roles keep their lane running up to today, so overlapping years read as parallel tracks. Drawn as SVG by `js/sections.js` from each row's `data-lane` and `data-ongoing`.
- **Work:** project cards in one colourway; photos live inside the project write-ups (`.pw__media`).

## Stack

Static HTML, CSS and ES modules with no build step, deployable to GitHub Pages as-is. If the content grows, Astro with content collections is the natural upgrade.

## Suggested order

Pages are meant to be seen About, Work, Skills, Contact. `js/main.js` tracks visited pages for the current load only, so every visit starts fresh; pages not visited yet are dimmed in the menu and on the Index map, and the next one is lit with a yellow mark; trains only run on lit lines (`--pop`, the yellow drawn on the Paris photo). The guide lives next to the name in the top bar and gives a tip for each page.
