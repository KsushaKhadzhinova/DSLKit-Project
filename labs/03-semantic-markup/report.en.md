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

```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>DSLKit: диаграммы как код. UML, BPMN, ERD, DFD, IDEF0</title>
    <meta
      name="description"
      content="DSLKit — веб-редактор диаграмм как кода. Опишите схему текстом на DSL и получите UML, BPMN, ERD, DFD, IDEF0 и сети Петри. Запишитесь в закрытую бета-версию."
    />
    <meta name="theme-color" content="#2563eb" />
    <link rel="canonical" href="https://dslkit.io/" />
    <link rel="alternate" hreflang="ru" href="https://dslkit.io/" />
    <link rel="alternate" hreflang="en" href="https://dslkit.io/en/" />
    <link rel="alternate" hreflang="x-default" href="https://dslkit.io/" />
    <link rel="icon" href="images/favicon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="css/style.css" />
  </head>
  <body class="page">
    <a class="skip-link" href="#main">Перейти к основному содержимому</a>
    <header class="header">
      <div class="header__inner">
        <a class="header__logo" href="./">
          <img class="header__logo-image" src="images/logo.svg" alt="" width="32" height="32" />
          <span class="header__logo-text">DSLKit</span>
        </a>
        <input class="burger__input" type="checkbox" id="burger-toggle" />
        <label class="burger__button" for="burger-toggle">
          <span class="burger__label">Меню</span>
          <span class="burger__icon" aria-hidden="true"></span>
        </label>
        <nav class="nav" aria-label="Основная навигация">
          <ul class="nav__list">
            <li class="nav__item"><a class="nav__link" href="#notations">Нотации</a></li>
            <li class="nav__item"><a class="nav__link" href="#how">Как это работает</a></li>
            <li class="nav__item"><a class="nav__link" href="#audience">Для кого</a></li>
            <li class="nav__item"><a class="nav__link" href="#pricing">Тарифы</a></li>
            <li class="nav__item"><a class="nav__link" href="#faq">FAQ</a></li>
          </ul>
        </nav>
        <div class="header__tools">
          <a class="header__lang" href="en/" hreflang="en" lang="en">English</a>
          <input class="theme__input" type="checkbox" id="theme-toggle" />
          <label class="theme__button" for="theme-toggle" title="Тёмная тема"
            ><svg class="theme__icon theme__icon--moon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
              <path
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
              /></svg
            ><svg class="theme__icon theme__icon--sun" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
              <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2" />
              <path
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
              /></svg
            ><span class="theme__label">Тёмная тема</span></label
          >
          <a class="button button--primary header__cta" href="#waitlist">В бету</a>
        </div>
      </div>
    </header>
    <main class="main" id="main">
      <section class="hero" aria-labelledby="hero-title" itemscope itemtype="https://schema.org/SoftwareApplication">
        <meta itemprop="name" content="DSLKit" />
        <meta itemprop="applicationCategory" content="DeveloperApplication" />
        <meta itemprop="operatingSystem" content="Web" />
        <meta itemprop="url" content="https://dslkit.io/" />
        <div class="hero__content">
          <p class="hero__badge">Скоро: закрытая бета</p>
          <h1 class="hero__title" id="hero-title">Пишите код — получайте диаграмму</h1>
          <p class="hero__lead" itemprop="description">
            Веб-редактор диаграмм как кода: опишите схему текстом на DSL, а DSLKit проверит её по правилам нотации и нарисует.
          </p>
          <div class="hero__cta">
            <a class="button button--primary button--hero" href="app/editor.html">Создать диаграмму</a>
            <p class="hero__cta-note">Откроется редактор: слева код, справа диаграмма</p>
          </div>
          <p class="hero__actions">
            <a class="button" href="#waitlist">Записаться в бету</a>
            <a class="button" href="#how">Как это работает</a>
          </p>
          <p class="hero__note" itemprop="offers" itemscope itemtype="https://schema.org/Offer">
            <meta itemprop="price" content="0" />
            <meta itemprop="priceCurrency" content="USD" />
            <link itemprop="availability" href="https://schema.org/PreOrder" />
            <link itemprop="url" href="https://dslkit.io/#waitlist" />
            Бесплатно в бета-версии: до 5 диаграмм в день.
          </p>
          <ul class="hero__facts">
            <li class="hero__fact"><strong class="hero__fact-value">6</strong> <span class="hero__fact-label">нотаций в одном редакторе</span></li>
            <li class="hero__fact"><strong class="hero__fact-value">3</strong> <span class="hero__fact-label">нотации в первой бете</span></li>
            <li class="hero__fact"><strong class="hero__fact-value">5</strong> <span class="hero__fact-label">диаграмм в день бесплатно в бете</span></li>
          </ul>
        </div>
        <figure class="hero__figure">
          <img
            class="hero__image"
            src="images/hero-diagram.svg"
            alt="Редактор DSLKit: слева код на DSL, справа диаграмма IDEF0 с блоками A0 и A1"
            width="809"
            height="500"
            itemprop="image"
          />
          <figcaption class="hero__caption">Код слева превращается в диаграмму справа</figcaption>
        </figure>
      </section>

      <section class="section" id="notations" aria-labelledby="notations-title">
        <h2 class="section__title" id="notations-title">Нотации</h2>
        <p class="section__lead">Шесть нотаций в одном редакторе. Первыми в бета-версии появятся IDEF0, DFD и ERD.</p>
        <ul class="cards" id="notations-list">
          <li class="cards__item" data-status="planned">
            <article class="card">
              <img class="card__icon" src="images/notations/uml.svg" alt="" width="48" height="48" />
              <h3 class="card__title">UML</h3>
              <p class="card__meta"><span class="badge badge--planned">в планах</span></p>
              <p class="card__text">Классы, последовательности и другие диаграммы объектной модели.</p>
              <a class="card__link" href="#waitlist">Записаться в бету: UML</a>
            </article>
          </li>
          <li class="cards__item" data-status="planned">
            <article class="card">
              <img class="card__icon" src="images/notations/bpmn.svg" alt="" width="48" height="48" />
              <h3 class="card__title">BPMN</h3>
              <p class="card__meta"><span class="badge badge--planned">в планах</span></p>
              <p class="card__text">Бизнес-процессы: события, задачи и шлюзы.</p>
              <a class="card__link" href="#waitlist">Записаться в бету: BPMN</a>
            </article>
          </li>
          <li class="cards__item" data-status="beta">
            <article class="card">
              <img class="card__icon" src="images/notations/erd.svg" alt="" width="48" height="48" />
              <h3 class="card__title">ERD</h3>
              <p class="card__meta"><span class="badge">в бете</span></p>
              <p class="card__text">Сущности и связи для проектирования баз данных.</p>
              <a class="card__link" href="#waitlist">Записаться в бету: ERD</a>
            </article>
          </li>
          <li class="cards__item" data-status="beta">
            <article class="card">
              <img class="card__icon" src="images/notations/dfd.svg" alt="" width="48" height="48" />
              <h3 class="card__title">DFD</h3>
              <p class="card__meta"><span class="badge">в бете</span></p>
              <p class="card__text">Диаграммы потоков данных: процессы, хранилища и связи между ними.</p>
              <a class="card__link" href="#waitlist">Записаться в бету: DFD</a>
            </article>
          </li>
          <li class="cards__item" data-status="beta">
            <article class="card">
              <img class="card__icon" src="images/notations/idef0.svg" alt="" width="48" height="48" />
              <h3 class="card__title">IDEF0</h3>
              <p class="card__meta"><span class="badge">в бете</span></p>
              <p class="card__text">Функциональное моделирование: блоки, входы, управление, выходы и механизмы.</p>
              <a class="card__link" href="#waitlist">Записаться в бету: IDEF0</a>
            </article>
          </li>
          <li class="cards__item" data-status="planned">
            <article class="card">
              <img class="card__icon" src="images/notations/petri.svg" alt="" width="48" height="48" />
              <h3 class="card__title">Сети Петри</h3>
              <p class="card__meta"><span class="badge badge--planned">в планах</span></p>
              <p class="card__text">Параллельные процессы: позиции, переходы и фишки.</p>
              <a class="card__link" href="#waitlist">Записаться в бету: сети Петри</a>
            </article>
          </li>
        </ul>
      </section>

      <section class="section" id="how" aria-labelledby="how-title">
        <h2 class="section__title" id="how-title">Как это работает</h2>
        <ol class="steps">
          <li class="steps__item">
            <h3 class="steps__title">Пишете код</h3>
            <p class="steps__text">Описываете диаграмму на DSL, подсказки и шаблоны помогают начать.</p>
          </li>
          <li class="steps__item">
            <h3 class="steps__title">Видите схему</h3>
            <p class="steps__text">Холст обновляется сразу, а ошибки подсвечиваются с пояснением.</p>
          </li>
          <li class="steps__item">
            <h3 class="steps__title">Экспортируете</h3>
            <p class="steps__text">Сохраняете результат в SVG, PNG, PlantUML или Mermaid.</p>
          </li>
        </ol>
      </section>

      <section class="section" id="audience" aria-labelledby="audience-title">
        <h2 class="section__title" id="audience-title">Для кого</h2>
        <ul class="cards">
          <li class="cards__item">
            <article class="card">
              <h3 class="card__title">Студентам</h3>
              <p class="card__text">Лабораторные работы, курсовые и дипломы с диаграммами, которые легко править.</p>
            </article>
          </li>
          <li class="cards__item">
            <article class="card">
              <h3 class="card__title">Разработчикам</h3>
              <p class="card__text">Схемы лежат рядом с кодом и попадают в историю Git.</p>
            </article>
          </li>
          <li class="cards__item">
            <article class="card">
              <h3 class="card__title">Аналитикам</h3>
              <p class="card__text">Процессы и данные описываются текстом без ручного рисования.</p>
            </article>
          </li>
        </ul>
      </section>

      <section class="section" id="pricing" aria-labelledby="pricing-title">
        <h2 class="section__title" id="pricing-title">Тарифы</h2>
        <div class="plans">
          <article class="plan">
            <h3 class="plan__title">Free</h3>
            <ul class="plan__list">
              <li>До 5 диаграмм в день в бета-версии</li>
              <li>Все доступные нотации</li>
              <li>Экспорт в SVG и PNG</li>
            </ul>
          </article>
          <article class="plan">
            <h3 class="plan__title">Pro</h3>
            <ul class="plan__list">
              <li>Без дневного лимита</li>
              <li>История версий</li>
              <li>Совместная работа и API</li>
            </ul>
          </article>
        </div>
        <aside class="note" aria-label="Примечание к тарифам">
          <p class="note__text">Условия тарифов могут измениться после бета-версии. Обновлено <time datetime="2026-10-11">11 октября 2026</time>.</p>
        </aside>
      </section>

      <section class="section" id="faq" aria-labelledby="faq-title" itemscope itemtype="https://schema.org/FAQPage">
        <h2 class="section__title" id="faq-title">Вопросы и ответы</h2>
        <details class="faq__item" itemprop="mainEntity" itemscope itemtype="https://schema.org/Question">
          <summary class="faq__question" itemprop="name">Что такое DSLKit?</summary>
          <div class="faq__answer" itemprop="acceptedAnswer" itemscope itemtype="https://schema.org/Answer">
            <p itemprop="text">
              DSLKit — веб-редактор диаграмм как кода. Вы описываете схему текстом на DSL, а редактор проверяет её по правилам нотации и рисует диаграмму.
            </p>
          </div>
        </details>
        <details class="faq__item" itemprop="mainEntity" itemscope itemtype="https://schema.org/Question">
          <summary class="faq__question" itemprop="name">Нужно ли уметь программировать?</summary>
          <div class="faq__answer" itemprop="acceptedAnswer" itemscope itemtype="https://schema.org/Answer">
            <p itemprop="text">
              Нет. Синтаксис короткий, а шаблоны нотаций и подсказки помогают написать первую диаграмму. Для тех, кто не пишет код, планируется режим
              редактирования кликами.
            </p>
          </div>
        </details>
        <details class="faq__item" itemprop="mainEntity" itemscope itemtype="https://schema.org/Question">
          <summary class="faq__question" itemprop="name">Какие нотации будут поддерживаться?</summary>
          <div class="faq__answer" itemprop="acceptedAnswer" itemscope itemtype="https://schema.org/Answer">
            <p itemprop="text">В планах шесть нотаций: UML, BPMN, ERD, DFD, IDEF0 и сети Петри. Первыми в бета-версии появятся IDEF0, DFD и ERD.</p>
          </div>
        </details>
        <details class="faq__item" itemprop="mainEntity" itemscope itemtype="https://schema.org/Question">
          <summary class="faq__question" itemprop="name">Сколько это стоит?</summary>
          <div class="faq__answer" itemprop="acceptedAnswer" itemscope itemtype="https://schema.org/Answer">
            <p itemprop="text">В бета-версии бесплатно, до пяти диаграмм в день. Платный тариф Pro с расширенными возможностями появится позже.</p>
          </div>
        </details>
      </section>

      <section class="section" id="waitlist" aria-labelledby="waitlist-title">
        <h2 class="section__title" id="waitlist-title">Записаться в бету</h2>
        <p class="section__lead">Оставьте контакты, и мы сообщим, когда откроется доступ. Все поля, кроме комментария, обязательны.</p>
        <form class="form" id="waitlist-form" action="#waitlist" method="get">
          <fieldset class="form__group">
            <legend class="form__legend">Контакты</legend>
            <div class="form__field">
              <label class="form__label" for="name">Имя</label>
              <input
                class="form__input"
                id="name"
                name="name"
                type="text"
                required
                minlength="2"
                maxlength="60"
                pattern="\p{L}[\p{L}' ’\-]{1,59}"
                autocomplete="name"
                aria-describedby="name-hint"
              />
              <p class="form__hint" id="name-hint">От 2 до 60 букв. Допустимы пробел, дефис и апостроф.</p>
              <p class="form__error" role="alert" id="name-error" hidden>
                Имя не принято: поле пустое, короче двух символов или содержит цифры и знаки. Введите от 2 до 60 букв, например «Ксения».
              </p>
            </div>
            <div class="form__field">
              <label class="form__label" for="email">Электронная почта</label>
              <input class="form__input" id="email" name="email" type="email" required maxlength="120" autocomplete="email" aria-describedby="email-hint" />
              <p class="form__hint" id="email-hint">Адрес вида name@example.com. На него придёт приглашение.</p>
              <p class="form__error" role="alert" id="email-error" hidden>
                Адрес не принят: он пустой или не похож на электронную почту. Проверьте, что есть символ «@» и домен после него.
              </p>
            </div>
          </fieldset>
          <fieldset class="form__group">
            <legend class="form__legend">Ваш проект</legend>
            <div class="form__field">
              <label class="form__label" for="notation">Нотация</label>
              <select class="form__input" id="notation" name="notation" required>
                <option value="" selected disabled>Выберите нотацию</option>
                <option value="idef0">IDEF0</option>
                <option value="dfd">DFD</option>
                <option value="erd">ERD</option>
                <option value="bpmn">BPMN</option>
                <option value="uml">UML</option>
                <option value="petri">Сети Петри</option>
              </select>
              <p class="form__error" role="alert" id="notation-error" hidden>Нотация не выбрана. Выберите одну из шести нотаций в списке.</p>
            </div>
            <div class="form__field">
              <label class="form__label" for="team">Размер команды</label>
              <input
                class="form__input"
                id="team"
                name="team"
                type="number"
                required
                min="0"
                max="500"
                step="1"
                inputmode="numeric"
                value="0"
                aria-describedby="team-hint"
              />
              <p class="form__hint" id="team-hint">Целое число от 0 до 500. Укажите 0, если работаете один.</p>
              <p class="form__error" role="alert" id="team-error" hidden>
                Число не принято: допустимы целые значения от 0 до 500, отрицательные числа и дроби запрещены.
              </p>
            </div>
            <div class="form__field">
              <label class="form__label" for="comment">Комментарий (по желанию)</label>
              <textarea class="form__input" id="comment" name="comment" rows="4" maxlength="500" aria-describedby="comment-hint"></textarea>
              <p class="form__hint" id="comment-hint">До 500 символов.</p>
            </div>
          </fieldset>
          <div class="form__field form__field--checkbox">
            <input class="form__checkbox" id="consent" name="consent" type="checkbox" required />
            <label class="form__label" for="consent"
              >Согласен получать письма о запуске беты и с <a class="form__link" href="privacy.html">политикой конфиденциальности</a></label
            >
            <p class="form__error" role="alert" id="consent-error" hidden>
              Без согласия мы не можем отправить приглашение. Поставьте галочку, чтобы продолжить.
            </p>
          </div>
          <button class="button button--primary form__submit" type="submit">Отправить</button>
        </form>
      </section>
    </main>
    <footer class="footer">
      <div class="footer__inner">
        <nav class="footer__nav" aria-label="Нижняя навигация">
          <ul class="footer__list">
            <li class="footer__item"><a class="footer__link" href="#notations">Нотации</a></li>
            <li class="footer__item"><a class="footer__link" href="#pricing">Тарифы</a></li>
            <li class="footer__item"><a class="footer__link" href="#faq">Вопросы и ответы</a></li>
            <li class="footer__item"><a class="footer__link" href="privacy.html">Политика конфиденциальности</a></li>
            <li class="footer__item"><a class="footer__link" href="en/" hreflang="en" lang="en">English version</a></li>
          </ul>
        </nav>
        <address class="footer__address">Контакты: <a class="footer__link" href="mailto:hello@dslkit.io">hello@dslkit.io</a></address>
        <p class="footer__copy"><small>© 2026 DSLKit. Дипломный проект БГУИР.</small></p>
      </div>
    </footer>
    <script type="module" src="js/script.js"></script>
  </body>
</html>
```

