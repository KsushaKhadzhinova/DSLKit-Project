# Ветки и порядок работы

Английская версия: [`BRANCHES.en.md`](BRANCHES.en.md).

## Правила

GitHub Flow и trunk-based: `main` всегда зелёный, любое изменение идёт короткой веткой от свежего `origin/main` (`feat/…`, `fix/…`, `docs/…`, `ci/…`), через pull request. Когда CI на ветке зелёный, `auto-merge.yml` открывает PR и включает автослияние (squash). Слитые ветки удаляются автоматически. Долгих веток и слияний между рабочими ветками нет. Имена: `тип/короткое-описание`, без номеров и имён инструментов.

## Какие ветки остались

| Ветка                                                                                                 | Зачем                                                                                             |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `main`                                                                                                | ствол, всегда зелёный                                                                             |
| `23`–`28`, `lab12`, `lab21`, `pz21`–`pz24`                                                            | ветки лабораторных и практических работ части 2 (по одной на работу, нужны по правилам владельца) |
| `course-app`, `course-project`                                                                        | курсовой проект                                                                                   |
| `lab12-hardening`, `feat/lab3-advanced-auth`, `integration/all`, `archive/*`, `backup/*`              | не слитые целиком ветки и резервные копии, не удаляются без решения владельца                     |
| `design/*`, `docs/*`, `papers/its-2026`, `chore/accelerator-skills`, `feature/*`, `work/part1-finish` | ветки со своей работой, ещё не слитой полностью                                                   |

## Что удалено 20.11.2026

Удалены 90 веток на GitHub: ветки, уже целиком слитые в `main` (рабочие ветки агентов, слитые PR, старые `feature/*` и `fix/*`), и ветки Dependabot (их PR закрыты, обновления применены в `main`). Ничего не потеряно: у каждой удалённой ветки ниже записан последний коммит, ветку можно восстановить командой `git push origin <sha>:refs/heads/<имя>`.

