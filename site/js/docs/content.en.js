// Documentation texts (English). Body format: ## and ### headings, paragraphs, - and 1. lists, ``` code blocks, **bold**, `code`, [text](address).
export const DOCS = {
  project: [
    { id: 'what-is-dslkit', title: "What is DSLKit", body: `DSLKit is a web editor for diagrams as code. You write the diagram as text in a compact language, and the editor draws it next to the code at once and checks it against the rules of the chosen notation.

## Why it is useful

- Text is easy to store, compare and copy: a diagram is plain lines.
- The rules of the notation are checked automatically: the editor shows errors and warnings with the line number.
- The same code can be drawn by the own engine in the browser, by the DSLKit server or by the external Kroki service.

## What is supported

More than 35 notations: IDEF0, IDEF1, IDEF1X, IDEF3, IDEF4, IDEF5, DFD, ERD, BPMN, Petri nets, GOST 19.701-90 flowcharts, graphs and DAGs, all the main UML kinds (class, object, component, deployment, package, use case, activity, state, sequence, communication, timing and others), mind maps, organisation charts, C4, network diagrams, decision trees and eEPC.

## What the code looks like

The first line is always the header: \`diagram <notation> "Title"\`. UML adds the kind: \`diagram uml class "Shop"\`. The next lines hold elements and links:

\`\`\`
diagram dfd "Online order"
entity Customer
process 1 "Validate order"
flow Customer -> 1 "order"
\`\`\`

The full language reference is the file docs/DSL-REFERENCE.md of the repository, and the step-by-step guides are in the "Guides" section of this documentation.` },
    { id: 'screens-overview', title: "Overview of the screens", body: `The application has several pages.

- **Home** (index.html): the description of the product, examples and the waiting-list form.
- **Sign up** (register.html) and **sign in** (login.html): creating an account and signing in.
- **My projects** (dashboard.html): the list of your diagrams. The page is for signed-in users only: a guest is sent to the sign-in page.
- **Templates** (welcome.html, "Welcome"): choosing a notation for a new diagram, an empty file, import of PlantUML and Mermaid, a 5-step tour.
- **My templates**, **Shared** and **Trash**: sections of the same "My projects" page, switched in the side menu.
- **Editor** (editor.html): the code on the left, the canvas on the right, the problems panel at the bottom.
- **Settings** (settings.html): the rendering engine, the theme and the editor options.

The top bar of every application page has the diagram search (Ctrl+K), the "New diagram" button, the language switch, the account menu and the settings icon. The side menu has the sections and the quota bar "Beta: N of 5 diagrams a day".

Each screen is described in detail in the next sections.` },
    { id: 'account-and-storage', title: "Account and data storage in the browser", body: `DSLKit has no server-side user database. **Accounts, projects, templates and settings are kept in the localStorage of your browser**, and every key has the prefix \`dslkit.\`.

## Signing up and in

- Sign-up asks for a name, an email, a password and its confirmation. The email is lower-cased and must be unique in this browser.
- The password is never stored. Only a PBKDF2-SHA-256 hash (100,000 iterations) with a random salt is saved. At sign-in the password is hashed again and compared in constant time.
- The session is the id of the signed-in account. The Sign out button removes it, and signing in in another tab is seen in this one at once.
- A wrong email and a wrong password give the same message, so nobody can learn which addresses are registered.
- Hashing needs a secure context: open the site over https or on localhost.

## What this means for security

- Data does not leave the browser unless you choose the "DSLKit server" or Kroki engine: then only the diagram code is sent.
- Anyone with access to your browser profile has access to your projects. Do not use a shared computer without signing out.
- Clearing the site data in the browser deletes accounts and projects for good.
- Accounts in one browser are kept apart: projects live under the key \`projects.<account id>\`, the projects of a guest under \`projects\`.

## Moving the data

The data belongs to the browser and the site address. The guide "How to move projects to another computer" explains how to carry it over.` },
    { id: 'projects-crudl', title: "Projects: create, read, update, delete, list", body: `A project is a diagram with a title, a notation, the code, the time of creation and the time of the last change.

## Creating

- The "New diagram" button leads to the "Templates" page: choose a notation or an empty file.
- A new diagram becomes a project at the first change of its code or at saving (Ctrl+S, the Save button). The title comes from the header \`diagram ... "Title"\`.
- A shared example becomes a project with the "Save a copy to My projects" or "Like" button.
- On the first visit the list is filled with starter diagrams (one per notation, some marked as published). They appear once and do not come back after deleting.

## Reading and the list

- A card shows the title, the notation, the "published" mark and the time of the change. Press the title to open the project in the editor (address \`editor.html?p=<id>\`).
- Filter by notation (buttons and the "Other notations…" list), search by title, sort: newest first, oldest first, by name. The choice is remembered.

## Updating

- The card menu "⋯" → "Rename" changes the title. In the editor changes are saved by autosave one second after the last edit, if it is on.

## Deleting

- "Move to trash" puts a project into the trash after a confirmation. The trash is described in the next section.

The store keeps at most 200 projects in one list.` },
    { id: 'trash', title: "Trash (30 days)", body: `A deleted project is not erased at once, it goes to the trash.

- Open the "Trash" section in the side menu. A card shows when the project was deleted and in how many days it will be erased.
- **Restore** returns the project to "My projects" with its old content.
- **Delete forever** erases one project after a confirmation, it cannot be undone.
- **Empty the trash** (the button appears when the trash is not empty) erases every project of the trash after a confirmation.
- A project that stayed in the trash for 30 days is deleted automatically the next time the project list opens.
- A project in the trash cannot be opened in the editor until it is restored.

Note: a deleted project still counts in the daily quota for the day of its creation.` },
    { id: 'shared-examples', title: "Shared examples, likes and copying", body: `The "Shared" section holds one ready example for every notation of the editor. These are the same templates the editor puts in.

- The title of an example opens the editor with it (\`editor.html?template=<notation>\`). No project is created until you change the code.
- **Like** is a like mark (♡ becomes ♥ "Liked") and at the same time a copy of the example in "My projects". Pressing it again removes the mark but does not delete the copy.
- **Save a copy to "My projects"** is a copy without a like.
- **Add to "My templates"** is a copy in your templates.

Likes are kept separately for every account (and for a guest). Filter, search and sort work as in "My projects".` },
    { id: 'my-templates', title: "My templates", body: `"My templates" are your own starting points. They are kept apart from the projects, with no trash and no quota.

- Create a template: the project menu "Save as a template", the "Save as a template" item of the editor menu "⋯", or the "New template" button of the section (it asks for a name and opens the editor with an IDEF0 starter).
- Pressing the title of a template starts a new diagram from its code (\`editor.html?my=<id>\`).
- "Edit the template" opens it for editing (\`editor.html?tpl=<id>\`): saving updates the template itself and does not create a project.
- "Rename" changes the title, "Delete the template" erases it after a confirmation with no way back.

The templates of every account are isolated, like the projects.` },
    { id: 'quota', title: "The \"5 diagrams a day\" quota", body: `In the beta version the side menu and the editor panel show the bar "Beta: N of 5 diagrams a day".

- N is the real number of diagrams created today (by the calendar day of your browser).
- New projects count, copies of shared examples among them. Starter diagrams of the first visit and edits of existing projects do not count.
- A deleted project stays in the count.
- If N is above 5, the label says the limit is exceeded: "the limit of 5 a day is exceeded".
- The limit is **only shown** for now: the editor does not forbid creating more. The label "Pro — no limits" refers to a future plan.

The bar is refreshed on every page of the application.` },
    { id: 'editor', title: "The editor: code, canvas, bottom panel", body: `The editor has several zones.

## The top bar

- **Run** (Ctrl+Enter) draws the diagram. While the code has errors the button is disabled and the reason is written next to it; Ctrl+Enter then moves the focus to the first problem.
- **Undo / Redo**: a history of up to 100 states of the code; the buttons are disabled when there is no step to take.
- **Save** (Ctrl+S) saves the project.
- The board tools: Element, Connect, Rename, Delete (see the section on the toolbar).
- The menu "⋯": Check, Format, Share (copies the code to the clipboard), Save as a template, the choice of notation, Auto layout (resets manual pos= places), import, export, tour, "Refresh from the server", the autosave switch, theme, account, language. The gear icon leads to the settings.

## The left column

The activity bar: Files (the explorer with the project list and the quota), Templates (the list of notations), Search (Ctrl+F), Git, AI assistant. Pressing a file in the explorer opens the project.

## Code and canvas

- **Code**: a field with highlighting; Tab inserts two spaces, Enter keeps the indent and adds one more after "{", and "}" on an empty indented line steps one level back. A line with an error is highlighted.
- **Canvas**: the diagram and the zoom buttons (+, −, fit; from 0.5 to 3 in steps of 0.25). On a narrow screen one of the two zones is shown, switched by "Code / Canvas".
- The status line: the notation, the cursor position, the engine, the autosave state, the number of errors and warnings.

## The bottom panel

- **Problems**: the list of errors and warnings; the "file:line" link puts the cursor on the line; the "Fix" button hands the error to the assistant.
- **Assistant**: an offline rule-based helper (no network, no external AI): "Fix errors", "Explain the diagram", "Format".
- **Output**: the log of runs (the last 50).
- **Versions**: the list of local commits.

One second after you stop typing the diagram and the problems update themselves; the code is also saved to \`editor-source\`.` },
    { id: 'board-toolbar', title: "The board toolbar and dragging", body: `The top bar of the editor has the board tools next to Save. Each of them changes the code, and the code redraws the diagram, so the code and the picture always agree.

- **Element** opens a menu of shapes for the current notation. Press a shape to add it (the layout picks the place) or drag it onto the canvas: the block appears where you release the pointer, and moves down if the place is taken.
- **Connect** turns on the link mode. Choose the link type in the list, press the source block, then the target block. Esc cancels the mode. A block cannot be linked to itself.
- **Rename** (or a double click on a block) opens a field over the block: Enter keeps the label, Esc cancels. If the element has no label its name is changed in the code.
- **Delete** (or Delete / Backspace on a selected block) removes the block with its links.

Every change passes a strict gate: if it would create a new error of the notation it is refused, and the status line tells why.

## Dragging blocks

The blocks of the own engine can be moved with the mouse, a finger or the arrow keys: an arrow moves by 10 units, Shift+arrow by 50. The new place is written to the code as \`pos=120x80\`. "Auto layout" in the "⋯" menu removes all \`pos=\` and brings back the automatic layout. Dragging works only for the own engine.` },
    { id: 'hotkeys', title: "Hotkeys", body: `- **Ctrl+Enter**: run (draw) the diagram.
- **Ctrl+S**: save the project (and the editor code).
- **Ctrl+F**: open search and replace over the code.
- **Ctrl+K**: the "Search diagrams" field of the application top bar.
- **Tab**: an indent in the code, **Enter**: a new line that keeps the indent.
- **Esc**: close the search or Git panel, cancel the Connect mode, close the rename field or the tour.
- **Delete / Backspace** on a selected block: delete the block.
- **Arrows** on a block: move by 10, **Shift+arrows**: by 50.
- **Enter / Space** on a block in the Connect mode: pick the block.
- **Left/Right arrows, Home, End** on the file tabs: switch tabs.

On a Mac, Cmd works instead of Ctrl.` },
    { id: 'export-import', title: "Export and import", body: `## Export

The "⋯" menu of the editor saves the diagram that is on the canvas now (press Run first):

- **SVG** is a vector drawing; **PNG** and **JPEG** are raster pictures; **draw.io** is a \`.drawio\` file for diagrams.net; **HTML** is a self-contained page with the drawing and the code.
- The file name comes from the title of the diagram. If the canvas is empty the editor asks you to run first.

## Import

"Import from a file" and "Import from the clipboard" turn Mermaid or PlantUML text into DSLKit code and replace the code of the editor with it.

- Files: \`.puml, .plantuml, .pu, .mmd, .mermaid, .md, .txt, .dsl\`.
- Understood: **Mermaid flowcharts**, **sequence diagrams** and **state diagrams** (Mermaid and PlantUML). Anything else is reported as "not supported", nothing is guessed.
- If some constructs are not carried over they are listed in the message.
- Limit: 200,000 characters in total and 2,000 characters in a line.
- The imported code is checked and drawn at once; the import can be undone with the Undo button.` },
    { id: 'settings', title: "Settings: theme, language, rendering engine", body: `The "Settings" page keeps the choices in the browser (key \`settings\`).

## Theme

Light, dark or auto (follows the system). The theme can also be switched quickly from the "⋯" menu of the editor. The choice is kept in the key \`theme\`.

## Language

The Russian and English versions are different pages: the "English" link (and "Русский" back) in the top bar. In the editor the link keeps the open project.

## Rendering engine

The "Diagram generation engine" choice is read at every run:

- **Own engine (in the browser)** is the default. It draws by itself, with no network, works offline, supports dragging of blocks and all the notations.
- **DSLKit server (own API)** sends the code to \`/api/render\` of your server (\`tools/serve.js\` must run) and gets the SVG. See the guide "How to connect your own rendering API".
- **Kroki · Graphviz / Mermaid / PlantUML**: the code is translated to the language and sent to the Kroki service (kroki.io). The network is needed; answers are cached for 24 hours. If a notation cannot produce the chosen language, the first suitable one is used and the status says so.

## The rest

Font size, line numbers, line wrap, autocomplete, autosave, canvas grid and guides are switches whose values are remembered in the settings; autosave also works from the editor menu.` },
    { id: 'offline-pwa', title: "Working offline (PWA)", body: `DSLKit installs as a web application and works without a network.

- The service worker (file sw.js, cache version \`dslkit-v3\`) saves the pages, styles, scripts and icons on the first visit.
- Pages load "network first": with a network you see the fresh version, without one the saved copy.
- Requests to other servers (Kroki) always go to the network and are not cached by the worker.
- The own engine and all the checks run fully in the browser, so you can write and draw diagrams without the internet. The Kroki and "DSLKit server" engines are not available offline: the editor shows a saved copy of the drawing if there is one.
- The address bar or the browser menu offers "Install app" (manifest.webmanifest).

If you see an old version after a site update, reload the page twice or clear the site data (projects are deleted with it, so move them first).` },
    { id: 'developer-docs', title: "The \"developer\" role and documentation", body: `Everybody reads the documentation: guests and signed-in users. **Only a user with the role "developer" can change it.**

## How to get the role

1. Sign in.
2. Open the "Documentation" page (an item of the side menu) and find the block "Role developer" at the bottom.
3. Enter the developer code and press "Turn the role on". The role is written to your account.
4. The "Leave the role" button gives the ordinary rights back.

The code is given by the owner of the project. Only the hash of the code is kept in the program (the file site/js/config/roles.js), a new hash is set with \`npm run dev:code -- "new code"\`.

## What a developer can do

- The "Edit" button of a section opens its text in Markdown. "Save" keeps the change in the browser, "Reset to the original" brings the original text back, "Cancel" closes the editor.
- A changed section is marked "Changed by a developer".
- An ordinary user does not see the edit buttons, and the store of the documentation refuses a write without the role.

Note: the site works without a server, so the role is checked in the browser. This guards against accidental changes, not against a determined visitor. Changes of the documentation are kept in this browser; to change the original texts for everybody, edit the files site/js/docs/content.ru.js and content.en.js.

## Who the "Code" section is for

The "Code" section is written for developers: architecture, the language, notations, engines and the API, storage, tests. From the editor it is reached with the item "Code documentation" of the "⋯" menu.` },
    { id: 'faq', title: "Frequently asked questions and troubleshooting", body: `## "My projects" opens the sign-in page at once

The page is for signed-in users only. Sign in or sign up.

## Projects are gone

The data lives in the localStorage of this very browser, address and account. Check that you opened the same address (localhost and 127.0.0.1 are different stores) and signed in to the same account. Clearing the site data erases everything.

## The Run button is disabled

The code has errors. Open the "Problems" panel, press the "file:line" link and fix the line. Warnings do not block the run.

## "Unknown notation" or "Give the UML diagram kind"

Check the header: \`diagram idef0\`, \`diagram uml class\`. The list of notations and UML kinds is in the text of the message.

## "Block is not closed"

Every "{" needs its "}". The "Format" button sets the indents and helps to see the gap.

## The diagram is not drawn through Kroki or the server

Check the network and the engine chosen in the settings. For the "DSLKit server" run \`npm start\`. The reason is shown above the canvas: no network, a timeout, too many requests (code 429) or a server error code. Switch to the own engine, it needs no network.

## Sign-up does not work

The browser must offer safe storage: https or localhost. Private mode and a full storage also prevent saving.

## A block cannot be dragged

Dragging works for the own engine. Choose it in the settings.

## The import did not accept the text

Mermaid flowcharts, sequence diagrams and state diagrams are supported. Other kinds (class, ER, Gantt) are not imported.` },
  ],
  guides: [
    { id: 'first-diagram', title: "Your first diagram in 5 minutes", body: `## Goal

Create, check, draw and save your first diagram.

## Steps

1. Sign up or sign in (buttons in the top bar), then press "New diagram".
2. On the "Templates" page choose "IDEF0": the editor opens with a ready example.
3. Change the title in the first line and the name of block A1.
4. Add one more block and an arrow. The full code:

\`\`\`
diagram idef0 "Order process"
box A1 "Receive order" {
 input: Order
 control: Sales policy
 output: Accepted order
 mechanism: Manager
}
box A2 "Check stock" {
 input: Accepted order
 control: Stock rules
 output: Reserved goods
}
box A3 "Ship goods" {
 input: Reserved goods
 control: Delivery rules
 output: Shipment
 mechanism: Courier
}
arrow A1.output -> A2.input
arrow A2.output -> A3.input
\`\`\`

5. Look at the canvas: the diagram redraws itself a second after you type, and Ctrl+Enter draws at once.
6. Press Ctrl+S. The status line says "Saved to My projects", and the project is seen on the "My projects" page.

## Expected result

Three blocks from left to right joined by arrows on the canvas; "No problems" in the problems panel; the project in the list.

## Typical mistakes

- A typo in the word \`control\` gives "Unrecognized line" on that line.
- A box without \`control\` or \`output\` is reported as having no control or no output. In most notations a forgotten \`}\` gives "Block is not closed".
- A header that is not on the first line: the diagram is taken for IDEF0 with a warning.` },
    { id: 'idef0-context', title: "IDEF0: context and decomposition", body: `## Goal

Build the context diagram A-0 with one box and break it into 3 to 6 boxes (decomposition).

## Step 1. The context diagram

There is one A-0 box; it must have an output and a control.

\`\`\`
diagram idef0 "Shop: context"
box A-0 "Run online shop" {
 input: Customer order
 control: Sales policy
 output: Delivered goods
 mechanism: Staff
}
\`\`\`

## Step 2. Decomposition

Create a new diagram and describe the boxes A1…A3 inside A-0. The numbers go in a row, an arrow goes from \`output\` of one box to \`input\`, \`control\` or \`mechanism\` of another.

\`\`\`
diagram idef0 "Shop: decomposition"
box A1 "Receive order" {
 input: Customer order
 control: Sales policy
 output: Accepted order
 mechanism: Manager
}
box A2 "Pick goods" {
 input: Accepted order
 control: Stock rules
 output: Packed goods
 mechanism: Storekeeper
}
box A3 "Deliver" {
 input: Packed goods
 control: Delivery rules
 output: Delivered goods
 mechanism: Courier
}
arrow A1.output -> A2.input
arrow A2.output -> A3.input
\`\`\`

## Expected result

Context: one box with four sides (input, control, output, mechanism). Decomposition: three boxes joined by a chain of arrows.

## Typical mistakes

- More than six or fewer than three boxes on a decomposition: the warning "it should have 3 to 6".
- More than one box in the context: a warning.
- A box without \`output\` or \`control\`: an error naming the box.
- An arrow that does not leave from \`output\`: an error.
- A gap in the numbers (A1, A3): a warning.` },
    { id: 'dfd-levels', title: "DFD levels 0 to 2", body: `## Goal

Show a system on three levels of detail.

## Level 0 (context): one process and the external entities

\`\`\`
diagram dfd "Level 0"
entity Customer
process 0 "Online shop"
flow Customer -> 0 "order"
flow 0 -> Customer "receipt"
\`\`\`

## Level 1: processes and a store

\`\`\`
diagram dfd "Level 1"
entity Customer
process 1 "Accept order"
process 2 "Take payment"
store D1 "Orders"
flow Customer -> 1 "order"
flow 1 -> D1 "valid order"
flow D1 -> 2 "order to pay"
flow 2 -> Customer "receipt"
\`\`\`

## Level 2: detail of process 1

Sub-process numbers begin with the number of the parent (1.1, 1.2).

\`\`\`
diagram dfd "Level 2: process 1"
entity Customer
process 1.1 "Check items"
process 1.2 "Calculate total"
flow Customer -> 1.1 "order"
flow 1.1 -> 1.2 "checked items"
flow 1.2 -> Customer "total"
\`\`\`

## Expected result

Three diagrams with matching flows: what enters process 1 on level 1 enters its sub-processes on level 2.

## Typical mistakes

- A flow between two entities or stores is an error: at least one end must be a process.
- A flow without a label is a warning.
- A process without inflows (a "miracle") or without outflows (a "black hole") is an error.
- A store that is only written or only read is a warning.` },
    { id: 'erd-shop', title: "ERD of a shop", body: `## Goal

Describe the entities of a shop, their attributes and relations.

## Steps

1. Create an ERD diagram (the "ERD" template).
2. Describe the entities with \`entity\` blocks with attributes of the form \`name: type key\` (\`pk\`, \`fk -> Entity\`, \`unique\`).
3. Add the relations \`relationship A 1:N B "label"\` (also \`1:1\` and \`N:M\`).

\`\`\`
diagram erd "Shop"
entity Customer {
  id: int pk
  email: string unique
}
entity Order {
  id: int pk
  customer_id: int fk -> Customer
  total: decimal
}
entity Product {
  id: int pk
  name: string
}
relationship Customer 1:N Order "places"
relationship Order N:M Product "contains"
\`\`\`

## Expected result

Three entities as tables with attributes and relation lines with the cardinality at the ends. Export: SVG, PNG, draw.io.

## Typical mistakes

- A relation with an unknown entity: "Unknown element".
- Two entities with the same name: "already declared".
- An entity without relations gets the warning "not connected to anything".
- For pure relational data modelling by IDEF1X use the notation \`idef1x\`.` },
    { id: 'uml-class-sequence', title: "UML: classes and sequences", body: `## Goal

Describe the structure of a shop by a class diagram and the message exchange of checkout by a sequence diagram.

## Step 1. Classes

Class members: \`+\` public, \`-\` private. Relations: \`--|>\` inheritance, \`..|>\` realization, \`-->\` association, \`*--\` composition, \`o--\` aggregation, \`..>\` dependency. Quotes hold the multiplicity.

\`\`\`
diagram uml class "Shop"
interface Payable {
  + pay(amount: Money): Receipt
}
abstract class Person {
  - name: String
  + getName(): String
}
class Customer {
  - email: String
  + placeOrder(item: Item): Order
}
class Order {
  + total(): Money
}
class Item {
  + price: Money
}
Customer --|> Person
Order ..|> Payable
Customer "1" --> "0..*" Order : places
Order "1" *-- "1..*" Item : contains
\`\`\`

## Step 2. Sequence

Arrows: \`->\` call, \`-->\` reply, \`->>\` asynchronous message.

\`\`\`
diagram uml sequence "Checkout"
actor Customer
participant Shop "Online shop"
participant Bank
Customer -> Shop : place order
Shop -> Bank : charge card
Bank --> Shop : approved
Shop ->> Customer : confirmation email
Shop --> Customer : order accepted
\`\`\`

## Expected result

A class diagram with arrows of different kinds; a sequence diagram with lifelines and messages from top to bottom.

## Typical mistakes

- The kind is missing in the UML header: "Give the UML diagram kind".
- A relation with a class that does not exist: "Unknown element".
- A message from a participant that is not declared with \`actor\` or \`participant\`.` },
    { id: 'bpmn-order', title: "BPMN: order process", body: `## Goal

Describe order handling with the fork "in stock?".

## Steps

1. Begin with a \`start\` event and finish with \`end\`.
2. Actions are \`task\`, forks are \`exclusive\` (one branch) or \`parallel\` (all branches).
3. Join elements with \`flow a -> b "label"\`, label the branches of a gateway.
4. Merge the branches with a second gateway.

\`\`\`
diagram bpmn "Order handling"
start s "Order received"
task t1 "Check order"
exclusive g1 "In stock?"
task t2 "Ship goods"
task t3 "Notify customer"
exclusive g2
end e "Done"
flow s -> t1
flow t1 -> g1
flow g1 -> t2 "yes"
flow g1 -> t3 "no"
flow t2 -> g2
flow t3 -> g2
flow g2 -> e
\`\`\`

## Expected result

A flow from left to right: start, task, a diamond gateway, two branches, a second gateway, the end.

## Typical mistakes

- A flow that leads an element into itself is an error.
- An element without flows is the warning "not connected to anything".
- An unknown element type gives "Unrecognized line": check the words \`start task exclusive parallel intermediate end\`.` },
    { id: 'petri-net', title: "A Petri net", body: `## Goal

Model a producer and a consumer with a buffer of two slots.

## Steps

1. Places are declared with \`place\`, initial tokens with \`tokens=N\`.
2. Transitions are \`transition\`.
3. Arcs \`arc a -> b\` go only between a place and a transition; the weight is \`weight=N\`.

\`\`\`
diagram petri "Producer and consumer"
place free "Free slots" tokens=2
place used "Used slots"
transition put "Produce"
transition take "Consume"
arc free -> put
arc put -> used weight=2
arc used -> take
arc take -> free
\`\`\`

## Expected result

Two places (circles), two transitions (rectangles), arcs; two tokens in the place "Free slots". The transition "Produce" can fire while there are free slots.

## Typical mistakes

- An arc between two places or two transitions is an error.
- An arc to an unknown element: "Unknown element".
- A transition without incoming arcs is a source of tokens: check that this is intended.` },
    { id: 'gost-flowchart', title: "A flowchart by GOST", body: `## Goal

Draw the algorithm of the sum of numbers 1…n by GOST 19.701-90.

## Steps

1. Symbols: \`start\`/\`end\` (terminator), \`io\` (input-output), \`preparation\`, \`process\`, \`decision\`. There are also \`predefined\`, \`manual\`, \`document\`, \`connector\`, \`offpage\`, \`storage\`.
2. Two labelled branches leave a decision: "Yes" and "No" (the template has them in Russian).
3. A loop is a flow back to the decision.

\`\`\`
diagram gost "Сумма чисел"
start s "Начало"
io in "Ввод n"
preparation p "i = 1, sum = 0"
decision d "i <= n?"
process a "sum = sum + i, i = i + 1"
io out "Вывод sum"
end e "Конец"
flow s -> in
flow in -> p
flow p -> d
flow d -> a "Да"
flow a -> d
flow d -> out "Нет"
flow out -> e
\`\`\`

## Expected result

A vertical flowchart with a check diamond and the return arrow of the loop.

## Typical mistakes

- A decision with one branch only or branches without labels.
- A flow from a block into itself is an error.
- Several "Start" blocks.` },
    { id: 'board-tools-guide', title: "How to use the board toolbar", body: `## Goal

Build a diagram with the mouse without typing the code by hand.

## Steps

1. Open a new DFD diagram (the "DFD" template) and clear the extra lines, leaving the header \`diagram dfd "My process"\`.
2. Press **Element** and drag "Process" onto the canvas, then "Entity".
3. Press **Connect**, choose the link type, press the entity, then the process. The mode is highlighted, Esc leaves it.
4. Press a block (it gets selected), then **Rename** or double-click: type "Accept order" and Enter.
5. Move a block with the mouse or the keyboard arrows (Shift for a big step).
6. Select a spare block and press **Delete**: its links disappear too.
7. Look at the code: every action added or changed lines; the places are written as \`pos=XxY\`.

## Expected result

The diagram is built without typing code, and the code is correct with no errors.

## Typical mistakes

- The message "Not added" or "The link is refused": the change would create an error of the notation, read the reason in the status line.
- Rename and Delete are disabled: press a block first.
- A block does not move: the own engine is not chosen.
- In the Connect mode a press picks a block and does not move it; leave the mode (Esc).` },
    { id: 'move-projects', title: "How to move projects to another computer", body: `## Goal

Get your diagrams on another computer or in another browser.

The data lives in the browser, so "moving" is done by saving the code.

## Way 1. Files one by one

1. Open a project in the editor.
2. The menu "⋯" → **Share** copies the code to the clipboard. Paste it into a text file with the extension \`.dsl\`.
3. On the other computer create a new diagram and choose "Import from a file" (\`.dsl\` files are accepted), or paste the code into the editor and press Ctrl+S.

## Way 2. HTML export

The menu "⋯" → **Export HTML** saves a page with the drawing and the source code: handy for an archive and for sending to colleagues.

## Way 3. Through the browser console (for advanced users)

Run this in the console of the page to get your data as text:

\`\`\`
JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith('dslkit.'))))
\`\`\`

Save the result to a file. On the other computer (at the same site address) run \`localStorage.setItem(key, value)\` for every pair. Passwords move as hashes and keep working.

## Expected result

The diagrams are available at the new place.

## Typical mistakes

- A different site address (localhost and 127.0.0.1) is a different store.
- Not all keys are moved: projects are in \`dslkit.projects.<account id>\` and the account itself in \`dslkit.accounts\`.
- Clearing the site data before the move erases the projects.` },
    { id: 'fix-errors', title: "How to fix errors in a diagram (problems panel and assistant)", body: `## Goal

Learn to read the editor messages and fix the code fast.

## Steps

1. Paste code with deliberate errors:

\`\`\`
diagram idef0 "Order process"
box A0 "Process order" {
 input: Order
 contro: Rules
 output: Invoice
}
box A1 "Ship goods" {
 input: Invoice
\`\`\`

2. Look at the bottom "Problems" panel: each row is an icon (error or warning), the text and a link "order.dsl:4".
3. Press the link: the cursor goes to the line. Line 4 says "Unrecognized line" (a typo in \`control\`), and boxes A0 and A1 report "has no control" and "has no output".
4. Fix the typo \`contro\` → \`control\`, add \`control: Rules\` and \`output: Shipment\` to block A1 and close it with a line \`}\`. The errors go, a warning about the number of boxes on a decomposition may stay (a third box removes it).
5. Press **Fix** on a problem, or open the assistant tab and press "Fix errors": the assistant applies its autofix rules to the code.
6. The "Format" button (menu "⋯") sets the indents, and "Check" runs the check and shows the first problem.
7. When there are no errors the Run button is active again.

## Expected result

"No problems" and the diagram is drawn.

## Typical mistakes

- Fixing one error reveals others: the parser reports all it sees, cure them in line order.
- Warnings (⚠) do not stop the run, but point to flaws against the rules of the notation: read them.
- The assistant works offline by rules and does not understand free questions.` },
    { id: 'keyboard-only', title: "Hotkeys and the keyboard without a mouse", body: `## Goal

Work in the editor with the keyboard only.

## Steps

1. **Ctrl+K** moves to the diagram search, Enter opens the list with the query.
2. In the editor put the cursor in the code and type. **Tab** adds an indent, **Enter** keeps it.
3. **Ctrl+Enter** draws, **Ctrl+S** saves, **Ctrl+F** opens search and replace ("Replace all").
4. **Tab** over the page elements moves the focus to the buttons; activate with Enter or Space.
5. The blocks of the diagram are reachable by keyboard: on the canvas Tab moves between blocks (each has the role "button" and its id as a label), **arrows** move a block by 10, **Shift+arrows** by 50, **Delete** removes it.
6. Linking: turn on "Connect", press Enter or Space on the first block, move to the second and press Enter again. Esc leaves the mode.
7. File tabs: arrows, Home, End.
8. Esc closes the side panels and the rename field.

## Expected result

The full cycle "write, check, draw, save" with no mouse.

## Typical mistakes

- The focus is in the code field: keys like Delete act on the text, not on a block. Move to the canvas with Tab.
- Ctrl+S in a browser opens the page save dialog by default; in the editor it is intercepted, but outside the editor field the focus may be on another page.` },
    { id: 'own-api', title: "How to connect your own rendering API", body: `## Goal

Draw diagrams on your own DSLKit server or on your own Kroki instance.

## Option A. The DSLKit server

1. In the root of the repository run \`npm start\` (it is \`node tools/serve.js site 5173\`). The site and the API answer at one address: http://localhost:5173.
2. In "Settings" → "Diagram generation engine" choose "DSLKit server (own API)".
3. In the editor press Run: the code goes by a POST request to \`/api/render\`, the server returns the SVG.
4. Test the API by hand (the body may be plain text or JSON like \`{"source": "..."}\`; the file diagram.dsl holds the diagram code):

\`\`\`
curl -X POST http://localhost:5173/api/render -H "Content-Type: text/plain" -H "Accept: image/svg+xml" --data-binary @diagram.dsl -o diagram.svg
\`\`\`

Other endpoints: \`GET /api/notations\`, \`GET /api/grammar\`, \`GET /api/engines\`, \`POST /api/validate\`, \`POST /api/parse\`, \`POST /api/generate\`.

## Option B. Your own Kroki

Start the server with an environment variable that points to your Kroki:

\`\`\`
KROKI_URL=http://localhost:8000 npm start
\`\`\`

Then \`POST /api/external/<language>\` (graphviz, mermaid, plantuml, d2 and others) is proxied to your instance. For the "Kroki ·" engines the browser itself uses the address from site/js/api/config.js (\`baseUrl\`); change it and allow the new address in the CSP of the server (tools/server.js, \`connect-src\`).

## Expected result

The status line of the editor names the chosen engine and the diagram is drawn.

## Typical mistakes

- The page is opened as static files (no tools/serve.js): \`/api/render\` does not exist, a server error follows.
- A source longer than 100,000 characters: the answer 413.
- Code 422: a header with an unknown notation, the body lists the problems.
- The CSP blocks a foreign address unless you add it to \`connect-src\`.` },
  ],
  code: [
    { id: 'architecture', title: "Architecture and folder map", body: `DSLKit is a static site with no build step: the browser loads ES modules directly, and a server is needed only to serve the files and for the optional API.

\`\`\`
site/            the site (RU in site/app, EN in site/en/app, shared css, js, images)
  js/components  one module per page feature
  js/notations   language, parsing, rules and drawing of the notations
  js/engines     rendering engines (own, Kroki, DSLKit server)
  js/api         the HTTP client and its settings
  js/storage     stores: projects, templates, accounts, starter data
  js/utils       pure functions: palette, import, export, i18n, storage
  js/docs        the texts of this documentation
  sw.js          the service worker (offline)
tools/           the server (server.js, serve.js), the API (render-api.js), report building
labs/            lab works with node:test tests
docs/            the language reference (generated), walkthroughs, project state
testing-course/  e2e scenarios and reports of the testing course
react-app/       a separate React application of lab 7
\`\`\`

## Main principles

- **A module is a function initX({ root, storage, ... })**. A component finds its own markup and returns \`null\` if the page has none. Everything outside (time, timers, clipboard, navigation, \`fetch\`) arrives as a parameter, so tests replace it.
- **The code is the single source of truth**. The diagram, the palette, dragging and the assistant change only the code text and then send the event \`dslkit:run\`; the drawing is built from the code.
- **Pure logic apart from the DOM**: parsing, palette, formatting and import live in notations/ and utils/ and are tested without a browser.
- **Russian is the source language**; English is added with \`{ ru, en }\` dictionaries or rules in i18n.js.` },
    { id: 'boot', title: "Loading: script.js, boot and the component list", body: `Every page loads one module, site/js/script.js. It imports all the components, collects them into the array \`COMPONENTS\` and starts them.

\`\`\`
export const COMPONENTS = [initTheme, initBurger, initAuthGate, initAuthMenu, initAccordion,
  initNotationFilter, initWaitlistForm, initAuthForm, initDashboard, initQuota, initWelcome,
  initAppSearch, initSettings, initEditor, initEditorProjects, initCodeInput, initEditorActions,
  initEditorTools, initEditorPalette, initExport, initImport, initTour, initCanvasDrag,
  initDiagramRunner];

export const boot = (root, { components = COMPONENTS, logger = console } = {}) => { ... };
\`\`\`

- \`boot(root)\` creates the store \`getStorage(window)\` (localStorage with an in-memory fallback) and calls \`init({ root, storage })\` one by one.
- If a component returns a truthy value its name goes into the list of started ones. An exception of a component is caught and written to \`logger.error\`, the others go on.
- **The order matters**: the theme and the menu go first, \`initAuthGate\` before components that read data; \`initEditor\` and \`initEditorProjects\` put the code in the editor before \`initCodeInput\`, \`initEditorActions\` and \`initEditorPalette\` subscribe to its changes; \`initDiagramRunner\` is last and draws once everything is ready.
- The block \`/* node:coverage disable */\` around the start at the end of the file excludes from coverage only the line that runs in a real browser.
- After that \`registerServiceWorker\` (pwa.js) is called.

To add a component, create a file in components/, export \`initName\`, add it to the imports and to \`COMPONENTS\` with the order in mind.` },
    { id: 'dsl-parsing', title: "The DSL and parsing: parseDiagram, the model, problems", body: `The input of parsing is a code string, the output is a **model**.

\`\`\`
import { parseDiagram, formatProblem } from './notations/index.js';
const model = parseDiagram(source);
// model.notation  'dfd' | 'uml-class' | ... | undefined for bare IDEF0 without a header
// model.title     the title from the header
// model.problems  [{ line, severity: 'error'|'warning', code, params }]
// model.empty     true when nothing can be parsed (no notation)
formatProblem(model.problems[0], 'en');
\`\`\`

## Steps of parseDiagram

1. \`sourceLines\` (common.js) numbers lines from one, dropping empty ones and \`//\` comments.
2. \`parseHeader\` parses \`diagram <notation> [kind] ["Title"]\` with a regular expression. Without a header the code is read as old IDEF0 with the warning \`no-header\`.
3. For \`uml\` the key becomes \`uml-<kind>\`. An unknown notation or kind gives an \`empty\` model with the error \`header-unknown\`, \`header-kind\` or \`header-kind-unknown\`.
4. \`NOTATIONS[key].parse(lines, header, source)\` builds the model of the notation.
5. \`strictProblems\` from strict.js are added, then everything is sorted by line (stable).

## A problem

A problem is \`{ line, severity, code, params }\`, created by \`problem(line, severity, code, params)\`. The text is not stored in it: \`formatProblem(problem, lang)\` takes the template from \`MESSAGES[code]\` (messages.js, \`{ ru, en }\` pairs with \`{name}\` substitution). So one check prints its message in any language, and the API returns both the \`code\` and the ready \`message\`.

## strict.js

Shared strict rules on top of the rules of a notation: a wrong \`pos=\`, repeated links, loops in notations where they are not allowed, ids that differ only in case, equal labels, DFD stores "write only/read only", gaps in IDEF0 numbering. They do not replace the rules of a notation, they catch typical mistakes.

## Graph notations

Most notations are defined through \`defineGraph({ notation, nodes, edges, kinds, edgeKinds, validate })\` (graph.js): a shared "node and link" parser and renderer, while the notation supplies the words, shapes and the \`validate\` function. IDEF0, ER, classes, sequences and timing have parsers of their own.

When you add an error code, put it in \`MESSAGES\` in both languages, or the dictionary completeness test fails.` },
    { id: 'notations', title: "Notations and how to add a new one", body: `The registry of notations is the object \`NOTATIONS\` in notations/index.js. An entry is created by \`entry(short, ru, en, impl)\`.

\`\`\`
mindmap: entry('Mind map', 'Ментальная карта', 'Mind map', fromSpec(mindmap)),
\`\`\`

An implementation gives: \`parse(lines, header, source)\`, \`generators\` (text formats for Kroki: \`graphviz\`, \`mermaid\`, \`plantuml\`) and \`render(model)\` that returns an SVG string. \`fromSpec\` takes them from a \`defineGraph\` description and adds the lists \`nodes\` and \`edges\` from which the palette of the editor is built.

## Adding a graph notation

1. In specs.js, specs-more.js or specs-uml.js describe a \`defineGraph\`: the node words (\`nodes\`), the link words (\`edges\`), for every kind a shape (\`shape\` from svg.js), a size (\`sizer\`), code for dot, mermaid and plantuml, and a \`validate\` function that returns problems.
2. Register it in \`NOTATIONS\` with a key (\`uml-kind\` for UML) and names in two languages.
3. Add a template to templates.js: it must parse with **no errors** (a test checks this) and it will appear in "Shared", the starter projects and the API.
4. Add the codes of the new problems to messages.js (ru and en) and the keywords to \`KEYWORDS\` (highlighting).
5. Add names for the palette in utils/palette.js (\`NAMES\`, and \`OWN\` and \`OWN_LINKS\` for special syntax).
6. Run \`npm run dsl:reference\`: the reference docs/DSL-REFERENCE.md updates itself.
7. Write tests and bring the coverage to 100%.

## Checking your notation in Node

\`\`\`
node --input-type=module -e "import('./site/js/notations/index.js').then(m => console.log(m.parseDiagram(m.TEMPLATES.mindmap).problems))"
\`\`\`

An empty array means a template with no problems.` },
    { id: 'rendering', title: "Rendering: renderNotation, svg.js, local-engine, sanitizeSvg", body: `A diagram is drawn in three steps: the model, an SVG string, cleaning and insertion into the page.

## renderNotation

\`renderNotation(model)\` calls \`NOTATIONS[key].render(model)\`. \`hasLocalRenderer(model)\` tells whether the model has a notation; bare IDEF0 without a header is drawn by the old layout in local-engine.js.

## svg.js

Shared parts for graph notations: arrow markers (\`arrow\`, \`triangle\`, \`diamond\`, ER cardinality marks), the dictionary of shapes \`SHAPES\` (rect, rounded, circle, diamond, pill, parallelogram, hexagon, cylinder, document and so on), the functions \`text\`, \`sizer\` and \`fixed\`. The width of a label is computed from a table of letter widths (\`textWidth\` in common.js), not from the number of characters; long labels are wrapped by \`wrap\`. Every node gets the attributes \`data-id\`, \`data-cx\`, \`data-cy\` and the class \`notation__node\`: dragging, selection and the palette work through them.

## local-engine.js

\`renderLocal(model)\` is the "own engine": it returns live SVG with no network. The whole string is built with \`escapeXml\` for any user text.

## sanitizeSvg

A drawing from an outside server cannot be inserted as is. \`sanitizeSvg(svgText, DOMParser)\` from utils/dataParser.js:

- parses the text as XML and rejects parse errors and a non-SVG root;
- removes the tags \`script, foreignObject, iframe, object, embed, style, use, image, feImage, set, animate, animateTransform, animateMotion\` and elements of foreign namespaces;
- removes \`on*\` attributes, \`href\` links that do not start with \`#\` or \`http(s)://\` (control characters inside the scheme are removed before the check), and \`style\` with \`url(\`, \`expression(\`, \`javascript:\` or a backslash.

DiagramRunner applies it to the SVG of every engine, the own one included, and only the cleaned node enters \`.canvas__remote\`.` },
    { id: 'engines-api', title: "Engines and API: engines.js, apiService.js, render-api.js", body: `## engines.js

\`ENGINES\` is the list of engines: \`graphviz\`, \`mermaid\`, \`plantuml\` (through Kroki), \`dslkit\` (own server) and \`local\` (in the browser). Each has an \`id\`, a \`label\`, a \`type\` (the Kroki endpoint, \`'dslkit'\`, or \`null\` for the browser) and a \`build(model, source)\` that prepares the input. \`DEFAULT_ENGINE_ID = 'local'\`, \`findEngine(id)\` returns the default for an unknown id, \`engineForFormat(format)\` picks an engine when the chosen one cannot produce the needed language (\`pickFormat\` from notations/index.js).

## apiService.js

\`createApi({ config, fetchImpl, sleep })\` builds the client: \`fetchData\`, \`postData\`, \`checkHealth\`, \`renderDiagram\`.

- A timeout through \`AbortController\` (\`timeoutMs\` = 10 s) together with the outer \`signal\`.
- Retries (\`retries\` = 3) only for network errors, 429 and 5xx, with the exponential pause \`retryDelayMs · 2^n\` (capped by \`maxRetryDelayMs\`) and the \`Retry-After\` header. A timeout is not retried.
- Equal parallel requests without a \`signal\` share one promise.
- \`ApiError\` has a \`kind\` (\`network, timeout, aborted, http, invalid\`) and a \`status\`; diagram-runner turns them into human messages.
- For the type \`dslkit\` \`renderDiagram\` sends JSON \`{source}\` to \`ownPath\` (\`/api/render\`), for the others a text to \`/<type>/svg\` of the Kroki address. An answer without \`<svg\` is rejected.

The settings are in site/js/api/config.js (\`API_CONFIG\`: \`baseUrl: 'https://kroki.io'\`, \`ownPath\`, \`cacheTtlMs\` 24 h).

## tools/render-api.js

The own API on the same parsers and renderers as the editor. \`handleApi(req, res, { fetchImpl, krokiUrl })\` is called by \`staticServer\` for \`/api/*\` paths.

\`\`\`
GET  /api/notations     list of notations (id, short, name, header, formats, nodes, edges), ?lang=ru|en
GET  /api/grammar       grammar of the header and lines
GET  /api/engines       the own engine and the external languages
POST /api/validate      { source, lang } -> { notation, valid, problems }
POST /api/parse         ... -> the same plus model
POST /api/generate      { source, format, lang } -> Graphviz, Mermaid or PlantUML text
POST /api/render        { source, lang } -> JSON with svg, or SVG with Accept: image/svg+xml
POST /api/external/<language>  proxies the source to a Kroki-compatible service (KROKI_URL)
\`\`\`

- Body: JSON \`{source}\` or plain text; the limit \`MAX_SOURCE\` = 100,000 characters (413), an empty source is 400, invalid JSON is 400, a wrong method is 405 with \`Allow\`, an unknown notation at render is 422 with a list of problems.
- The address of the external service comes from the environment variable \`KROKI_URL\` (default https://kroki.io), timeout 10 s.
- API answers are not cached (\`Cache-Control: no-store\`).` },
    { id: 'storage', title: "Stores: localStorage, projects.js, accounts.js, seeds.js", body: `## utils/storage.js

\`createStorage(backend, prefix = 'dslkit.')\` gives \`get(key, fallback)\`, \`set\`, \`remove\`. Values are kept as JSON, any error (quota, private mode, broken JSON) becomes the fallback value or \`false\`: exceptions do not leak out. \`getStorage(window)\` substitutes \`createMemoryBackend()\` when localStorage is unavailable.

## Keys (all with the prefix dslkit.)

\`\`\`
projects[.<id>]     projects (no suffix: guest)
templates[.<id>]    own templates
seeded[.<id>]       flag "starter diagrams already added"
accounts            accounts (password hashes)
session             { userId }
settings            settings (engine, autosave, ...)
theme               light | dark | auto
dashboard           filter, search, sort of the list
likes-<id|guest>    list of likes of shared examples
editor-source       editor code (autosave)
editor-tab, editor-view, git-commits, tour-done
diagram_cache, run_history   SVG cache (20 entries, TTL 24 h) and the last 5 runs
\`\`\`

## projects.js

\`createProjectStore({ storage, now, owner })\`: \`list, listTrash, get, save, rename, trash, restore, remove, purgeExpired, seed, createdOn\`. Every project passes the \`valid\` check (broken records are dropped), the list is limited to 200 records. The id is made from the time and a counter. \`trash\` sets \`trashedAt\`, \`purgeExpired\` deletes records older than \`TRASH_DAYS = 30\`. \`createdOn\` counts new projects of a calendar day without \`seed\`. \`createTemplateStore\` is the same for templates without a trash. \`DAILY_LIMIT = 5\`, \`quotaLabel\` and \`showQuota\` print the label and the bar; the limit is not enforced.

## accounts.js

\`createAccountStore({ storage, crypto, now })\`: \`register, login, logout, current\`. The hash is PBKDF2-SHA-256, \`ITERATIONS = 100000\`, a 16-byte salt; the comparison takes constant time (\`same\`); for an unknown email the hash is computed with a fixed salt so the response time does not reveal whether an account exists. \`currentUser(storage)\` only reads the session. Every method returns \`{ ok, ... }\` and throws nothing for wrong data.

## seeds.js

\`starterProjects()\` builds the starter set, one project per notation from \`TEMPLATES\` with an age and a publication flag; \`store.seed(...)\` adds them once.

## Rule

Any new key has the prefix and goes through \`storage\`, and user data carries the \`owner\` suffix.` },
    { id: 'editor-components', title: "Editor components and events", body: `The editor is made of independent components that talk through the DOM and two events.

## Events

- **\`dslkit:run\`** (on a page element, \`bubbles\`) means "redraw and recheck". It is sent by the Run button, Ctrl+Enter, templates, undo/redo, the palette, dragging, the assistant and import. \`diagram-runner\` listens.
- **\`dslkit:save\`** means "save now". It is sent by the button and Ctrl+S, and heard by \`editor-projects\` (the project) and \`source-autosave\` (the editor code).
- \`dslkit:close\` means the last file is closed, \`editor-projects\` leads to the list.

## Components

- **code-lines.js**: \`readCode(lines)\` and \`showCode(root, lines, text)\`. The code is kept as a list of \`<li><code>\` lines with highlighting; this is the shared "bridge" between components.
- **code-input.js**: a transparent \`textarea\` over the highlighted lines: Tab, Enter with an indent, "}" with a back indent, the cursor position, moving the focus to a problem line. The run is delayed by \`RUN_DELAY_MS = 350\` after typing.
- **editor.js**: file tabs, the close dialog, the autosave switch, the "Code/Canvas" views, the Run button, templates and the choice of notation.
- **editor-projects.js**: the link to the project list: the address \`?p=\`, \`?template=\`, \`?tpl=\`, \`?my=\`, saving and autosaving of the project (\`PROJECT_AUTOSAVE_MS = 1000\`), the explorer.
- **editor-actions.js**: undo/redo (up to 100 states through \`MutationObserver\`), save, check, format, share, auto layout, theme, zoom (\`ZOOM_MIN 0.5\`, \`ZOOM_MAX 3\`, \`ZOOM_STEP 0.25\`).
- **editor-tools.js**: search and replace, local Git (commits in \`git-commits\`, diff by \`diffLines\`), the offline \`assistant()\` from utils/editor-tools.js, the tabs "Problems / Assistant / Output / Versions".
- **editor-palette.js**: the board tools: adding (press and drag), Connect, Rename, Delete. Every change passes \`gate(before, after)\` from utils/palette.js: if a new **error** appears the edit is refused.
- **canvas-drag.js**: dragging blocks by mouse, finger and arrows; the new place is written by \`setNodePosition\` as \`pos=XxY\` (node-position.js).
- **diagram-runner.js**: the main run: parsing, the problems panel (\`showProblems\`), choice of engine, cache, history, statuses, SVG cleaning, insertion.
- **problems-panel.js**, **import-menu.js**, **export-menu.js**, **tour.js**, **quota.js**, **auth.js**, **auth-gate.js**, **dashboard.js**, **settings.js**, **theme.js**, **pwa.js** are the other components.

## How to write a component

\`\`\`
export const initThing = ({ root = document, storage, now = () => Date.now() } = {}) => {
  const page = root.querySelector('.app-page--editor');
  if (!page) return null;                    // no markup - do not start
  page.addEventListener('dslkit:run', () => { /* reaction */ });
  return { /* what the tests need */ };
};
\`\`\`` },
    { id: 'tests', title: "Tests: node:test, jsdom, the 100% threshold", body: `Tests use the built-in runner \`node:test\` and \`node:assert/strict\`, and \`jsdom\` provides the DOM.

## Running

\`\`\`
npm test
\`\`\`

This is the command \`node --test --experimental-test-coverage --test-coverage-lines=100 --test-coverage-branches=100 --test-coverage-functions=100 "labs/**/*.test.js" "tools/**/*.test.js"\`. **The threshold is 100% of lines, branches and functions**: if an uncovered line exists the command fails. One file: \`node --test labs/05-javascript-interactivity/theme.test.js\`.

## Where things are

- labs/05-javascript-interactivity: components and stores (dashboard, editor-*, projects, accounts, auth, tour, settings...).
- labs/06-async-api-storage: apiService, engines, diagram-runner, import.
- tools/*.test.js: the server, the API, report building.
- Each lab has a report.test.js that checks the report.

## How to write a component test

\`\`\`
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { createMemoryBackend, createStorage } from '../../site/js/utils/storage.js';

const load = (page) => new JSDOM(readFileSync('site/' + page, 'utf8'), { url: 'http://localhost/' }).window;
const memory = () => createStorage(createMemoryBackend());

test('what the component does', () => {
  const { document } = load('app/editor.html');
  const api = initThing({ root: document, storage: memory() });
  assert.ok(api);
});
\`\`\`

## Rules

- The real pages site/*.html are loaded into jsdom: tests check the markup and the code together.
- Pass time, timers, \`fetch\`, the clipboard, \`crypto\` and navigation as parameters and replace them.
- Every \`if\` branch needs a test. If a branch is unreachable, remove it from the code rather than disable coverage; \`/* node:coverage disable */\` is allowed only for the start line that runs in a real browser.
- A new notation: a test that its template parses with no problems, and tests of every check rule (one per error and per warning).
- Tests that create accounts keep data in memory only.` },
    { id: 'style-css', title: "Code style and CSS rules", body: `## JavaScript

- ES modules, no build and no outside libraries in the browser (\`lodash\` is only a dependency of the build).
- Prettier (.prettierrc): semicolons, single quotes, width 160. Commands \`npm run format\` and \`npm run format:check\`. EditorConfig: UTF-8, LF, two spaces.
- Arrow functions and \`const\`; functions are small and pure, side effects sit at the edge (in \`init...\`).
- Dependencies are passed as default parameters (\`now = () => Date.now()\`).
- User errors do not throw: functions return \`{ ok, error }\` or a problem.
- A comment explains **why**, not what the code says.
- Any user text goes into the DOM through \`textContent\` or \`createElement\`; \`innerHTML\` is allowed only for constant icons.

## CSS

- Files are imported in style.css in this order: variables, base, components, header, main, footer, pages, app, auth, editor, adaptive.
- Colours, spacing and fonts come only from the variables of variables.css; the light and dark themes override the variables by \`[data-theme]\`.
- BEM names: \`block__element--modifier\` (\`project-card__title\`, \`editor-tabs__tab--active\`). No ids in selectors and no \`!important\`.
- Responsive design is mobile first: base styles for a phone, extensions by \`@media (min-width)\` in adaptive.css.
- Interactive elements have a visible \`:focus-visible\` and contrast of at least AA (check: tools/contrast.js).
- Hidden helper text uses the class \`visually-hidden\`, not \`display:none\` (screen readers).

## Accessibility

Icon buttons have \`aria-label\` and \`data-tip\`; states use \`aria-pressed\`, \`aria-expanded\`, \`aria-disabled\`, \`aria-current\`; messages use \`role="status"\` with \`aria-live="polite"\`.` },
    { id: 'reports-build', title: "Building reports and the reference", body: `Lab reports and the language reference are generated from the code, so they never differ from it.

## Reports

Every lab (labs/NN-...) holds the templates \`report.tpl.md\` (Russian) and \`report.en.tpl.md\` (English) and the results \`report.md\`, \`report.en.md\`. Building:

\`\`\`
npm run lab5:report          # node tools/build.js labs/05-javascript-interactivity
npm run lab1:report          # first generates the data, then builds the report
\`\`\`

\`tools/build.js\` reads the template, passes it to \`build(template, read, variant)\` from build-report.js and writes the finished file. Templates have insertions from files and from the variant data (variant.json, tools/variant.js), so edit the template, not the finished \`report.md\`. The tests \`report.test.js\` and \`lint-report.js\` check that the report is built and the links are alive.

## The language reference

\`\`\`
npm run dsl:reference        # node tools/dsl-reference-cli.js docs
\`\`\`

The command writes docs/DSL-REFERENCE.md and DSL-REFERENCE.en.md: the parsing pipeline, the grammar, the API table and a section per notation (header, elements, links, export formats, an example from \`TEMPLATES\`). The file is not edited by hand.

## Other

- \`npm run design:generate\` and \`design:build\`: design materials.
- \`npm run lab2:generate\`: the environment checks of lab 2.
- \`npm run tc:reports\`: reports of the testing course.
- tools/make-postman.js and http-to-postman.js build a Postman collection from HTTP requests.` },
    { id: 'add-page-language', title: "How to add a page or a language", body: `## A new application page

1. Copy a similar page from site/app/ (for example settings.html) and its English version from site/en/app/. Keep the shared header, the side menu, the skip link, \`<script type="module" src="../js/script.js">\` (\`../../js/script.js\` in EN) and \`<link rel="stylesheet" href="../css/style.css">\`.
2. If the page is for signed-in users only, add the attribute \`data-requires-auth\` to \`<body>\`: \`initAuthGate\` will send a guest to login.html.
3. If the page has its own interactivity, create a component and add it to \`COMPONENTS\` (see "Loading").
4. Add the page to the \`SHELL\` list of site/sw.js and raise the cache \`VERSION\`, otherwise the offline copy stays old.
5. If the page is public, add it to site/sitemap.xml; for closed ones set \`<meta name="robots" content="noindex">\`.
6. Add a test: load the page in jsdom and check the markup and the component. The markup is validated by html-validate.

## A new interface language

There are two languages now: Russian (the source) and English. For a third one:

1. Create the page tree site/<code>/ on the model of site/en/ and set \`lang="<code>"\` on \`<html>\`. Add \`hreflang\` links to the switches.
2. Components choose the language with \`root.documentElement.lang === 'en' ? 'en' : 'ru'\` and \`{ ru, en }\` dictionaries. Extend them with a third key and the language function, for example move it to a shared \`langOf(root)\`.
3. Add the translation to \`MESSAGES\` (notations/messages.js), the palette (\`NAMES\` in utils/palette.js), the notation names (\`entry\` in index.js) and the rules of utils/i18n.js.
4. The texts of this documentation are site/js/docs/content.<code>.js with the same section \`id\`s.
5. Add the language to the API (\`LANGS\` in tools/render-api.js).

The dictionary completeness test must check that every key has all the languages.` },
    { id: 'security', title: "Security: CSP, SVG cleaning, password hashing", body: `## Content-Security-Policy and headers

tools/server.js sends every answer with the headers \`SECURITY_HEADERS\`. The main one:

\`\`\`
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;
font-src 'self'; connect-src 'self' https://kroki.io; manifest-src 'self'; worker-src 'self';
object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'
\`\`\`

- Scripts only from your site: the pages have **no inline scripts**, and any new \`<script>\` must be a file.
- \`connect-src\` lets the page talk only to the site itself and kroki.io. Another API address must be added here explicitly.
- \`style-src 'unsafe-inline'\` is needed because drawings of services carry \`style\` attributes; it is safe only thanks to the SVG cleaning.
- Also: \`X-Content-Type-Options: nosniff\`, \`X-Frame-Options: DENY\`, \`Referrer-Policy\`, \`Permissions-Policy\` (camera, microphone, geolocation off), \`Cross-Origin-Opener-Policy: same-origin\`.
- The static server cannot be led out of the root (\`..\` gives 403), allows only GET and HEAD (405), serves error pages and a weak ETag (304).

## SVG cleaning

Any SVG passes \`sanitizeSvg\` before insertion (see "Rendering"): no scripts, event handlers, \`foreignObject\`, outside loads or unsafe links. The drawing is inserted as a DOM node, not as an HTML string.

## Passwords and the session

PBKDF2-SHA-256, 100,000 iterations, a random 16-byte salt, constant-time comparison, the same error for a wrong email and a wrong password, time equalisation for a nonexistent account. The password is written neither to storage nor to a log. As the data lives in the browser, the hash protects against reading the password directly, but not against a person with access to the browser profile.

## User input

- Text in SVG is escaped by \`escapeXml\` (control characters included).
- Text in the DOM goes through \`textContent\`.
- Input size is limited: 100,000 characters in the API, 200,000 in import, 200 records in a list.
- A failure message gives a code and a status, not internals.

For more on the policy see SECURITY.md in the repository root.` },
  ],
};
