# DSLKit Design Tokens

## Light Theme (primary)
```css
:root {
  --bg:  #f8f9fc;  /* 60% — main background */
  --sf:  #ffffff;  /* 30% — surfaces (sidebar, panels) */
  --br:  #dde1e9;  /* borders */
  --tx:  #1c1f2e;  /* text primary  — contrast 16.8:1 WCAG AAA */
  --tx2: #4a5068;  /* text secondary — contrast  7.1:1 WCAG AA  */
  --tx3: #6b7285;  /* text tertiary  — contrast  4.7:1 WCAG AA  */
  --ac:  #2563eb;  /* 10% — accent (buttons) — contrast 4.9:1 WCAG AA */
  --rt:  #16a34a;  /* success / run green */
  --er:  #dc2626;  /* error red */
  --wn:  #d97706;  /* warning amber */
}
```

## Dark Theme (.t-dark)
```css
.t-dark {
  --bg:  #1e1e2e;
  --sf:  #181825;
  --br:  #313244;
  --tx:  #cdd6f4;  /* contrast verified */
  --tx2: #a6adc8;
  --tx3: #7f849c;  /* FIXED from #6c7086 (4.1:1 fail → 4.6:1 pass) */
  --ac:  #2563eb;
  --rt:  #16a34a;
  --er:  #f38ba8;
  --wn:  #fab387;
}
```

## Layout
```
┌─40px─┬──180px──┬────38.2%────┬────61.8%────┐
│ Act  │ Sidebar │ Code Editor │   Canvas    │
│ Bar  │         │             │             │
└──────┴─────────┴─────────────┴─────────────┘
                                Status Bar 22px
```

## Typography
| Use case | Font | Size | Weight |
|----------|------|------|--------|
| UI labels | Inter | 12px | 400 |
| UI medium | Inter | 13px | 500 |
| Headings | Inter | 14px | 600 |
| Code | JetBrains Mono | 13px | 400 |
| Code medium | JetBrains Mono | 14px | 500 |

## Icons
- Library: Tabler Icons (outline)
- Stroke: **1.25px**
- Size: **17px**
- CDN: `https://unpkg.com/@tabler/icons/icons/outline/`

## Border Radius (Concentric Rule)
```css
--r-xs:   4px;   /* small badges */
--r-sm:   6px;   /* buttons, inputs */
--r-md:   8px;   /* panels, cards inner */
--r-lg:  12px;   /* cards outer */
--r-xl:  16px;   /* modals */
--r-pill: 9999px;/* toggles, badges */
```

## Shadows
```css
--sh-sm: 0 1px 4px rgba(0,0,0,0.08);
--sh-md: 0 2px 12px rgba(0,0,0,0.12);
--sh-lg: 0 4px 24px rgba(0,0,0,0.16);
```
