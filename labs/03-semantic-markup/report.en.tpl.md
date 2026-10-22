# Laboratory Work No. 3. Creating Semantic HTML Markup

## 1 Purpose of the Work

To master the principles of semantic HTML markup, the basics of web accessibility and Schema.org microdata, and to build valid structured markup for the DSLKit project, a web editor for diagrams as code that belongs to the SaaS direction and matches the future course project.

## 2 Brief Theoretical Background

**Semantic markup.** Tags describe the meaning of content, not its look: `header`, `nav`, `main`, `article`, `section`, `aside`, `footer`. Search engines, screen readers and developers understand such a structure, and styles are added separately.

**Heading hierarchy.** A page has one first-level heading and the other levels are nested without gaps. Screen readers build a table of contents from headings, and search engines infer the topic of sections from them.

**Accessibility basics.** Every image gets a text alternative `alt`, decorative images get an empty value, links have meaningful text, form fields are tied to labels, and a skip link lets a user jump straight to the main content.

**Schema.org microdata.** The attributes `itemscope`, `itemtype` and `itemprop` describe an object and its properties with the Schema.org vocabulary. Search engines use the data for rich search results.

**Validation.** The W3C validator reports syntax and content model violations. Valid markup is processed identically by different browsers.

## 3 Work Progress

### 3.1 Choosing and Analysing the Layout

The layout is prepared in Figma and saved as SVG files in `site/design/figma`. The link to the file is stored in `site/design/figma-link.txt`, and colours and fonts are written to `site/design/design-tokens.txt`. The layout matches the SaaS topic: the home page of a service with a product example, notations, pricing, a FAQ and a beta waiting list form.

The analysis found these semantic blocks: a header with a logo, navigation and actions, a hero block with a product image, the sections Notations, How it works, Who it is for, Pricing and FAQ, the signup form and a footer. Images are exported to `site/images`.

### 3.2 Document Structure

The page `site/index.html` starts with a skip link that leads to the `main` element with the identifier `main`, followed by `header`, `main` and `footer`. The English version `site/en/index.html` has the same structure, a language switch and `hreflang` attributes. Pages for the status codes 400, 403, 404, 405 and 500 are in `site/errors`, and the pages `thanks.html` and `privacy.html` serve the waiting list.

### 3.3 Semantic Tags

The home page uses 15 different semantic tags listed in table 1. The assignment required at least eight.

Table 1 – Semantic tags of the home page

| Tag | Purpose | Example on the page |
|---|---|---|
| `header` | Site header | Logo, navigation, actions |
| `nav` | Navigation block | Main and footer menus |
| `main` | Main content | All sections of the page |
| `section` | Thematic section with a heading | Notations, Pricing |
| `article` | Self-contained block | Notation card, pricing plan |
| `aside` | Secondary information | Note about pricing |
| `footer` | Footer | Links and contacts |
| `figure`, `figcaption` | Illustration with a caption | Editor image |
| `time` | Machine-readable date | Pricing update date |
| `address` | Contact information | Email address |
| `details`, `summary` | Collapsible block | FAQ |
| `fieldset`, `legend` | Group of form fields | Contacts, Your project |

### 3.4 Heading Hierarchy

Every page has one first-level heading. On the home page it reads "Write code, get a diagram", sections get second-level headings, and cards and steps get third-level headings. No level is skipped, and an automated test confirms it for all 16 pages of the site.

### 3.5 Accessibility

All images have an `alt` attribute: the editor image has a full-sentence description and the decorative notation icons have an empty value. Link texts are meaningful, for example "Join the beta: UML". Every form field is tied to a caption with `label` and `for`, field groups use `fieldset` and `legend`, and hints are connected with `aria-describedby`. Icon buttons have text names in `aria-label`. A skip link exists on every page and leads to an existing `main` element.

### 3.6 BEM

Classes follow the BEM methodology: the block `card`, the element `card__title` and the modifier `button--primary`. A test confirms that all class names on all pages match the block, element, modifier scheme in lowercase with hyphens.

### 3.7 Schema.org Microdata

The type `SoftwareApplication` is chosen because the page describes a software product. The markup uses the properties in table 2.

Table 2 – Schema.org microdata of the home page

| Type | Properties |
|---|---|
| `SoftwareApplication` | `name`, `applicationCategory`, `operatingSystem`, `url`, `description`, `image`, `offers` |
| `Offer` | `price`, `priceCurrency`, `availability`, `url` |
| `FAQPage` | `mainEntity` |
| `Question` | `name`, `acceptedAnswer` |
| `Answer` | `text` |

Reviews and ratings are not added because there are no real reviews yet and inventing them is unacceptable. For that reason the Google rich result for software applications is not available.

### 3.8 Validity Check

The page is checked with the W3C Nu Html Checker. The result is shown in figure 1: there are no errors or warnings. The code was submitted to the validator without indentation, which does not change the content.

![Result of checking the home page in the W3C validator](figures/w3c-validator.jpg)

Figure 1 – Result of the W3C Nu Html Checker: no errors or warnings

All 15 pages of the site passed the same service with zero errors and warnings. Only informational messages about the slash in void elements remain, and they do not affect the pages.

### 3.9 Microdata Check

The Schema.org validator checks the microdata. The result is shown in figure 2: the objects SoftwareApplication and FAQPage are found without errors or warnings. The Google Rich Results Test needs a public page address, and the domain `dslkit.io` is not bought yet, so the check in that tool is not done and remains a task after publication.

![Result of checking the microdata in the Schema.org validator](figures/schema-org-validator.jpg)

Figure 2 – Result of the microdata check: SoftwareApplication and FAQPage without errors

### 3.10 Automated Tests

Tests for the markup check on all pages: the language, title and meta tags, one first-level heading without gaps, `alt` attributes, the skip link, unique identifiers, intact anchors and element references, field labels, meaningful link texts, BEM class names, required microdata properties, parity of the Russian and English versions, `hreflang` and `canonical` attributes, the sitemap and the `robots.txt` file. Coverage of the checking code is 100 percent.

### 3.11 Project Structure

Project files live in `site` (pages, styles, scripts, images, layouts), `labs` (laboratory works) and `tools` (utilities). The application pages for the next works are in `site/app`.

### 3.12 Committing the Changes

The work is done in the branch `feature/semantic-markup`. The commit: https://github.com/KsushaKhadzhinova/DSLKit-Project/commit/a2b85e0. The commit message: `feat: add semantic HTML markup with Schema.org for a SaaS diagram editor`.

## Conclusion

Semantic markup is created for the DSLKit home page and the related pages: Russian and English versions, error pages, the privacy policy and the signup confirmation. The pages use 15 semantic tags, keep the heading hierarchy and accessibility requirements, and carry SoftwareApplication, Offer and FAQPage microdata. The W3C and Schema.org validators found no errors, and automated tests check the markup on every page. The Rich Results Test is postponed until the site is published.

## Appendix A – Listing of index.html

{{code:site/index.html}}

## Appendix B – Listing of site-checks.js

{{code:labs/03-semantic-markup/site-checks.js}}

## Appendix C – Listing of site.test.js

{{code:labs/03-semantic-markup/site.test.js}}

## Appendix D – Design Tokens

{{code:site/design/design-tokens.txt}}
