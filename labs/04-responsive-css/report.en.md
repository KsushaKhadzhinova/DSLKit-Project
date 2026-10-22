# Laboratory Work No. 4. Building a Responsive Layout with CSS

## 1 Purpose of the Work

To master modern CSS techniques for responsive layouts: Flexbox, CSS Grid, media queries, CSS variables and the BEM methodology. The skills are practised on the DSLKit project, a web editor for diagrams as code that belongs to the SaaS direction and matches the future course project.

## 2 Brief Theoretical Background

**Responsive layout.** A page adapts to the screen width without separate versions for each device. Fluid grids, relative units and media queries form the basis.

**Mobile first.** Base styles describe a phone, and extra rules for wider screens are added in `min-width` queries. The approach is easier to maintain because the mobile version is never overridden by desktop rules.

**Flexbox and CSS Grid.** Flexbox aligns items in one direction: headers, footers and rows of buttons. Grid describes a two-dimensional layout: columns of cards, a layout with a sidebar and the page structure.

**Media queries.** `@media` rules switch styles on when a condition holds: window width, pointer type or the preference for reduced motion.

**BEM.** The methodology splits an interface into blocks, elements and modifiers: `card`, `card__title`, `button--primary`. Class names describe the purpose, not the look.

**CSS variables.** Custom properties `--name` keep colours, fonts and spacing in one place, and a theme is switched by replacing values.

## 3 Work Progress

### 3.1 Choosing the Layout and Matching the Topic

The project layouts are prepared in Figma and as SVG files: prototypes of the home page for three widths, a moodboard, a palette and typography are in `site/design/figma`, and the application screens are in `docs/project/figma-svg`. The link to the Figma file is stored in `site/design/figma-link.txt`. The topic belongs to the SaaS direction: a landing page of the service with the Free and Pro plans, a FAQ and a waiting list, and the screens of the application itself.

The layout analysis gave this structure: a header with a logo, navigation and actions, a hero block with a product example, card sections, pricing, a FAQ, a form and a footer. The palette is built on the blue primary colour `#2563eb` with neutral tones and a green accent, and the typography uses Inter and JetBrains Mono. The grid follows the golden ratio: the hero and pricing columns relate as 1 to 1.618, and font sizes grow by the square root of the golden ratio.

### 3.2 Organising the CSS Files

Styles are split by purpose. The main file `style.css` only imports the others in cascade order, as table 1 shows.

Table 1 – Style files of the DSLKit project

| File | Purpose |
|---|---|
| `variables.css` | Colours, fonts, the size scale, spacing, widths and breakpoints |
| `base.css` | Margin reset, `box-sizing`, base font, focus, utility classes |
| `components.css` | Buttons, cards, steps, pricing, FAQ, form |
| `header.css` | Header, logo, navigation, burger menu, theme switch |
| `main.css` | Hero block and page sections |
| `footer.css` | Footer |
| `pages.css` | Error pages and the privacy policy |
| `app.css` | Application shell, dashboard, settings, welcome screen |
| `editor.css` | Editor screen |
| `adaptive.css` | Mobile-first media queries for the public pages |

### 3.3 CSS Variables

The file `variables.css` defines colours of the light and dark themes, font families, the text size scale, spacing, radii, shadows and the container width. The names required by the assignment (`--font-family-main`, `--font-size-base`, `--spacing-small`, `--container-max-width`, `--breakpoint-mobile` and others) are aliases of the project scales. Spacing of 8, 16, 24, 40, 64 and 104 pixels corresponds to Fibonacci numbers multiplied by 8, so the 8 pixel grid agrees with the golden ratio.

### 3.4 Base Styles

The file `base.css` resets margins, sets `box-sizing: border-box`, the font, the text colour and the line height. The line height is 1.618 for body text and 1.15 for headings. Every interactive element has a visible focus ring, the `visually-hidden` class hides text visually only, and the `prefers-reduced-motion` rule turns animation off for users who are bothered by it.

### 3.5 Header and Burger Menu