## Appendix B – Listing of site-checks.js

```js
import { JSDOM } from 'jsdom';

export const SEMANTIC_TAGS = [
  'header',
  'nav',
  'main',
  'article',
  'section',
  'aside',
  'footer',
  'figure',
  'figcaption',
  'time',
  'address',
  'details',
  'summary',
  'fieldset',
  'legend',
];

export const MICRODATA_REQUIRED = {
  'https://schema.org/SoftwareApplication': ['name', 'applicationCategory', 'operatingSystem'],
  'https://schema.org/Offer': ['price', 'priceCurrency'],
  'https://schema.org/FAQPage': ['mainEntity'],
  'https://schema.org/Question': ['name', 'acceptedAnswer'],
  'https://schema.org/Answer': ['text'],
};

const BEM = /^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$/;
const VAGUE_LINK_TEXT = /^(здесь|тут|ссылка|подробнее|here|click here|link|more)$/i;
const FIELD_SELECTOR = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), select, textarea';
const IDREF_ATTRIBUTES = ['aria-controls', 'aria-labelledby', 'aria-describedby'];

export const parse = (html) => new JSDOM(html).window.document;

const all = (doc, selector) => [...doc.querySelectorAll(selector)];
const text = (element) => element.textContent.replace(/\s+/g, ' ').trim();
const hasId = (doc, id) => doc.getElementById(id) !== null;

export const usedSemanticTags = (doc) => SEMANTIC_TAGS.filter((tag) => doc.querySelector(tag) !== null);

export const documentProblems = (doc) => {
  const problems = [];
  if (!doc.documentElement.getAttribute('lang')) problems.push('html has no lang');
  if (!text(doc.querySelector('title') ?? doc.createElement('title'))) problems.push('title is missing or empty');
  if (!doc.querySelector('meta[charset]')) problems.push('meta charset is missing');
  if (!doc.querySelector('meta[name="viewport"]')) problems.push('meta viewport is missing');
  return problems;
};

export const headingProblems = (doc) => {
  const levels = all(doc, 'h1, h2, h3, h4, h5, h6').map((heading) => Number(heading.tagName[1]));
  const problems = [];
  const h1Count = levels.filter((level) => level === 1).length;
  if (h1Count !== 1) problems.push(`expected exactly one h1, found ${h1Count}`);
  levels.forEach((level, index) => {
    const previous = levels[index - 1] ?? 0;
    if (level > previous + 1) problems.push(`heading level jumps from h${previous} to h${level}`);
  });
  return problems;
};

export const imagesWithoutAlt = (doc) => all(doc, 'img:not([alt])').map((img) => img.getAttribute('src') ?? '(no src)');

export const skipLinkProblems = (doc) => {
  const first = doc.querySelector('body a[href]');
  if (!first?.classList.contains('skip-link')) return ['the first link is not a skip-link'];
  const target = first.getAttribute('href');
  if (target !== '#main') return [`skip-link points to ${target}, expected #main`];
  return doc.querySelector('main#main') ? [] : ['skip-link target main#main does not exist'];
};

