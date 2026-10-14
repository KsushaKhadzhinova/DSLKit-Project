# Laboratory Work No. 5. Building an Interactive Interface with JavaScript

## 1 Purpose of the Work

To master the basics of JavaScript and DOM work, to learn to handle events, validate forms and store state in LocalStorage on the example of the DSLKit project, a web editor for diagrams as code that belongs to the SaaS direction and matches the future course project.

## 2 Brief Theoretical Background

**DOM.** The Document Object Model represents a page as a tree of nodes. A script finds nodes with `getElementById`, `querySelector` and `querySelectorAll`, changes text with `textContent`, attributes with `setAttribute`, classes with `classList`, and creates nodes with `createElement`.

**Events.** Handlers are attached with `addEventListener`. An event bubbles from the target element to its parents, so one handler on a container serves many elements: this technique is called delegation, and `event.target.closest` finds the needed element.

**Forms and validation.** The `submit` event is cancelled with `preventDefault`, values are checked by code, and error messages are shown next to the fields.

**LocalStorage.** Browser storage keeps strings under keys. Objects are saved with `JSON.stringify` and read with `JSON.parse`, and access and parsing errors are handled by a `try/catch` block.

**ES6+ and modules.** The code uses `const` and `let`, arrow functions, template literals, destructuring and `import` and `export` modules.

## 3 Work Progress

### 3.1 Branch and File Structure

The work is done in the branch `feature/javascript-interactivity`. The script structure matches the assignment and is shown in table 1. The main file `script.js` is connected at the end of `body` as a module: `type="module"`.

Table 1 – JavaScript structure of the DSLKit project

| File | Purpose |
|---|---|
| `js/script.js` | Entry point: starts the components that find their markup on the page |
| `js/utils/storage.js` | Safe LocalStorage wrapper with an in-memory fallback |
| `js/utils/validation.js` | Pure functions that check name, email, team size, notation and consent |
| `js/components/theme.js` | Theme switching and saving |
| `js/components/burger.js` | Closing the menu with Escape and after following a link |
| `js/components/accordion.js` | Collapsible questions with one open at a time |
| `js/components/notation-filter.js` | Filter of notation cards |
| `js/components/waitlist-form.js` | Beta signup form with validation |
| `js/components/dashboard.js` | Filter, search and sorting of projects |
| `js/components/settings.js` | Saving of settings |
| `js/components/editor.js` | Tabs, dialog, autosave, view switch |

### 3.2 Working with the DOM

Elements are found by identifiers and selectors, found nodes are checked for `null`, and repeated lookups in loops are replaced by references in variables. The notation filter builds buttons and a status area with `createElement` and sets text with `textContent`, so no user input reaches the markup. Card visibility changes with the `hidden` attribute, and button state with `aria-pressed` and the class `filter__chip--active`.

### 3.3 Events

Five event types are used: `click` (filters, tabs, buttons), `input` (search and field checks), `change` (sorting, settings, theme), `submit` (the form) and `keydown` (arrows on tabs, the Escape key, the Ctrl and Enter combination). The `toggle` event for questions and the `close` event for the dialog are applied too. Delegation serves the filter buttons, the tabs and the settings.

### 3.4 Interactive Components

Eight components are implemented, and each uses events and keeps state in LocalStorage.

The notation filter on the home page splits six cards into the groups "in beta" and "planned". The chosen filter is saved, and an `aria-live` area announces the number of shown cards. The result is shown in figure 1.

![Notation filter on the home page](figures/notation-filter.jpg)

Figure 1 – Notation filter: the status "In beta" is chosen and three cards are shown

The beta signup form cancels the default submit, checks all fields and shows error messages next to the fields. Wrong fields get `aria-invalid`, focus moves to the first of them, and an error disappears as soon as the value becomes valid. The result is shown in figure 2.

![Validation of the beta signup form](figures/form-validation.jpg)

Figure 2 – Form validation: an empty name and a wrong email are highlighted and messages appear under the fields

With valid data the request is added to a list in LocalStorage, a message goes to the console, and the browser opens the page `thanks.html`. The data never reaches the page address.

The project list on the dashboard screen supports a notation filter, search by title and sorting. The state is saved, and an `aria-live` area announces the number of found projects. The result is shown in figure 3.

![Filter and search of projects on the dashboard](figures/dashboard-filter.jpg)

Figure 3 – Dashboard: the IDEF0 filter, the search text "ord" and sorting by name give one project

The editor switches tabs with the mouse and arrows, shows an unsaved-changes dialog when a file is closed, toggles autosave and switches the Code and Canvas view on a phone. The dialog is shown in figure 4.

![Unsaved-changes dialog in the editor](figures/editor-dialog.jpg)

Figure 4 – Editor: the native dialog when closing a file with unsaved changes

The remaining components: the theme switch remembers the choice and applies it on every page, the FAQ accordion keeps one answer open and remembers it, the settings keep the position of switches and lists, and the menu closes with the Escape key.

### 3.5 Saving State

State lives in LocalStorage under keys with the prefix `dslkit.`: the theme, the notation filter, the open question, requests, the dashboard state, settings, and the editor tab and view. The module `storage.js` wraps reads and writes in `try/catch` and returns a fallback value on an access error or corrupted data. When LocalStorage is unavailable, in-memory storage is used.

### 3.6 Error Handling and ES6+

Reading and writing data is protected by `try/catch` blocks, and the entry point starts each component separately: the error of one component goes to the console and does not stop the others. The code uses `const` and `let`, arrow functions, template literals, destructuring and modules. Handlers are attached with `addEventListener`, and `onclick` attributes are not used.

### 3.7 Testing

Automated jsdom tests are written for every module and parse the real pages of the site. The tests check filters, the form with valid and invalid data, state restoration after a reload, storage errors and missing markup. Coverage of all JavaScript files is 100 percent for lines, branches and functions. The components are additionally checked in Chrome: the console has no errors, a request lands in LocalStorage, and the theme persists between pages. Testing in Firefox and Edge and a screenshot of the Event Listeners tab of the developer tools remain a task for the acceptance stage.

### 3.8 Committing the Changes

The commit with the implementation: https://github.com/KsushaKhadzhinova/DSLKit-Project/commit/39efd4f. The commit message: `feat: add JavaScript interactivity for a SaaS diagram editor`.

## Conclusion

Modular JavaScript is written for the DSLKit project: an entry point, storage and validation utilities and eight interactive components. Five event types and delegation are used, the form is validated with clear messages, and state is saved in LocalStorage and restored after a reload. Automated tests cover all the code, and the components are confirmed in a browser. What remains is to check the pages in Firefox and Edge.

## Appendix A – Listing of script.js

{{code:site/js/script.js}}

## Appendix B – Listing of storage.js

{{code:site/js/utils/storage.js}}

## Appendix C – Listing of validation.js

{{code:site/js/utils/validation.js}}

## Appendix D – Listing of notation-filter.js

{{code:site/js/components/notation-filter.js}}

## Appendix E – Listing of waitlist-form.js

{{code:site/js/components/waitlist-form.js}}

## Appendix F – Listing of dashboard.js

{{code:site/js/components/dashboard.js}}

## Appendix G – Listing of editor.js

{{code:site/js/components/editor.js}}