The header is fixed with `position: sticky`. On screens narrower than 768 pixels the navigation is hidden, and the Menu button opens it without JavaScript: the hidden checkbox `burger__input` is a sibling of the label and the list, so the rule `.burger__input:checked ~ .nav` shows the menu. The checkbox stays reachable by keyboard and the focus is drawn on the label. From 768 pixels the burger disappears and the navigation becomes a horizontal Flexbox menu.

### 3.6 Flexbox and Grid Layouts

Flexbox is used in the header, the footer, rows of buttons and captions. Grid builds the hero block (two columns, 1 to 1.618), the card grid, pricing, steps and the application shell with a 224 pixel sidebar. The editor screen uses the named areas `toolbar`, `activity`, `sidebar`, `main`, `problems` and `status`.

### 3.7 Responsiveness

Three states are implemented with the mobile-first approach and listed in table 2.

Table 2 – Breakpoints and page behaviour

| Width | State | Behaviour |
|---|---|---|
| below 576 pixels | Phone (base styles) | One column of cards, burger menu, full-width buttons |
| from 576 pixels | Large phone and tablet | Two columns of cards |
| from 768 pixels | Tablet | Horizontal menu, three facts in a row, form with larger padding |
| from 1024 pixels | Desktop | Three columns of cards, hero and pricing in the golden ratio, theme switch |

The mobile version of the page is shown in figure 1.

![Home page at 375 pixels](figures/mobile-375.jpg)

Figure 1 – The DSLKit home page on a 375 pixel screen

The tablet version with the horizontal menu is shown in figure 2.

![Home page at 768 pixels](figures/tablet-768.jpg)

Figure 2 – The DSLKit home page on a 768 pixel screen

The desktop version is shown in figure 3.

![Home page at 1280 pixels](figures/desktop-1280.jpg)

Figure 3 – The DSLKit home page on a 1280 pixel screen

### 3.8 Dark Theme

The dark theme switches without JavaScript: the rule `:root:has(.theme__input:checked)` replaces the values of the colour variables. The contrast of every text and background pair is checked by an automated test for both themes and meets level AA of WCAG 2.2.

### 3.9 Cross-Browser Compatibility

Flexbox and Grid are supported by all modern browsers. Every `color-mix()` declaration is preceded by a fallback value, so a browser without the function uses a plain colour. The `-webkit-` prefix is added for `backdrop-filter`. Autoprefixer is not connected because the project targets current browser versions.

### 3.10 Verification and Testing

Automated checks are collected in the tests of `labs/04-responsive-css`. They confirm that every class used in the HTML has a rule in the styles, that the tokens follow the golden ratio, that spacing is a multiple of 8 pixels and forms a Fibonacci series, that colours pass AA contrast in the light and dark themes, that no colours live outside the variables file, that no font is smaller than 12 pixels, and that only `min-width` queries and the breakpoints 576, 768 and 1024 are used.

All style files passed the W3C CSS validator without errors, and the HTML pages passed the W3C Nu validator. The geometry of all page elements was compared before and after the move to mobile first at the widths 500, 800 and 1440 pixels, and no differences appeared. Visual inspection in Chrome at 375, 768 and 1280 pixels showed a correct layout. Testing in Firefox, Edge and Safari on real devices has not been done and remains a task for the acceptance stage.

### 3.11 Committing the Changes

The work is done in the branch `feature/responsive-layout`. The commit with the implementation: https://github.com/KsushaKhadzhinova/DSLKit-Project/commit/eb70a59. The commit message: `feat: implement responsive layout according to Figma design`.

## Conclusion

The styles of the DSLKit project are split into files following the BEM methodology and built mobile first. Three page states, a burger menu without JavaScript, Flexbox and Grid layouts, CSS variables and a dark theme are implemented. The golden ratio is built into the size scale, the spacing and the columns, and automated tests prevent any drift from it. What remains is to check the page in Firefox, Edge and Safari on real devices.

## Appendix A – Listing of variables.css