export const duplicateIds = (doc) => {
  const seen = new Set();
  const duplicates = new Set();
  all(doc, '[id]').forEach(({ id }) => (seen.has(id) ? duplicates.add(id) : seen.add(id)));
  return [...duplicates];
};

export const missingIdReferences = (doc) => {
  const problems = [];
  all(doc, 'a[href^="#"]').forEach((link) => {
    const id = link.getAttribute('href').slice(1);
    if (id && !hasId(doc, id)) problems.push(`anchor #${id} has no target`);
  });
  all(doc, 'label[for]').forEach((label) => {
    if (!hasId(doc, label.getAttribute('for'))) problems.push(`label for="${label.getAttribute('for')}" has no control`);
  });
  IDREF_ATTRIBUTES.forEach((attribute) => {
    all(doc, `[${attribute}]`).forEach((element) => {
      element
        .getAttribute(attribute)
        .split(/\s+/)
        .forEach((id) => {
          if (!hasId(doc, id)) problems.push(`${attribute} points to missing id ${id}`);
        });
    });
  });
  return problems;
};

export const unlabeledFields = (doc) =>
  all(doc, FIELD_SELECTOR)
    .filter((field) => {
      const labelled = field.id && doc.querySelector(`label[for="${field.id}"]`);
      return !labelled && !field.closest('label') && !field.getAttribute('aria-label') && !field.getAttribute('aria-labelledby');
    })
    .map((field) => field.getAttribute('name') ?? field.tagName.toLowerCase());

