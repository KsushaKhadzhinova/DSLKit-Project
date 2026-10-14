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

{{code:site/css/variables.css}}

## Appendix B – Listing of base.css

{{code:site/css/base.css}}

## Appendix C – Listing of header.css

{{code:site/css/header.css}}

## Appendix D – Listing of main.css

{{code:site/css/main.css}}

## Appendix E – Listing of footer.css

{{code:site/css/footer.css}}

## Appendix F – Listing of adaptive.css

{{code:site/css/adaptive.css}}

## Appendix G – Listing of style.css

{{code:site/css/style.css}}