```css
/* Design tokens. Light theme first, dark theme overrides the colour tokens.
   The golden ratio is the base of the scales: type steps grow by √φ and φ,
   spacing follows the Fibonacci numbers multiplied by 8 px (8, 16, 24, 40, 64, 104). */
:root {
  --phi: 1.618;
  --phi-inverse: 0.618;
  --phi-root: 1.272;

  --color-primary: #2563eb;
  --color-on-primary: #ffffff;
  --color-primary-text: #1d4ed8;
  --color-diagram-paper: #ffffff;
  --color-secondary: #e8efff;
  --color-accent: #16a34a;
  --color-accent-text: #15803d;
  --color-background: #f8f9fc;
  --color-surface: #ffffff;
  --color-border: #dde1e9;
  --color-border-strong: #868ea3;
  --color-text: #1c1f2e;
  --color-text-light: #4a5068;
  --color-muted: #5f6679;
  --color-link: #1d4ed8;
  --color-error: #c81e1e;
  --color-warning: #b45309;
  --color-code-background: #14151f;
  --color-code-text: #cdd6f4;
  --color-glow: rgb(37 99 235 / 0.16);
  --shadow-small: 0 1px 2px rgb(28 31 46 / 0.06), 0 1px 3px rgb(28 31 46 / 0.1);
  --shadow-large: 0 8px 24px rgb(28 31 46 / 0.08), 0 24px 64px rgb(28 31 46 / 0.12);

  --font-sans: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, 'Cascadia Code', Consolas, 'Courier New', monospace;

  --step--1: calc(1rem / var(--phi-root));
  --step-0: 1rem;
  --step-1: calc(1rem * var(--phi-root));
  --step-2: calc(1rem * var(--phi));
  --step-3: calc(1rem * var(--phi) * var(--phi-root));
  --step-4: calc(1rem * var(--phi) * var(--phi));
  --step-5: calc(1rem * var(--phi) * var(--phi) * var(--phi-root));
  --step-6: calc(1rem * var(--phi) * var(--phi) * var(--phi));

  --columns-golden: 1fr 1.618fr;
  --columns-golden-reverse: 1.618fr 1fr;

  /* Smallest readable text: the golden step, but never below 14 px (WCAG and the interface rules). */
  --text-small: max(var(--step--1), 0.875rem, 14px);
  --line-body: var(--phi);
  --line-heading: 1.15;

  --space-1: 0.5rem;
  --space-2: 1rem;
  --space-3: 1.5rem;
  --space-4: 2.5rem;
  --space-5: 4rem;
  --space-6: 6.5rem;

  --radius-small: 0.5rem;
  --radius-medium: 1rem;
  --radius-large: 1.5rem;

  --container: 1200px;
  --measure: 62ch;
  --header-height: 4rem;
  --target-size: max(3rem, 48px);
  --target-size-small: max(2.75rem, 44px);
  --focus-ring: 0 0 0 3px var(--color-background), 0 0 0 5px var(--color-primary);

  --breakpoint-small: 576px;
  --breakpoint-medium: 768px;
  --breakpoint-large: 1024px;

  /* Names required by the lab assignment; they alias the golden-ratio scales above. */
  --font-family-main: var(--font-sans);
  --font-size-base: 1rem;
  --font-size-h1: var(--step-5);
  --font-size-h2: var(--step-4);
  --spacing-small: var(--space-1);
  --spacing-medium: var(--space-2);
  --spacing-large: var(--space-3);
  --spacing-xlarge: var(--space-4);
  --container-max-width: var(--container);
  --breakpoint-mobile: 576px;
  --breakpoint-tablet: 768px;
  --breakpoint-desktop: 1024px;
}

/* Dark theme: the checkbox in the header switches it without JavaScript. */
:root:has(.theme__input:checked),
:root[data-theme='dark'] {
  --color-primary: #2563eb;
  --color-secondary: #27304d;
  --color-accent: #22c55e;
  --color-accent-text: #4ade80;
  --color-background: #1e1e2e;
  --color-surface: #181825;
  --color-border: #313244;
  --color-border-strong: #6c7086;
  --color-text: #cdd6f4;
  --color-text-light: #a6adc8;
  --color-muted: #9399b2;
  --color-link: #8bb0ff;
  --color-error: #f38ba8;
  --color-warning: #fab387;
  --color-code-background: #11111b;
  --color-glow: rgb(139 176 255 / 0.14);
  --shadow-small: 0 1px 2px rgb(0 0 0 / 0.3);
  --shadow-large: 0 8px 24px rgb(0 0 0 / 0.35), 0 24px 64px rgb(0 0 0 / 0.4);
  color-scheme: dark;
}

/* Without JavaScript the system preference decides, unless the page was told to stay light. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    --color-primary: #2563eb;
    --color-secondary: #27304d;
    --color-accent: #22c55e;
    --color-accent-text: #4ade80;
    --color-background: #1e1e2e;
    --color-surface: #181825;
    --color-border: #313244;
    --color-border-strong: #6c7086;
    --color-text: #cdd6f4;
    --color-text-light: #a6adc8;
    --color-muted: #9399b2;
    --color-link: #8bb0ff;
    --color-error: #f38ba8;
    --color-warning: #fab387;
    --color-code-background: #11111b;
    --color-glow: rgb(139 176 255 / 0.14);
    --shadow-small: 0 1px 2px rgb(0 0 0 / 0.3);
    --shadow-large: 0 8px 24px rgb(0 0 0 / 0.35), 0 24px 64px rgb(0 0 0 / 0.4);
    color-scheme: dark;
  }
}
```