export const bemProblems = (doc) => {
  const names = new Set();
  all(doc, '[class]').forEach((element) => element.classList.forEach((name) => names.add(name)));
  return [...names].filter((name) => !BEM.test(name));
};

export const unnamedControls = (doc) =>
  all(doc, 'a[href], button')
    .filter((control) => !text(control) && !control.getAttribute('aria-label') && !control.getAttribute('aria-labelledby'))
    .map((control) => control.outerHTML.slice(0, 60));

export const vagueLinks = (doc) =>
  all(doc, 'a[href]')
    .filter((link) => VAGUE_LINK_TEXT.test(text(link)))
    .map((link) => text(link));

const ownProperties = (scope) => all(scope, '[itemprop]').filter((property) => property.parentElement.closest('[itemscope]') === scope);

export const microdataProblems = (doc, required = MICRODATA_REQUIRED) => {
  const problems = [];
  all(doc, '[itemscope]').forEach((scope) => {
    const type = scope.getAttribute('itemtype');
    if (!type) {
      problems.push('itemscope without itemtype');
      return;
    }
    const present = new Set(ownProperties(scope).map((property) => property.getAttribute('itemprop')));
    (required[type] ?? []).forEach((name) => {
      if (!present.has(name)) problems.push(`${type} lacks property ${name}`);
    });
  });
  return problems;
};