| Ветка                                                                                     | Последний коммит |
| ----------------------------------------------------------------------------------------- | ---------------- |
| `archive/lab01-03-text-gaps`                                                              | `e6a806399244`   |
| `archive/lab04-css-finish`                                                                | `df790ce353d8`   |
| `archive/lab06-kroki-check`                                                               | `6c19af2af255`   |
| `archive/lab07-hierarchy`                                                                 | `6c5acc1953b1`   |
| `archive/part2-mongo-work`                                                                | `b74189eb05fc`   |
| `archive/part2-ws-work`                                                                   | `a24e0d75bef0`   |
| `chore/variant-answers`                                                                   | `82778789b928`   |
| `design/ab-variants`                                                                      | `dcf980879d60`   |
| `design/figma-assets-ru-en`                                                               | `5d9ea8ef3767`   |
| `docs/browsers-2026-11`                                                                   | `8b7e4e5f0e30`   |
| `docs/browsers-part1`                                                                     | `dd8c54e19563`   |
| `docs/context-and-conditions`                                                             | `1779b613a122`   |
| `docs/handover-2026-10-15`                                                                | `f3e695fd0d32`   |
| `docs/lab05-06-devtools`                                                                  | `603000b932c2`   |
| `docs/lab07-08-devtools`                                                                  | `0d8597c3180d`   |
| `docs/no-control-answers`                                                                 | `0763a5c0d75c`   |
| `docs/security-redteam`                                                                   | `ebc82bbcb2cf`   |
| `docs/status-checklist-and-audit-findings`                                                | `9d70b2f8e59a`   |
| `docs/ux-audit`                                                                           | `838fe80cc68a`   |
| `feat/dependency-updates`                                                                 | `678663ae0ffb`   |
| `feat/lab-decisions-router-live-mongo`                                                    | `8a9441c8272b`   |
| `feat/lab3-advanced-auth-main`                                                            | `65513a5e366b`   |
| `feat/orientation-layouts`                                                                | `8ed4f70172ce`   |
| `feat/real-checks-importers-ai`                                                           | `9184101d6237`   |
| `feat/site-advanced-auth`                                                                 | `9ce45853969c`   |
| `feature/async-api-storage`                                                               | `0a3cf64d33e9`   |
| `feature/engine-in-settings`                                                              | `d6d7e3ef1e17`   |
| `feature/frontend-testing`                                                                | `13c6d6832ac5`   |
| `feature/hero-variant-b`                                                                  | `c20499a7d247`   |
| `feature/javascript-interactivity`                                                        | `cd384c7a33b0`   |
| `feature/responsive-layout`                                                               | `a46b26872d93`   |
| `feature/semantic-markup`                                                                 | `84caf8524a1a`   |
| `fix/audit-findings`                                                                      | `ffc22b0d9217`   |
| `fix/lab01-har-chrome`                                                                    | `c677bbba35f2`   |
| `fix/lab06-bugs`                                                                          | `86e3daf42521`   |
| `fix/mobile-horizontal-overflow`                                                          | `d8737c35913c`   |
| `integration/part1`                                                                       | `414cd5bb1b65`   |
| `lab/01-network-analysis`                                                                 | `3bd2cbb18d71`   |
| `lab/02-environment`                                                                      | `22745c618a12`   |
| `lab7-stubs`                                                                              | `758ee55bc28e`   |
| `tcf-clean`                                                                               | `fee7c6c5ee14`   |
| `test/accounts-scenarios`                                                                 | `c8154ff28074`   |
| `testing-course`                                                                          | `c6c2888958d1`   |
| `testing-course-full`                                                                     | `48226d88b14e`   |
| `worktree-agent-a206e5e4369939fc6`                                                        | `838fe80cc68a`   |
| `worktree-agent-aabfc45558279340b`                                                        | `c8154ff28074`   |
| `worktree-agent-aad0ada0faaec39dd`                                                        | `ebc82bbcb2cf`   |
| `worktree-agent-af24119e394395c98`                                                        | `dd8c54e19563`   |
| `dependabot/github_actions/actions/deploy-pages-5`                                        | `ef91b6fe60c5`   |
| `dependabot/npm_and_yarn/eslint-10.15.0`                                                  | `98307b3fd714`   |
| `dependabot/npm_and_yarn/eslint/js-10.0.1`                                                | `db3092a0f706`   |
| `dependabot/npm_and_yarn/html-validate-11.21.0`                                           | `43ea2f8486e6`   |
| `dependabot/npm_and_yarn/html-validate-11.21.1`                                           | `e8329d4ea23a`   |
| `dependabot/npm_and_yarn/jsdom-31.0.0`                                                    | `45991d233d01`   |
| `dependabot/npm_and_yarn/jsdom-31.0.1`                                                    | `5ac5a6c9ab56`   |
| `dependabot/npm_and_yarn/part-2/lab-01-node-server/eslint-10.15.0`                        | `34543a964f2d`   |
| `dependabot/npm_and_yarn/part-2/lab-01-node-server/eslint/js-10.0.1`                      | `bffe49f24367`   |
| `dependabot/npm_and_yarn/part-2/lab-01-node-server/globals-17.14.0`                       | `eae012714b21`   |
| `dependabot/npm_and_yarn/part-2/lab-02-sequelize/eslint-10.15.0`                          | `c3a2ac3592f4`   |
| `dependabot/npm_and_yarn/part-2/lab-02-sequelize/eslint/js-10.0.1`                        | `f43178f146e7`   |
| `dependabot/npm_and_yarn/part-2/lab-02-sequelize/globals-17.14.0`                         | `d3b5153e398f`   |
| `dependabot/npm_and_yarn/part-2/lab-03-auth/eslint-10.15.0`                               | `f653beae9eb8`   |
| `dependabot/npm_and_yarn/part-2/lab-03-auth/eslint/js-10.0.1`                             | `5a1e272e4018`   |
| `dependabot/npm_and_yarn/part-2/lab-03-auth/globals-17.14.0`                              | `64fb94c677d6`   |
| `dependabot/npm_and_yarn/part-2/lab-04-react-state/axe-core-4.14.1`                       | `c8dc5e8fcb83`   |
| `dependabot/npm_and_yarn/part-2/lab-04-react-state/testing-library/user-event-14.6.12`    | `0aa56933b5c1`   |
| `dependabot/npm_and_yarn/part-2/lab-04-react-state/vitejs/plugin-react-6.3.0`             | `b374fcf6bc15`   |
| `dependabot/npm_and_yarn/part-2/lab-05-react-api/jsdom-31.0.1`                            | `78988bae3f64`   |
| `dependabot/npm_and_yarn/part-2/lab-05-react-api/vitejs/plugin-react-6.3.0`               | `5d548f5e613a`   |
| `dependabot/npm_and_yarn/part-2/lab-05-react-api/vitest/coverage-v8-5.1.0`                | `0a32c01286a7`   |
| `dependabot/npm_and_yarn/part-2/lab-06-mongodb/dotenv-18.0.10`                            | `61e1504d5670`   |
| `dependabot/npm_and_yarn/part-2/lab-06-mongodb/mongoose-9.12.2`                           | `5996d80a7662`   |
| `dependabot/npm_and_yarn/part-2/lab-06-mongodb/puppeteer-core-25.18.1`                    | `3fd79fa4fcef`   |
| `dependabot/npm_and_yarn/part-2/lab-07-websocket/mongodb-7.9.0`                           | `ff2fec5ea580`   |
| `dependabot/npm_and_yarn/part-2/lab-07-websocket/puppeteer-core-25.18.1`                  | `c27f654dd87f`   |
| `dependabot/npm_and_yarn/part-2/pz-01-middleware-ejs/eslint-10.15.0`                      | `721fb0ee1c08`   |
| `dependabot/npm_and_yarn/part-2/pz-01-middleware-ejs/eslint/js-10.0.1`                    | `f4e1919aff8f`   |
| `dependabot/npm_and_yarn/part-2/pz-01-middleware-ejs/globals-17.14.0`                     | `fe25455b6cb5`   |
| `dependabot/npm_and_yarn/part-2/pz-02-rest-api/eslint-10.15.0`                            | `32f7f6abf626`   |
| `dependabot/npm_and_yarn/part-2/pz-02-rest-api/eslint/js-10.0.1`                          | `1edf9edbea1a`   |
| `dependabot/npm_and_yarn/part-2/pz-02-rest-api/globals-17.14.0`                           | `c8603fdcfd3d`   |
| `dependabot/npm_and_yarn/part-2/pz-03-routing/axe-core-4.14.1`                            | `c445e8b4c9a9`   |
| `dependabot/npm_and_yarn/part-2/pz-03-routing/vite-8.3.8`                                 | `7501b2ef1187`   |
| `dependabot/npm_and_yarn/part-2/pz-03-routing/vitejs/plugin-react-6.3.0`                  | `2e8bf5483dc9`   |
| `dependabot/npm_and_yarn/part-2/pz-04-context-reducer/testing-library/user-event-14.6.12` | `6252c5b9595e`   |
| `dependabot/npm_and_yarn/part-2/pz-04-context-reducer/vite-8.3.8`                         | `5c017439f427`   |
| `dependabot/npm_and_yarn/part-2/pz-04-context-reducer/vitejs/plugin-react-6.3.0`          | `e0d44add649d`   |
| `dependabot/npm_and_yarn/prettier-3.10.1`                                                 | `1f3aca5271e6`   |
| `dependabot/npm_and_yarn/react-app/babel/core-8.1.2`                                      | `581ac4ff7568`   |
| `dependabot/npm_and_yarn/react-app/testing-library/user-event-14.6.12`                    | `a26fd9f7138c`   |
