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

### 3.9 Checking in DevTools

The page was checked in Chrome 155: the Elements panel shows the event handlers and the Application panel shows the saved data.

The event handlers are shown in Figure 5: the click, change and keydown listeners of the notation filter button are attached to the common container, so delegation is used.

![DevTools screenshot](figures/devtools-01-event-listeners.png)

Figure 5 – The Elements panel, the Event Listeners tab for a filter button

The console check is shown in Figure 6: getEventListeners returns the listeners of the container, and the notation list holds six cards.

![DevTools screenshot](figures/devtools-02-console.png)

Figure 6 – Console: the listeners of the filter container and the card count

The saved state is shown in Figure 7: after the form is submitted, LocalStorage holds keys with the dslkit prefix, among them dslkit.notation-filter and dslkit.waitlist.

![DevTools screenshot](figures/devtools-03-local-storage.png)

Figure 7 – The Application panel: site LocalStorage

## 4 Answers to Control Questions

{{answers}}
1. **Element lookup methods.** `getElementById` quickly finds an element with a known identifier, for example `#project-list`. `querySelector` accepts any selector and returns the first element, and `querySelectorAll` returns all matches, for example the filter buttons `.filter__chip[data-filter]`.
2. **Event delegation.** One handler on a container receives events from descendants, and the needed element is found with `event.target.closest`. Elements added later work too: the notation filter buttons are created by the script and served by one group handler.
3. **Creating elements.** `createElement`, `append` and `before` are used. `innerHTML` parses a string as markup and opens a path for code injection, while `createElement` with `textContent` is safe for user data and returns a reference to the created node.
4. **Code structure.** The entry point `script.js` starts the components from the `components` folder, and shared parts live in `utils`: storage and field validation. The split allowed each module to be tested alone.
5. **Bubbling and capturing.** The `toggle` event does not bubble, so the accordion listens in the capture phase on the container. The other events are handled in the bubbling phase through delegation.
6. **What the DOM is.** It is the tree of objects that the browser builds from HTML. A script reads and changes it, and the page updates without a reload.
7. **Selecting by identifier.** The expression `document.getElementById('name')` returns an element or `null`.
8. **Changing text.** The assignment `element.textContent = 'Showing 3 of 6'` replaces the text inside an element without parsing markup.
9. **Event handler.** It is a function the browser calls on an event. It is attached like this: `button.addEventListener('click', (event) => { ... });`.
10. **Element attributes.** Read with `getAttribute('aria-label')`, write with `setAttribute('aria-invalid', 'true')`, remove with `removeAttribute`. The `data-` attributes are available through `element.dataset`.
11. **Adding an element.** Create it with `const chip = document.createElement('button');`, set its properties and insert it with `group.append(chip);` or `list.before(group)`.
12. **Removing an element.** The method `element.remove()`, as in the editor where saving a file removes the unsaved mark.
13. **LocalStorage.** Key-value storage. Saving: `localStorage.setItem('theme', JSON.stringify('dark'));`, reading: `JSON.parse(localStorage.getItem('theme'))`.
14. **LocalStorage in the project.** The keys `dslkit.notation-filter`, `dslkit.waitlist`, `dslkit.dashboard`, `dslkit.settings` and `dslkit.theme` keep the filter, requests, dashboard state, settings and theme. Requests are stored as an array of objects.
15. **Updating without a reload.** A script changes the DOM: the filter hides cards with the `hidden` attribute, and search reorders and hides projects, with no page reload.
16. **Styles from JavaScript.** Classes through `classList.add`, `remove` and `toggle` are preferred. One-off values are set with `element.style.width = '10px'`, and computed styles are read with `getComputedStyle`.
17. **getElementById versus querySelector.** The first works with identifiers only and is faster, and the second accepts any CSS selector and returns the first match.
18. **Adding to a list.** Create an `li` with `createElement`, set `textContent` and call `list.append(li)`. Saved requests are added to an array with `push`.
19. **Sorting.** An array of elements is sorted with `sort` and a comparator, for example `localeCompare` by title, and then the elements are inserted into the list in the new order. Project sorting works this way.
20. **Email check.** The regular expression `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/` checks for an at sign and a domain. The function `isValidEmail` in `validation.js` uses it.
21. **Changing a class.** The methods `classList.add('x')`, `remove('x')`, `toggle('x', true)` and `contains('x')`.
22. **Click on a button.** `button.addEventListener('click', handler);` where the handler performs the action and calls `event.preventDefault()` when needed.
23. **The submit event.** It fires when a form is sent. The handler calls `event.preventDefault()`, checks the fields and decides what happens next. In the project it saves the request and opens the confirmation page.
24. **Field value.** The property `input.value`, and `checkbox.checked` for a checkbox. The form reads values by field identifiers.
25. **Filtering.** A condition is computed for every element and `item.hidden = !matches` is set. The notation filter compares `item.dataset.status` with the chosen value.
26. **Animation.** CSS provides the smoothness, and a script toggles a class or an attribute. In the project animations are turned off by the `prefers-reduced-motion` rule for users who are bothered by them.
27. **A slider.** An array of slides, the index of the current one and handlers of the back and forward buttons that change the index and show the needed slide. The index is saved in LocalStorage.
28. **A drop-down list.** A `select` element with `option` items is made by markup or code, and the change is handled by the `change` event. The project sorting of projects is built this way.
29. **A timer.** The function `setInterval(() => {...}, 1000)` runs an action every second and `clearInterval` stops it. A one-time delay uses `setTimeout`.
30. **Drag and drop.** An element gets `draggable="true"`, the events `dragstart`, `dragover` and `drop` are handled, and data travels through `event.dataTransfer`.
{{/answers}}

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