## Appendix B – Listing of base.css

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  /* Fluid root size: 15 px on a phone, about 17 px at 1280 px, 18 px at the largest screens. Every rem value follows it, so type, spacing and controls grow together. */
  font-size: clamp(0.9375rem, 0.875rem + 0.25vw, 1.125rem);
  overflow-x: clip;
  scroll-padding-top: calc(var(--header-height) + var(--space-2));
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body {
  margin: 0;
  background: var(--color-background);
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: var(--step-0);
  line-height: var(--line-body);
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

h1,
h2,
h3,
h4,
p,
ul,
ol,
figure,
dl,
dd,
blockquote,
fieldset {
  margin: 0;
}

ul,
ol {
  padding: 0;
  list-style: none;
}

h1,
h2,
h3,
h4 {
  overflow-wrap: break-word;
  hyphens: auto;
  line-height: var(--line-heading);
  letter-spacing: -0.02em;
  text-wrap: balance;
}

p {
  text-wrap: pretty;
}

img,
svg {
  display: block;
  max-width: 100%;
}

a {
  color: var(--color-link);
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
}

a:hover {
  text-decoration-thickness: 2px;
}

button,
input,
select,
textarea {
  font: inherit;
  color: inherit;
}

button {
  cursor: pointer;
}

address {
  font-style: normal;
}

small {
  font-size: var(--text-small);
}

code,
kbd,
pre {
  font-family: var(--font-mono);
  font-size: var(--text-small);
  font-feature-settings: 'zero';
}

kbd {
  padding: 0.125rem 0.375rem;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-small);
  background: var(--color-surface);
  color: var(--color-text-light);
  font-size: var(--text-small);
  line-height: 1.2;
}

progress {
  accent-color: var(--color-primary);
}

summary {
  cursor: pointer;
}

dialog {
  color: var(--color-text);
}

time {
  white-space: nowrap;
}

[hidden] {
  display: none !important;
}

::selection {
  background: var(--color-secondary);
  color: var(--color-text);
}

:focus-visible {
  outline: 2px solid transparent;
  box-shadow: var(--focus-ring);
  border-radius: var(--radius-small);
}

/* Utilities shared by every page */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

.skip-link {
  position: fixed;
  top: var(--space-1);
  left: var(--space-1);
  z-index: 1000;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-small);
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-weight: 600;
  transform: translateY(-200%);
}

.skip-link:focus {
  transform: translateY(0);
}

.icon {
  flex: none;
  width: 1.25rem;
  height: 1.25rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem var(--space-1);
  border-radius: 62.4375rem;
  background: var(--color-secondary);
  color: var(--color-link);
  font-size: var(--text-small);
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}

.link {
  color: var(--color-link);
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}

@media (prefers-reduced-motion: no-preference) {
  html {
    scroll-behavior: smooth;
  }
}