export const alternateProblems = (doc) => {
  const problems = [];
  const canonical = doc.querySelector('link[rel="canonical"]');
  if (!canonical) problems.push('canonical link is missing');
  else if (!canonical.getAttribute('href').startsWith('https://')) problems.push('canonical is not an absolute https URL');
  ['ru', 'en', 'x-default'].forEach((lang) => {
    const alternate = doc.querySelector(`link[rel="alternate"][hreflang="${lang}"]`);
    if (!alternate) problems.push(`hreflang ${lang} is missing`);
    else if (!alternate.getAttribute('href').startsWith('https://')) problems.push(`hreflang ${lang} is not an absolute https URL`);
  });
  return problems;
};

export const structureSignature = (doc) =>
  all(doc, 'body *').map((element) => (element.id ? `${element.tagName.toLowerCase()}#${element.id}` : element.tagName.toLowerCase()));

export const parityProblems = (first, second) => {
  const a = structureSignature(first);
  const b = structureSignature(second);
  if (a.length !== b.length) return [`element count differs: ${a.length} and ${b.length}`];
  const index = a.findIndex((item, position) => item !== b[position]);
  return index === -1 ? [] : [`element ${index} differs: ${a[index]} and ${b[index]}`];
};
```

## Appendix C – Listing of site.test.js

```js
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  alternateProblems,
  bemProblems,
  documentProblems,
  duplicateIds,
  headingProblems,
  imagesWithoutAlt,
  microdataProblems,
  missingIdReferences,
  parityProblems,
  parse,
  skipLinkProblems,
  unlabeledFields,
  unnamedControls,
  usedSemanticTags,
  vagueLinks,
} from './site-checks.js';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'site');
const walk = (dir) =>
  readdirSync(dir)
    .filter((name) => name !== 'design')
    .flatMap((name) => (statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : [join(dir, name)]));
