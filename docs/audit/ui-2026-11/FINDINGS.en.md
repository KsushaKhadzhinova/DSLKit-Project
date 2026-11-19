# UI audit, November 2026: findings

Russian version: [`FINDINGS.md`](FINDINGS.md). The audit is partial: 14 pages of the site were captured at three widths (375, 1024, 1920 px) in the light and dark theme in Edge, 84 screenshots in total in the `shots/` folder (names like `page_width_theme_browser.jpg`). Not covered: 320 px, 768 px, 200% zoom, Firefox, the UIs of the labs and practicals.

## Token contrast (`tools/contrast.js`)

All text-on-background pairs pass AA: the muted text is 5.45 in the light theme and 5.81 in the dark one. The exception is the border colour `--color-border` `#dde1e9`, which gives only 1.25:1 to the background: a risk for the borders of inputs as non-text elements (3:1 is needed).

## Findings

| No. | Severity | Where          | What is wrong                                                                                                     | Recommendation                                                                              |
| --- | -------- | -------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| U1  | major    | Editor, 375 px | The toolbar wraps to three rows and takes most of the screen height.                                              | Fold secondary buttons into a menu, keep only run, undo, redo and save in the row.          |
| U2  | major    | Editor, 375 px | The tour hint covers the bottom panels, they cannot be reached while the tour is open.                            | Show the hint above its target, not over the bottom panels, and let a tap outside close it. |
| U3  | minor    | Editor         | The run button is green while the main colour of the interface is blue: the main action does not fit the palette. | Use the main colour for run or record the green as a separate action token.                 |
| U4  | minor    | Inputs         | The border `#dde1e9` is 1.25:1 to the background, the field is hard to see, especially in the light theme.        | Take an input border of at least 3:1, keep the other borders.                               |

## What to do next

1. Fix U1 and U2: on a phone they get in the way of work.
2. Then U4 and U3.
3. Repeat the audit for 320 and 768 px, 200% zoom, Firefox and the UIs of the labs.
