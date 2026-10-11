# Laboratory Work 2. Setting Up the Web Development Environment

## 1 Purpose of the Work

Gain practical skills in setting up a modern web development environment: master version control, create and configure a project, and study the features of the integrated development environment and design tools on the example of the DSLKit project related to the future course project.

## 2 Brief Theoretical Background

**Web development process.** The life cycle covers requirements analysis, design, implementation, testing, deployment and maintenance. A working environment shortens the path from an idea to a verifiable result.

**Version control.** Git stores the project history as commits, supports branches and synchronises with a remote GitHub repository. Main commands: `git init`, `git add`, `git commit`, `git push`.

**Node.js and npm.** Node.js runs JavaScript outside the browser. The npm package manager installs dependencies from `package.json`: regular ones (`dependencies`) and those needed only for development (`devDependencies`).

**Code editor.** Visual Studio Code combines an editor, a terminal, a debugger and the Source Control panel. Extensions add formatting, a live server and Git tools.

**Figma.** A cloud interface editor where moodboards, palettes, typography and page prototypes are created before layout work.

## 3 Progress of the Work

### 3.1 Project Topic Selection

The project topic is DSLKit, a web IDE for diagrams as code. The project and repository name `DSLKit-Project` extends easily into a course project: the site lives in the `site` folder, laboratory works in `labs` and helper tools in `tools`.

### 3.2 Software Installation and Verification

The installation is verified by the `npm run check:env` script from appendix B. It runs `node --version`, `npm --version`, `git --version`, reads the Git settings and checks the project files. The results are given in the table below, and for every failed check the script prints the cause and the way to fix it.

{{include:labs/02-environment/generated/check.en.md}}

### 3.3 Visual Studio Code Setup

The required extensions are installed: Live Server, Auto Rename Tag, Prettier, GitLens, ES6 String HTML and Figma to Code. The recommended extensions are listed in `.vscode/extensions.json`, so the editor offers to install them when the project is opened on another computer. The `.vscode/settings.json` file enables formatting on save (`editor.formatOnSave`) and makes Prettier the default formatter.

### 3.4 Project Structure and Base Files

The structure `site/css`, `site/js`, `site/assets`, `site/images`, `site/design` was created. Base files: `site/index.html` with HTML5 markup, `site/css/style.css` with base styles and `site/js/script.js` with a simple script. Empty folders are pinned by `.gitkeep` files because Git does not store empty directories.

### 3.5 Version Control Work

The repository was created with `git init` and linked to GitHub with `git remote add origin`. The `.gitignore` file excludes `node_modules/`, `.DS_Store`, `*.log`, `coverage/` and `.env`. Changes are recorded as separate commits by stage: project structure, base files, tool setup. Each laboratory work gets its own branch and a finished work is merged into `main`. The `.gitattributes` file sets the same line endings for Windows and Linux.

### 3.6 Development Tool Integration

The project was initialised with `npm init`. The `lodash` dependency and the development tools `nodemon`, `prettier` and `jsdom` are installed. The `npm run dev` command starts the static server from `tools/server.js` under nodemon: when files in the `site` folder change, the server restarts. The server handles errors: it answers 403 for addresses outside the project, 404 for unknown files, 400 for malformed addresses, 405 for unsupported methods and 500 when reading a file fails. The `.prettierrc` file holds `semi: true` and `singleQuote: true`, and `npm run format` brings all code to one style.

### 3.7 Design in Figma

The designs are prepared as SVG files in `site/design/figma` that can be dragged onto a Figma canvas. The generator `labs/02-environment/figma-assets.js` builds them from the same design tokens. The colour palette of the light and dark themes with contrast ratios is shown in Figure 1.

![Colour palette of the light and dark themes](../../site/design/figma/palette.svg)

Figure 1 – DSLKit colour palette for the light and dark themes

The chosen fonts and sizes are shown in Figure 2: Inter for the interface and JetBrains Mono for code.

![Project typography](../../site/design/figma/typography.svg)

Figure 2 – Project typography: fonts, sizes and line heights

The general visual language is shown in Figure 3: minimalism, whitespace, the golden ratio and thin lines.

![Project moodboard](../../site/design/figma/moodboard.svg)

Figure 3 – DSLKit moodboard

The desktop prototype of the home page is shown in Figure 4.

![Desktop prototype of the home page](../../site/design/figma/home-desktop.svg)

Figure 4 – DSLKit home page prototype for a 1440 pixel wide screen

The mobile prototype is shown in Figure 5: the navigation is replaced with a menu button and the cards are in one column.

![Mobile prototype of the home page](../../site/design/figma/home-mobile.svg)

Figure 5 – DSLKit home page prototype for a 390 pixel wide screen

The Figma file link is stored in `site/design/figma-link.txt`.

### 3.8 Project Documentation

The `README.md` file in the repository root contains the project description, the list of technologies, links to the repository and the Figma design, run commands and the folder structure.

## 4 Answers to Control Questions

1. **Advantages of VS Code and useful extensions.** The editor combines syntax highlighting, a terminal, debugging and Git in one window, and extensions automate routine work. The most useful ones turned out to be Prettier (one style on save), Live Server (quick page checks) and GitLens (line history).
2. **Git integration in VS Code.** The Source Control panel shows changed files, stages them, takes a message and creates a commit. The same steps are done by `git add`, `git commit` and `git push` in the terminal. Branches are switched in the status bar.
3. **Role of Node.js and npm.** Node.js runs build tools, tests and servers, and npm installs dependencies and pins their versions in `package.json`, so the project builds the same way on any computer.
4. **Figma in the development process.** In Figma the palette, fonts and grid are agreed before layout, and sizes and spacing are handed to the developer. Components, styles and the element properties view are the most useful.
5. **Important VS Code settings.** Format on save, the default formatter, one line ending, the Live Server root folder and the list of recommended extensions in `.vscode`.
6. **Why .gitignore is needed.** The file excludes service and generated data from the repository. An example for a web project: `node_modules/`, `.DS_Store`, `*.log`, `coverage/`, `.env`.
7. **Which data to choose for later growth into a course project.** A project and repository name not tied to a work number (`DSLKit-Project`), separate `site`, `labs` and `tools` folders, and file and branch names that follow one convention.
8. **Commands for sending changes.** `git add` stages files, `git commit` creates a commit with a message and `git push` sends the commits to the remote repository.
9. **Checking the Git settings.** `git config user.name` and `git config user.email` print the values. They can be changed with `git config --global user.name "Name"`. The `npm run check:env` script checks both values.
10. **Which files are not added to Git.** Dependencies (`node_modules`), build and coverage output, logs, environment files with secrets (`.env`) and system files. They can be restored with commands or hold confidential data, and without them the repository stays small.

## Conclusion

The web development environment is set up: Node.js, npm, Git and VS Code with extensions are installed and verified, the DSLKit project structure is created, Git and GitHub are connected, and Prettier, nodemon and a static server with error handling are configured. The Figma designs are ready: palette, typography, moodboard and a home page prototype for several screen widths. A correct environment makes the project reproducible on any computer and is the basis for the next works and the course project.

## Appendix A – Listing of check-env.js

{{code:labs/02-environment/check-env.js}}

## Appendix B – Listing of check.js

{{code:labs/02-environment/check.js}}

## Appendix C – Listing of server.js

{{code:tools/server.js}}

## Appendix D – Listing of the tests check-env.test.js

{{code:labs/02-environment/check-env.test.js}}