const files = walk(SITE);
const pages = Object.fromEntries(
  files.filter((file) => file.endsWith('.html')).map((file) => [relative(SITE, file).replaceAll('\\', '/'), parse(readFileSync(file, 'utf8'))]),
);
const names = Object.keys(pages);
const landing = ['index.html', 'en/index.html'];

const eachPage = (title, check, subset = names) =>
  test(title, () => {
    for (const name of subset) assert.deepEqual(check(pages[name]), [], name);
  });

test('the site has the landing pages in both languages, error pages and application screens', () => {
  for (const page of ['index.html', 'en/index.html', 'thanks.html', 'privacy.html', 'errors/404.html', 'app/editor.html', 'en/app/editor.html'])
    assert.ok(names.includes(page), page);
  assert.equal(names.length, 16);
});

eachPage('every page has lang, title, charset and viewport', documentProblems);
eachPage('every page has one h1 and no skipped heading levels', headingProblems);
eachPage('every image has an alt attribute', imagesWithoutAlt);
eachPage('every page starts with a skip-link to main#main', skipLinkProblems);
eachPage('ids are unique on every page', duplicateIds);
eachPage('anchors, labels and aria references point to existing ids', missingIdReferences);
eachPage('every form field has a label or an aria name', unlabeledFields);
eachPage('every link and button has an accessible name', unnamedControls);
eachPage('link texts are descriptive', vagueLinks);
eachPage('class names follow the BEM naming scheme', bemProblems);
eachPage('microdata has an itemtype and the required properties', microdataProblems);