/* Elements that have no class of their own still get explicit rules. */
option {
  background: var(--color-surface);
  color: var(--color-text);
}

span {
  font: inherit;
}

button > span,
a > span,
label > span {
  line-height: inherit;
}

.file-tree > li,
.templates > li,
.canvas__history > li {
  margin: 0;
  list-style: none;
}

.icon path,
.icon g,
.icon circle,
.icon rect,
.icon line {
  stroke-linecap: round;
  stroke-linejoin: round;
}
```

## Appendix C – Listing of header.css

```css
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  background: color-mix(in srgb, var(--color-surface) 82%, transparent);
  -webkit-backdrop-filter: saturate(1.4) blur(14px);
  backdrop-filter: saturate(1.4) blur(14px);
}

.header__inner {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  max-width: calc(var(--container) + var(--space-3) * 2);
  padding-inline: var(--space-3);
  min-height: var(--header-height);
  margin-inline: auto;
}

.header__logo {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-text);
  font-size: var(--step-1);
  font-weight: 700;
  letter-spacing: -0.02em;
  text-decoration: none;
}

.header__logo-image {
  width: 2rem;
  height: 2rem;
}

.header__logo-text {
  line-height: 1;
}

/* Burger: a visually hidden checkbox keeps keyboard access */
.burger__input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  opacity: 0;
  clip-path: inset(50%);
}

.burger__button {
  display: inline-flex;
  grid-column: 3;
  grid-row: 1;
  align-items: center;
  gap: var(--space-1);
  min-height: var(--target-size);
  padding: 0 var(--space-2);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-small);
  cursor: pointer;
  font-weight: 600;
}

.burger__input:focus-visible + .burger__button {
  outline: 2px solid transparent;
  box-shadow: var(--focus-ring);
}

.burger__icon,
.burger__icon::before,
.burger__icon::after {
  display: block;
  width: 1.125rem;
  height: 0.125rem;
  border-radius: 0.125rem;
  background: currentColor;
  transition: transform 200ms ease;
}

.burger__icon {
  position: relative;
}

.burger__icon::before,
.burger__icon::after {
  content: '';
  position: absolute;
  left: 0;
}

.burger__icon::before {
  top: -6px;
}

.burger__icon::after {
  top: 0.375rem;
}

.burger__input:checked + .burger__button .burger__icon {
  background: transparent;
}

.burger__input:checked + .burger__button .burger__icon::before {
  top: 0;
  transform: rotate(45deg);
}

.burger__input:checked + .burger__button .burger__icon::after {
  top: 0;
  transform: rotate(-45deg);
}

.burger__label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  line-height: 1;
}

/* Navigation: a collapsed panel on small screens, a row from 1024 px */
.nav {
  display: none;
  grid-column: 1 / -1;
  grid-row: 2;
  padding-bottom: var(--space-2);
}

.burger__input:checked ~ .nav {
  display: block;
}

.nav__list {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-1);
}

.nav__link {
  display: inline-flex;
  align-items: center;
  min-height: var(--target-size);
  padding: 0 var(--space-2);
  border-radius: var(--radius-small);
  color: var(--color-text-light);
  font-size: var(--step-0);
  font-weight: 600;
  text-decoration: none;
  transition:
    background-color 160ms ease,
    color 160ms ease;
}

.nav__link:hover {
  background: var(--color-secondary);
  color: var(--color-text);
}

.header__tools {
  display: flex;
  grid-column: 2;
  grid-row: 1;
  align-items: center;
  gap: var(--space-1);
}

.header__lang {
  display: none;
  align-items: center;
  min-height: var(--target-size-small);
  padding: 0 var(--space-1);
  color: var(--color-text-light);
  font-size: var(--text-small);
  font-weight: 600;
  text-decoration: none;
}

.header__lang:hover {
  color: var(--color-text);
}

.theme__input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  opacity: 0;
  clip-path: inset(50%);
}

.theme__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--target-size);
  height: var(--target-size);
  padding: 0;
  border: 1px solid var(--color-border-strong);
  border-radius: 62.4375rem;
  color: var(--color-text-light);
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  transition:
    background-color 160ms ease,
    color 160ms ease;
}

