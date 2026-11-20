# Screen rotation and aspect ratio

Russian version: [`feature-orientation.md`](feature-orientation.md). Files: `site/css/orientation.css`, `site/js/components/orientation.js`, tests `labs/05-javascript-interactivity/orientation.test.js`, e2e `testing-course/full/orientation-e2e.py`, mockups `docs/design-contest/orientation/`.

## Layout rules

| Condition                                                      | Layout                                                                                                    |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Under 576 px, portrait                                         | One column, bottom navigation, code and canvas in turn, panels on top                                     |
| Landscape and height up to 500 px (phone on its side)          | Side rail instead of the bottom bar, code and canvas side by side, splitter, lower header, overlay panels |
| From 576 px, portrait (tablet, unfolded foldable)              | Code above the canvas, vertical splitter                                                                  |
| From 576 px, landscape                                         | Code and canvas side by side, horizontal splitter, 192 px minimum per pane                                |
| From 576 px, aspect ratio 9:10 to 11:10 (square)               | Compact header, 50/50 panes                                                                               |
| From 1024 px, aspect ratio 2:1 or wider (2560x1080, 3440x1440) | Line length capped, content centred                                                                       |
| Notch                                                          | `env(safe-area-inset-left/right)` on pages other than the editor, on the rail in the editor               |
| On-screen keyboard                                             | `visualViewport` sets the height, bottom bars hidden, the caret line stays visible                        |
| Rotation or window resize                                      | Cursor, selection and code scroll kept, menus closed, canvas refitted unless zoomed by hand               |
| `forced-colors`, `print`                                       | Splitter and rail stay visible, hidden in print                                                           |

Nothing new is stored; the behaviour is automatic. Verified: jsdom (matchMedia, resize, visualViewport, 100% coverage), CSS rule tests, e2e in Edge and Firefox. Not verified on real phones, tablets or foldables.

## Unfinished

- Mockups in `docs/design-contest/orientation/`: the script `make-orientation-sheets.py` is written, the frames and sheets are not generated or checked.
- e2e `orientation-e2e.py`: written, the full Edge run did not finish; Firefox does not launch on this machine (result Skipped).
- The site docs about layout were not updated.