test('the main pages use at least eight different semantic tags', () => {
  for (const name of landing) assert.ok(usedSemanticTags(pages[name]).length >= 8, name);
});

test('the main pages use the tags the assignment lists', () => {
  for (const name of landing)
    for (const tag of ['header', 'nav', 'main', 'article', 'section', 'aside', 'footer', 'figure', 'figcaption', 'time'])
      assert.ok(usedSemanticTags(pages[name]).includes(tag), `${name}: ${tag}`);
});

test('the landing title and description keep the lengths recommended by the course', () => {
  for (const name of landing) {
    const title = pages[name].querySelector('title').textContent.length;
    const description = pages[name].querySelector('meta[name="description"]').getAttribute('content').length;
    assert.ok(title >= 50 && title <= 60, `${name} title ${title}`);
    assert.ok(description >= 150 && description <= 160, `${name} description ${description}`);
  }
});

test('the landing pages declare canonical and ru, en, x-default alternates', () => {
  for (const name of landing) assert.deepEqual(alternateProblems(pages[name]), [], name);
});

test('the Russian and English versions have the same element structure', () => {
  for (const [ru, en] of [
    ['index.html', 'en/index.html'],
    ['thanks.html', 'en/thanks.html'],
    ['privacy.html', 'en/privacy.html'],
  ])
    assert.deepEqual(parityProblems(pages[ru], pages[en]), [], ru);
});