.theme__button:hover {
  background: var(--color-secondary);
  color: var(--color-text);
}

.theme__input:focus-visible + .theme__button {
  outline: 2px solid transparent;
  box-shadow: var(--focus-ring);
}

.theme__input:checked + .theme__button {
  background: var(--color-secondary);
  color: var(--color-text);
}

.theme__icon {
  flex: none;
}

.theme__label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.theme__icon--sun,
.theme__input:checked + .theme__button .theme__icon--moon {
  display: none;
}

.theme__input:checked + .theme__button .theme__icon--sun {
  display: block;
}

.header__cta {
  display: none;
  min-height: var(--target-size-small);
  padding: 0 var(--space-2);
  font-size: var(--text-small);
}
```

## Appendix D – Listing of main.css

```css
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  overflow-x: clip;
}

.main {
  flex: 1;
  width: 100%;
  max-width: calc(var(--container) + var(--space-3) * 2);
  padding-inline: var(--space-3);
  margin-inline: auto;
}

/* Hero: text and product window are split by the golden ratio (1 : 1.618) */
.hero {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: 1fr;
  align-items: center;
  gap: var(--space-4);
  padding-block: var(--space-5) var(--space-4);
}

.hero::before {
  content: '';
  position: absolute;
  inset: 0 -50vw;
  z-index: -1;
  background:
    radial-gradient(ellipse 55% 70% at 78% 18%, var(--color-glow), transparent 70%),
    radial-gradient(ellipse 40% 50% at 8% 0%, var(--color-glow), transparent 70%), radial-gradient(circle, var(--color-border) 1.4px, transparent 1.6px);
  background-size:
    auto,
    auto,
    24px 24px;
}

.hero__content {
  display: grid;
  justify-items: start;
  gap: var(--space-3);
}

.hero__badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0.25rem var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: 62.4375rem;
  background: var(--color-surface);
  color: var(--color-text-light);
  font-size: var(--text-small);
  font-weight: 600;
}

.hero__badge::before {
  content: '';
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--color-accent);
  box-shadow: 0 0 0 4px var(--color-glow);
}

.hero__title {
  font-size: clamp(var(--step-3), 1rem + 3.2vw, var(--step-5));
  font-weight: 800;
  letter-spacing: -0.035em;
}

.hero__lead {
  max-width: var(--measure);
  color: var(--color-text-light);
  font-size: var(--step-1);
}

.hero__cta {
  display: grid;
  gap: var(--space-2);
  justify-items: start;
}

.hero__cta-note {
  margin: 0;
  color: var(--color-text-light);
  font-size: var(--text-small);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.hero__actions .button {
  flex: 1 1 100%;
}

.hero__note {
  color: var(--color-muted);
  font-size: var(--text-small);
}

.hero__facts {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);
  width: 100%;
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.hero__fact {
  display: grid;
  gap: 0.25rem;
}

.hero__fact-value {
  color: var(--color-link);
  font-size: var(--step-4);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
}

.hero__fact-label {
  color: var(--color-text-light);
  font-size: var(--text-small);
}

.hero__figure {
  display: grid;
  gap: var(--space-2);
}

.hero__image {
  width: 100%;
  height: auto;
  aspect-ratio: 1.618;
  border-radius: var(--radius-medium);
  box-shadow: var(--shadow-large);
}

.hero__caption {
  color: var(--color-muted);
  font-size: var(--text-small);
  text-align: center;
}

/* Sections */
.section {
  padding-block: var(--space-4);
}

.section__title {
  margin-bottom: var(--space-2);
  font-size: var(--step-4);
  font-weight: 800;
  letter-spacing: -0.03em;
}

.section__lead {
  max-width: var(--measure);
  margin-bottom: var(--space-4);
  color: var(--color-text-light);
  font-size: var(--step-1);
}

.section > .cards,
.section > .steps,
.section > .plans {
  margin-top: var(--space-4);
}

.section > .section__lead + .cards {
  margin-top: 0;
}
```

## Appendix E – Listing of footer.css

```css
.footer {
  margin-top: var(--space-6);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
}

.footer__inner {
  display: grid;
  gap: var(--space-3);
  width: 100%;
  max-width: calc(var(--container) + var(--space-3) * 2);
  padding-inline: var(--space-3);
  margin-inline: auto;
  padding-block: var(--space-5);
}

.footer__list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-3);
}

