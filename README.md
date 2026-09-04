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
`cliff.toml` is the stock `git cliff --init` output, kept deliberately
unmodified as a baseline.
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

## Commit types

`cliff.toml` is git-cliff's **stock generated config** (`git cliff --init`),
unmodified. These groups and rules are the tool's own defaults, not local
choices:

| Prefix | Changelog section |
|---|---|
| `feat:` | 🚀 Features |
| `fix:` | 🐛 Bug Fixes |
| `refactor:` | 🚜 Refactor |
| `doc:` / `docs:` | 📚 Documentation |
| `perf:` | ⚡ Performance |
| `style:` | 🎨 Styling |
| `test:` | 🧪 Testing |
| `chore:` / `ci:` | ⚙️ Miscellaneous Tasks |
| `revert:` | ◀️ Revert |
| anything else conventional | 💼 Other |

A commit whose *body* matches `security` lands under 🛡️ Security regardless of
its prefix.

**Skipped entirely:** `chore(release): prepare for ...`, `chore(deps...)`,
`chore(pr)`, `chore(pull)`.

That first pattern is why `scripts/release.sh` phrases its commit as
`chore(release): prepare for vX.Y.Z` -- say it any other way and the release
commit appears in its own changelog.

**Version bumping** uses the defaults, which are not what a pre-1.0 project
usually wants: `feat:` bumps the minor, and a breaking change bumps to
**1.0.0**. Add a `[bump]` section with `breaking_always_bump_major = false` to
stay in `0.x`.

**Also default:** `protect_breaking_commits = false`, so a breaking commit
matching a skip rule *is* dropped. And the issue-link preprocessor ships
commented out, so `(#1)` renders as plain text rather than a link.

## Things worth practicing

Edit `cliff.toml`, then re-run `npm run changelog:qc` to see the effect.

- **Grouping.** Reorder the `<!-- N -->` prefixes in `commit_parsers`. Add a
  group for `style` or `revert`.
- **Skipping.** Make `chore` skip entirely. Then set
  `protect_breaking_commits = true` and watch a breaking `chore!` reappear.
- **Debugging a missing entry.** Set `filter_unconventional = false` and see
  what had been silently discarded.
- **Issue links.** Uncomment the `commit_preprocessors` entry and the matching
  `postprocessors` entry, replacing `<REPO>` with this repo's URL. Squash
  merges append `(#N)`, so this gets you PR links for free.
- **Templating.** The `body` is [Tera](https://keats.github.io/tera/docs/).
  Add the short hash: `{{ commit.id | truncate(length=7, end="") }}`.
  Add the author: `{{ commit.author.name }}`.
- **Version bumping.** Add a `[bump]` section and compare
  `git cliff --bumped-version` before and after toggling
  `breaking_always_bump_major`.
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

Four workflows. All of them call the same scripts you run locally, so CI
cannot drift from your own workflow.

| Workflow | Fires on | Does |
|---|---|---|
| `pr-title.yml` | any PR opened/edited | fails the check if the title is not a Conventional Commit |
| `qc-changelog.yml` | push to `dev` | runs tests, writes the pending changelog to the job summary and an artifact |
| `release-pr.yml` | push to `dev` | creates or updates one standing release PR from `dev` to `main` |
| `release.yml` | push to `main` | tags, writes `CHANGELOG.md`, bumps the version, cuts the GitHub release |

The full loop, with two human decisions in it:

```
feature PR --squash--> dev --(merge the release PR)--> main --> released
     ^                  ^                                        |
     |                  |                                        v
  title linted    release PR auto-updates                GitHub release
                  with the pending changelog              + CHANGELOG.md
```

`release-pr.yml` is release-please's one genuinely good idea, kept on top of
git-cliff: QC reads the standing PR to know what to test, and merging it *is*
the release. Unlike release-please it holds no state, so nothing can get out
of sync.

**`pr-title.yml` exists because of a silent failure.** PRs are squash-merged
into `dev`, so the PR title becomes the commit message, and
`filter_unconventional = true` drops anything that does not parse -- with no
error. A PR titled "Add colour output" merges happily and simply never appears
in the changelog. The lint turns that into a failed check.

**`release.sh` exits 0 when there is nothing to release.** `--bumped-version`
returns the *current* tag rather than an empty string in that case, so the
script compares against `git describe` instead of testing for emptiness.
Without this, every ordinary push to `main` would turn CI red.

Every checkout uses `fetch-depth: 0`. The default shallow clone gives
git-cliff one commit and no tags -- the most common way this breaks in CI.

## Turning the automation off

Delete the `push:` trigger from `release.yml` to go back to releasing by hand
with `npm run release`. Everything still works; you just decide when.
