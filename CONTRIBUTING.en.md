# How to make changes

Russian version: [`CONTRIBUTING.md`](CONTRIBUTING.md).

1. Branch: short, from the latest `origin/main`, named `feat/...`, `fix/...`, `docs/...`, `ci/...`. More in [`docs/BRANCHES.en.md`](docs/BRANCHES.en.md).
2. Once per machine: `npm ci` and `npm run hooks:install` (the pre-push hook catches secrets, forbidden files and tool attribution in commits).
3. Before a push: `npm run verify` (lint, format, tests with 100% coverage, the repository guard).
4. Commits are made as the owner, in English, without tool or AI attribution.
5. A pull request from the template. When the CI run of the branch is green, auto-merge merges it into `main`.
6. Secrets only in `.env` on your own machine. Russian and English texts change together.

What CI checks: [`docs/CI-CHECKS.en.md`](docs/CI-CHECKS.en.md).
