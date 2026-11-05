# Accelerator in the DSLKit project

Russian version: [`ACCELERATOR.md`](ACCELERATOR.md). For anyone continuing the work in a new chat with another AI: what Accelerator is, what is installed here, why exactly these skills were chosen and how to reproduce it.

Installed on 4 November 2026. The catalog is pinned to `refs/tags/v1.4.1`, the `accelerator` command is version 0.18.0.

## 1 What it is

Accelerator installs a curated set of skills for AI agents into a project. A skill is a `SKILL.md` file that tells an agent how to do one kind of task. The flow:

1. `scan` reads the project and writes a draft profile (`.accelerator/profile.draft.json`).
2. The questionnaire (the `accelerator-setup` skill) fills in what the scan cannot know and completes the profile (`.accelerator/profile.json`).
3. `accelerator install` reads the profile and copies the chosen skills into `.claude/skills/`. It asks nothing and uses no AI: the same profile always gives the same set.

Saying yes to a questionnaire topic only opens its cards and installs nothing. Only explicitly chosen ids are installed.

## 2 Scan result

| Field           | Value                         |
| --------------- | ----------------------------- |
| languages       | javascript                    |
| frameworks      | docker                        |
| test runner     | not detected                  |
| package manager | npm                           |
| layout          | regular project (no monorepo) |
| CI              | github-actions                |
| agents          | claude-code                   |

The scan did not see React because `react-app/` is a nested folder. This does not affect the choice, because only cards without a React condition were selected.

## 3 What is installed

Project skills (18 chosen plus the mandatory `DOCKER-DATA-LOSS-CONFIRMATION`, which is always installed when Docker is present). They live in `.claude/skills/`, are committed and available to everyone:

- Process (in the spirit of the course: requirements, plan, execution, verification): `REQUIREMENTS-BRAINSTORMING`, `IMPLEMENTATION-PLANNING`, `PLAN-EXECUTION`, `COMPLETION-VERIFICATION`.
- Quality: `CODE-CHANGE-REVIEW`, `TEST-DESIGN-REVIEW`, `ERROR-DIAGNOSIS`, `REFACTOR-STEP-PLANNING`.
- Documentation: `PROJECT-DOCUMENTATION`, `CODE-COMMENT-WRITING`, `PROJECT-ADAPTATION`.
- Docker and security: `DOCKER-COMPOSE-LOCAL-STACK`, `DOCKER-IMAGE-BUILD`, `DOCKER-DATA-LOSS-CONFIRMATION`, `SENSITIVE-DATA-HANDLING`.
- Data and pipelines: `DATA-QUALITY-CONTROLS`, `DATA-INCIDENT-TRACING`, `PIPELINE-CHECK-SELECTION`, `PIPELINE-OUTPUT-REVIEW`.

Personal skills (4), local to the owner and not in the repository: `DAILY-STANDUP-UPDATE`, `TECHNICAL-PROSE-EDITING`, `REQUEST-REFINEMENT`, `RECENT-DISCUSSION-RESEARCH`.

## 4 Which files are where

| File                               | In git | Purpose                                                    |
| ---------------------------------- | ------ | ---------------------------------------------------------- |
| `.accelerator/profile.json`        | yes    | The completed project profile: stack, topics, chosen ids.  |
| `.accelerator/registry.json`       | yes    | What `install` put in and why.                             |
| `.claude/skills/<ID>/SKILL.md`     | yes    | The skills themselves.                                     |
| `.accelerator/profile.user.json`   | no     | The owner's personal choice (the 4 ids above), local only. |
| `.accelerator/registry.user.json`  | no     | Registry of the personal skills.                           |
| `.accelerator/profile.draft.json`  | no     | Scan draft, regenerated.                                   |
| `.accelerator/catalog-topics.json` | no     | Catalog cards for the questionnaire, regenerated.          |

A local `.git/info/exclude` rule hides `.accelerator/`. The committed files from that folder were added with `git add -f`.

## 5 Why this choice (sources)

- The course "AI for Developers mid 2026" (Innowise LMS, notes in `E:\ai-courses\course1_AI_for_Developers_mid_2026.md`). The course rests on three foundations: meta-prompting, context engineering and spec-driven development. So all process skills were chosen (requirements, plan, execution, verification), `REQUEST-REFINEMENT` is close to meta-prompting, and `PROJECT-ADAPTATION` fits skills to the repository, like the course section on agent instructions. The course calls Accelerator its own framework for Claude Code (Applied Practices).
- The certification kit (`E:\accelerator-kit`, exercises 01 and 02). Main lessons: the profile is committed and reviewed by a person; a topic only opens cards; `install` silently drops ids whose `applies_to` does not match the profile, so the questionnaire answers must be right; do not add to the stack what is not there (Snowflake in the exercise).
- The owner's rules from [`PROJECT-STATE.en.md`](PROJECT-STATE.en.md): commits without tool attributions, messages in English, documents in Russian and English.
- The `database-administration` topic in the catalog holds only Snowflake skills. The project has no Snowflake, so they were not chosen and Snowflake was not added to the stack.
- The data cards (pipelines, data quality) are mostly about dbt and Python. They were chosen at the owner's request and fit DSLKit only loosely. To shrink the set, remove ids from `selected_artifacts` and run `accelerator install`.

## 6 How to reproduce or change

You need PowerShell 7 and the `accelerator` command on PATH (installer: `E:\accelerator-kit\installation`, guide `installation-guide.md`).

```bash
accelerator install
```

To change the set, edit `selected_artifacts` in `.accelerator/profile.json` and run the command again, or call the `accelerator-setup` skill in Claude Code. To restore the personal skills on a new machine, create `.accelerator/profile.user.json`:

```json
{
  "schema_version": "1",
  "toolset_ref": "refs/tags/v1.4.1",
  "selected_artifacts": ["DAILY-STANDUP-UPDATE", "RECENT-DISCUSSION-RESEARCH", "REQUEST-REFINEMENT", "TECHNICAL-PROSE-EDITING"]
}
```

To update the catalog version, put a new `vX.Y.Z` tag in `toolset_ref` of both profiles and install again. Branches and short SHAs are not allowed in `toolset_ref`.

## 7 Adaptation to the project

On 5 November 2026 the `PROJECT-ADAPTATION` skill appended a "Project context" section to the `SKILL.md` of each of the 18 project skills, between the markers `<!-- >>> project adaptation >>> -->` and `<!-- <<< project adaptation <<< -->`: check commands, paths and the owner's rules. The commands were read from configuration and not run. The Docker and data skills (`DOCKER-*`, `DATA-*`, `PIPELINE-*`) have little to work on yet: this branch has no Dockerfile (they live on other branches: `course-app`, `lab12`, `25`) and the project has no warehouse, so their section says what applies today and what the owner still has to confirm.

What this means for the installer:

- `accelerator update` treats the adapted copies as locally edited, does not update them and reports them as retained on every run.
- `accelerator update -Force` and a repeated `accelerator install` replace the copies with the catalog version and the "Project context" section is lost. Then run the adaptation again (the text in git is input for it).
