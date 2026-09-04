# free-cat

A `cat` clone in TypeScript, and a playground for practicing
[git-cliff](https://git-cliff.org). The code is real but small; the commit
history is the actual subject.

## The workflow this models

```
feature PR ──squash──> dev ──merge --no-ff──> main
                        │                      │
                        │                      └─> npm run release
                        │                          bump package.json,
                        │                          prepend CHANGELOG.md, tag
                        │
                        └─> npm run changelog:qc
                            read-only list of what QC should test
```

Two stages, two very different operations:

| | Trigger | Command | Mutates? |
|---|---|---|---|
| **QC handoff** | merge to `dev` | `git cliff --unreleased` | no |
| **Release** | merge to `main` | `git cliff --bump --unreleased --prepend` | yes: files, commit, tag |

Stage 1 is why git-cliff suits this workflow and release-please does not.
release-please's unit of work is a *release PR* on a designated release
branch; it has no read-only "show me what is pending" mode. git-cliff is a
stateless renderer over git history, so the QC view costs nothing and can be
regenerated on every merge.

## Setup

```sh
npm install
npm test
npm run dev -- --line-numbers src/cat.ts
```

`git-cliff` is pinned as a devDependency, so `npm install` is all you need.
`scripts/_cliff.sh` prefers that pinned copy and falls back to a `git-cliff`
on `$PATH`, which keeps local runs and CI byte-identical.

## The practice loop

The repo starts at `0.0.0` with **no tags**, so everything is unreleased.
Cutting the first release is the first exercise.

```sh
# 1. Do some work on dev, with conventional commit messages.
git checkout dev
#    ... edit src/ ...
git commit -m "feat(cli): add --color flag"

# 2. What would QC test?
npm run changelog:qc

# 3. Promote. --no-ff matters: a squash merge destroys the granularity.
git checkout main
git merge --no-ff dev -m "Merge dev into main"

# 4. Cut the release. git-cliff computes the version from the commits.
npm run release
git push origin main --follow-tags
```

## Commit types this repo recognises

Configured in `cliff.toml` under `commit_parsers`:

| Prefix | Changelog section | Version effect |
|---|---|---|
| `feat:` | Features | minor |
| `fix:` | Bug Fixes | patch |
| `perf:` | Performance | patch |
| `refactor:` | Refactor | patch |
| `docs:` | Documentation | patch |
| `test:` | Testing | patch |
| `ci:` / `build:` | Build & CI | patch |
| `chore:` | Miscellaneous | patch |
| `chore(deps):` | *skipped* | — |
| `feat!:` / `BREAKING CHANGE:` | flagged inline | minor (see below) |

`breaking_always_bump_major = false` in `cliff.toml`, so a breaking change
bumps the minor version rather than going to `1.0.0`. That is usually what
you want pre-1.0. Flip it to see the difference.

## Things worth practicing

Edit `cliff.toml`, then re-run `npm run changelog:qc` to see the effect.

- **Grouping.** Reorder the `<!-- N -->` prefixes in `commit_parsers`. Add a
  group for `style` or `revert`.
- **Skipping.** Make `chore` skip entirely, then note that a breaking commit
  still appears — that is `protect_breaking_commits = true`.
- **Debugging a missing entry.** Set `filter_unconventional = false` and see
  what had been silently discarded.
- **Templating.** The `body` is [Tera](https://keats.github.io/tera/docs/).
  Add the short hash: `{{ commit.id | truncate(length=7, end="") }}`.
  Add the author: `{{ commit.author.name }}`.
- **Version bumping.** Compare `git cliff --bumped-version` before and after
  toggling `features_always_bump_minor`.
- **Inspecting the data.** `git cliff --context` dumps the JSON your template
  receives. Indispensable when a template does not render what you expect.

## Useful commands

```sh
git cliff --unreleased            # commits since the last tag
git cliff --latest                # the most recent release only
git cliff --range v0.1.0..v0.2.0  # an explicit range
git cliff --bumped-version        # print the next version, generate nothing
git cliff --context               # the template's input data, as JSON
```

## The one real gotcha

git-cliff reads git history, so **how you merge determines what it can see**.

- Squash-merging feature PRs *into `dev`* is fine and even ideal: one PR
  becomes one conventional commit. Enforce Conventional Commits on PR titles.
- Squash-merging `dev` *into `main`* is destructive: the entire release
  collapses to a single commit and the changelog collapses with it. Use
  `--no-ff` or a fast-forward.

## CI

Both workflows call the same scripts you run locally, so CI cannot drift from
your own workflow.

- **`qc-changelog.yml`** — fires on every push to `dev`. Runs the tests, then
  writes the changelog to the job summary and uploads it as an artifact.
  Read-only; safe to leave on.
- **`release.yml`** — `workflow_dispatch` only. Trigger it by hand after
  merging `dev` into `main`. It pushes a commit, a tag, and a GitHub release,
  so it stays manual until you trust it.

Both use `fetch-depth: 0` on checkout, for the reason noted in the workflow.