.footer__link {
  display: inline-flex;
  align-items: center;
  min-height: 1.5rem;
  color: var(--color-text-light);
  text-decoration: none;
}

.footer__link:hover {
  color: var(--color-link);
  text-decoration: underline;
}

.footer__address,
.footer__copy {
  color: var(--color-muted);
  font-size: var(--text-small);
}
```

## Appendix F – Listing of adaptive.css

```css
/* Mobile first: the base styles describe a phone, wider screens add to them.
   Breakpoints: 576, 768 and 1024 px. */
@media (min-width: 576px) {
  .hero__actions .button {
    flex: 0 0 auto;
  }

  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 576px) {
  .burger__label {
    position: static;
    width: auto;
    height: auto;
    overflow: visible;
    clip-path: none;
  }
}

@media (min-width: 768px) {
  .header__lang,
  .header__cta {
    display: inline-flex;
  }

  .header__inner {
    grid-template-columns: auto 1fr auto;
  }

  .burger__input,
  .burger__button {
    display: none;
  }

  .header__tools {
    grid-column: auto;
    grid-row: auto;
  }

  .nav {
    display: block;
    grid-column: auto;
    grid-row: auto;
    padding-bottom: 0;
  }

  .nav__list {
    flex-flow: row wrap;
    gap: 0;
    justify-content: center;
    align-items: center;
  }

  .nav__link {
    min-height: var(--target-size-small);
    padding: 0 var(--space-1);
    font-size: var(--text-small);
  }

  .hero__facts {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .section {
    padding-block: var(--space-5);
  }

  .form {
    padding: var(--space-4);
  }

  .form__submit {
    justify-self: start;
  }
}

@media (min-width: 1024px) {
  .header__inner {
    gap: var(--space-3);
  }

  .nav__list {
    gap: var(--space-1);
  }

  .nav__link {
    padding: 0 var(--space-2);
  }

  .hero {
    grid-template-columns: var(--columns-golden);
    gap: var(--space-5);
    padding-block: var(--space-6) var(--space-5);
  }

  .plans {
    grid-template-columns: var(--columns-golden);
  }

  .cards {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

/* Touch targets: every control is at least 44 x 44 px (WCAG 2.5.8 asks 24 px, the interface rules of the project ask 44 px). */
.header__logo,
.nav__link,
.footer__link,
.card__link,
.template-card__link,
.project-card__link,
.app-topbar__logo,
.editor-toolbar__logo,
.canvas__engine-link,
.problems__location {
  display: inline-flex;
  align-items: center;
  min-height: var(--target-size-small);
}

.filter__chip,
.app-topbar__new,
.app-topbar__search-input,
.sort__select,
.settings-row__select,
.editor-tabs__tab,
.problems__tab,
.editor-segmented__button,
.canvas__history-item,
.button {
  min-height: var(--target-size-small);
}

.app-topbar__avatar,
.app-topbar__search-button,
.project-card__menu,
.editor-activity__button,
.editor-tabs__close,
.button--icon {
  min-width: var(--target-size-small);
  min-height: var(--target-size-small);
}

.form__checkbox {
  width: 1.5rem;
  height: 1.5rem;
}

.app-topbar__logo {
  min-width: var(--target-size-small);
  justify-content: center;
}

.problems__location {
  align-self: center;
  min-width: var(--target-size-small);
  justify-content: center;
}

.template-card__link {
  min-width: var(--target-size-small);
}
```

## Appendix G – Listing of style.css

```css
@import url('variables.css');
@import url('base.css');
@import url('components.css');
@import url('header.css');
@import url('main.css');
@import url('footer.css');
@import url('pages.css');
@import url('app.css');
@import url('editor.css');
@import url('adaptive.css');
```