test('the Russian pages declare lang ru and the English pages declare lang en', () => {
  for (const name of names.filter((page) => page.startsWith('en/'))) assert.equal(pages[name].documentElement.lang, 'en', name);
  for (const name of names.filter((page) => !page.startsWith('en/') && !page.startsWith('errors/'))) assert.equal(pages[name].documentElement.lang, 'ru', name);
});

test('the sitemap lists existing indexable pages and robots.txt points to it', () => {
  const sitemap = readFileSync(join(SITE, 'sitemap.xml'), 'utf8');
  const locations = [...sitemap.matchAll(/<loc>https:\/\/dslkit\.io\/([^<]*)<\/loc>/g)].map((match) => match[1] || 'index.html');
  assert.ok(locations.length >= 4);
  for (const location of locations) assert.ok(names.includes(location.endsWith('/') ? `${location}index.html` : location), location);
  for (const noindex of names.filter((name) => pages[name].querySelector('meta[name="robots"][content="noindex"]')))
    assert.ok(!locations.includes(noindex), noindex);
  assert.match(readFileSync(join(SITE, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/dslkit\.io\/sitemap\.xml/);
});

test('every local href and src resolves to an existing file', () => {
  const missing = [];
  for (const file of files.filter((name) => name.endsWith('.html'))) {
    const html = readFileSync(file, 'utf8');
    for (const [, url] of html.matchAll(/\b(?:href|src)="([^"#]*)(?:#[^"]*)?"/g)) {
      if (!url || /^(https?:|mailto:)/.test(url)) continue;
      const target = url.startsWith('/') ? join(SITE, url) : join(dirname(file), url);
      const resolved = statSync(target, { throwIfNoEntry: false })?.isDirectory() ? join(target, 'index.html') : target;
      if (!statSync(resolved, { throwIfNoEntry: false })) missing.push(`${relative(SITE, file)} -> ${url}`);
    }
  }
  assert.deepEqual(missing, []);
});
```

## Appendix D – Design Tokens

```txt
Макет: https://www.figma.com/design/HYmcqqGdcszOt7dGnKrvZg/bsuir-diploma

Шрифты
Интерфейс: Inter, 400 / 500 / 600 / 700
Код: JetBrains Mono, 400
Размеры: H1 48/56, H2 32/40, H3 20/28, основной текст 16/24, малый 14/20

Цвета светлой темы
primary #2563eb
secondary #e8efff
accent #16a34a
background #f8f9fc
surface #ffffff
border #dde1e9
text #1c1f2e
text-light #4a5068
muted #6b7285
link #1d4ed8
error #dc2626
warning #d97706

Цвета тёмной темы
primary #2563eb
secondary #27304d
accent #16a34a
background #1e1e2e
surface #181825
border #313244
text #cdd6f4
text-light #a6adc8
muted #8a8fa8
link #8bb0ff
error #f38ba8
warning #fab387

Сетка и отступы: базовая единица 8 px, отступы 8 / 16 / 24 / 48 px, максимальная ширина контейнера 1200 px
Точки перелома: 576 px, 768 px, 1024 px
```
