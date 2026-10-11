export const HELP = {
  ru: {
    node: [
      'Node.js LTS',
      'Node.js запускает JavaScript вне браузера и нужен для npm, тестов и сборки. Версия ниже 20 не поддерживает современные возможности проекта.',
      'Скачайте LTS-версию с https://nodejs.org/ и проверьте командой `node --version`.',
    ],
    npm: [
      'Менеджер пакетов npm',
      'npm устанавливает зависимости из `package.json`. Он поставляется вместе с Node.js.',
      'Переустановите Node.js и проверьте командой `npm --version`.',
    ],
    git: ['Git', 'Git хранит историю изменений и отправляет код на GitHub.', 'Установите Git с https://git-scm.com/ и проверьте командой `git --version`.'],
    gitName: [
      'Имя в настройках Git',
      'Имя попадает в каждый коммит. Без него коммит подпишется случайными данными или не создастся.',
      'Выполните `git config --global user.name "Ваше Имя"`.',
    ],
    gitEmail: ['Почта в настройках Git', 'Почта связывает коммиты с вашим аккаунтом GitHub.', 'Выполните `git config --global user.email "you@example.com"`.'],
    structure: [
      'Структура проекта',
      'Папки `css`, `js`, `assets`, `images`, `design` и базовые файлы нужны для следующих лабораторных работ.',
      'Создайте недостающее: `mkdir site/css site/js site/assets site/images site/design` и добавьте файлы `index.html`, `css/style.css`, `js/script.js`, `design/figma-link.txt`.',
    ],
    gitignore: [
      'Файл .gitignore',
      'Без правил в репозиторий попадут `node_modules`, логи и системные файлы, а размер репозитория вырастет на сотни мегабайт.',
      'Добавьте строки `node_modules/`, `.DS_Store`, `*.log` в `.gitignore`.',
    ],
    prettier: [
      'Настройки Prettier',
      'Единый стиль кода убирает споры о форматировании и лишние изменения в коммитах.',
      'Создайте `.prettierrc` с содержимым `{ "semi": true, "singleQuote": true }`.',
    ],
    packages: [
      'Пакеты lodash и nodemon',
      'Lodash показывает установку обычной зависимости, nodemon (в `devDependencies`) перезапускает сервер при изменении файлов.',
      'Выполните `npm install lodash` и `npm install --save-dev nodemon`.',
    ],
    format: [
      'Форматирование при сохранении',
      'Параметр `editor.formatOnSave` запускает Prettier при каждом сохранении файла.',
      'Включите в настройках VS Code пункт Editor: Format On Save или добавьте `"editor.formatOnSave": true` в `.vscode/settings.json`.',
    ],
    extensions: [
      'Расширения VS Code',
      'Рекомендованные расширения (Live Server, Auto Rename Tag, Prettier, GitLens, ES6 String HTML, Figma to Code) подсказывает VS Code при открытии проекта.',
      'Добавьте их идентификаторы в `.vscode/extensions.json` и установите через панель расширений Ctrl+Shift+X.',
    ],
    readme: [
      'Файл README.md',
      'README объясняет проект, технологии и ссылки. Без него проверяющему неизвестно, как запускать работу.',
      'Добавьте описание проекта, раздел «Технологии», ссылки на репозиторий GitHub и макет Figma.',
    ],
    figma: [
      'Ссылка на макет Figma',
      'Файл `design/figma-link.txt` хранит адрес макета. Адрес должен вести на figma.com.',
      'Скопируйте ссылку из Figma (Share, Copy link) и сохраните одной строкой в `design/figma-link.txt`.',
    ],
    remote: [
      'Удалённый репозиторий',
      'Без `origin` код хранится только на этом компьютере.',
      'Выполните `git remote add origin https://github.com/ваш-логин/ваш-репозиторий.git`.',
    ],
    commits: [
      'История коммитов',
      'Задание требует несколько коммитов, например после структуры папок и после базовых файлов.',
      'Фиксируйте этапы командами `git add` и `git commit -m "сообщение"`.',
    ],
  },
  en: {
    node: [
      'Node.js LTS',
      'Node.js runs JavaScript outside the browser and is needed for npm, tests and builds. A version below 20 lacks modern features used by the project.',
      'Download the LTS version from https://nodejs.org/ and check it with `node --version`.',
    ],
    npm: [
      'npm package manager',
      'npm installs dependencies listed in `package.json`. It ships with Node.js.',
      'Reinstall Node.js and check with `npm --version`.',
    ],
    git: ['Git', 'Git stores the change history and pushes code to GitHub.', 'Install Git from https://git-scm.com/ and check with `git --version`.'],
    gitName: [
      'Git user name',
      'The name goes into every commit. Without it a commit gets random data or fails.',
      'Run `git config --global user.name "Your Name"`.',
    ],
    gitEmail: ['Git email', 'The email links commits to your GitHub account.', 'Run `git config --global user.email "you@example.com"`.'],
    structure: [
      'Project structure',
      'The `css`, `js`, `assets`, `images`, `design` folders and the base files are needed by the following laboratory works.',
      'Create what is missing: `mkdir site/css site/js site/assets site/images site/design` and add `index.html`, `css/style.css`, `js/script.js`, `design/figma-link.txt`.',
    ],
    gitignore: [
      'The .gitignore file',
      'Without rules the repository collects `node_modules`, logs and system files, and grows by hundreds of megabytes.',
      'Add the lines `node_modules/`, `.DS_Store`, `*.log` to `.gitignore`.',
    ],
    prettier: [
      'Prettier settings',
      'One code style removes formatting arguments and noise in commits.',
      'Create `.prettierrc` with `{ "semi": true, "singleQuote": true }`.',
    ],
    packages: [
      'lodash and nodemon packages',
      'Lodash shows a regular dependency, nodemon (in `devDependencies`) restarts the server when files change.',
      'Run `npm install lodash` and `npm install --save-dev nodemon`.',
    ],
    format: [
      'Format on save',
      'The `editor.formatOnSave` option runs Prettier every time a file is saved.',
      'Enable Editor: Format On Save in the VS Code settings or add `"editor.formatOnSave": true` to `.vscode/settings.json`.',
    ],
    extensions: [
      'VS Code extensions',
      'VS Code suggests the recommended extensions (Live Server, Auto Rename Tag, Prettier, GitLens, ES6 String HTML, Figma to Code) when the project opens.',
      'Add their identifiers to `.vscode/extensions.json` and install them from the Extensions view Ctrl+Shift+X.',
    ],
    readme: [
      'README.md file',
      'README explains the project, technologies and links. Without it a reviewer does not know how to run the work.',
      'Add a project description, a "Technologies" section and links to the GitHub repository and the Figma design.',
    ],
    figma: [
      'Figma design link',
      'The `design/figma-link.txt` file stores the design address. The address must lead to figma.com.',
      'Copy the link in Figma (Share, Copy link) and save it as one line in `design/figma-link.txt`.',
    ],
    remote: [
      'Remote repository',
      'Without `origin` the code exists only on this computer.',
      'Run `git remote add origin https://github.com/your-login/your-repository.git`.',
    ],
    commits: [
      'Commit history',
      'The assignment requires several commits, for example after the folder structure and after the base files.',
      'Record the steps with `git add` and `git commit -m "message"`.',
    ],
  },
};

export const WORDS = {
  ru: {
    check: 'Проверка',
    status: 'Статус',
    detail: 'Подробности',
    ok: 'пройдена',
    fail: 'не пройдена',
    why: 'Зачем это нужно',
    fix: 'Как исправить',
    table: 'Таблица',
    title: 'Результаты проверки окружения',
    done: 'Все проверки пройдены.',
    failed: 'Не пройдено проверок',
  },
  en: {
    check: 'Check',
    status: 'Status',
    detail: 'Details',
    ok: 'passed',
    fail: 'failed',
    why: 'Why it matters',
    fix: 'How to fix',
    table: 'Table',
    title: 'Environment check results',
    done: 'All checks passed.',
    failed: 'Checks failed',
  },
};
