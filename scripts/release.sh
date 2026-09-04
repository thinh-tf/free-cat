#!/usr/bin/env bash
# Stage 2: dev has merged to main -> cut the official release.
#
# MUTATES: bumps package.json, prepends to CHANGELOG.md, commits, tags.
#
# Usage: ./scripts/release.sh          # git-cliff computes the version
#        ./scripts/release.sh v1.2.0   # you choose the version

set -euo pipefail
cd "$(dirname "$0")/.."
. scripts/_cliff.sh

branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$branch" != "main" ]; then
  echo "Refusing to release from '$branch'. Releases are cut from main." >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is dirty. Commit or stash first." >&2
  exit 1
fi

# Determine the version. --bumped-version computes the next semver from the
# conventional commits since the last tag and prints it, generating nothing.
if [ $# -ge 1 ]; then
  version="$1"
else
  version="$("$CLIFF" --bumped-version)"
fi

# `--bumped-version` returns the CURRENT tag when nothing is releasable, not
# an empty string, so compare against it rather than testing for emptiness.
current="$(git describe --tags --abbrev=0 2>/dev/null || true)"
if [ -z "$version" ] || { [ -n "$current" ] && [ "$version" = "$current" ]; }; then
  echo "Nothing to release: no releasable commits since ${current:-the start of history}."
  # Exit 0, not 1: this script runs on every push to main, and an ordinary
  # push with no releasable commits is a success, not a failed build.
  exit 0
fi

echo "Releasing $version"

# git-cliff does not touch version files, so sync package.json ourselves.
# --no-git-tag-version: npm must not create its own commit or tag; we tag below
# so that the tag points at the commit containing the changelog.
npm version "${version#v}" --no-git-tag-version --allow-same-version >/dev/null

# --prepend needs the file to exist already.
[ -f CHANGELOG.md ] || : > CHANGELOG.md

# --unreleased : only commits since the last tag
# --tag        : label them with the new version
# --prepend    : insert at the top, preserving older entries
"$CLIFF" --unreleased --tag "$version" --prepend CHANGELOG.md

# npm version bumps the lockfile too; both must land in the same commit
# or `npm ci` sees package.json and package-lock.json out of sync.
git add CHANGELOG.md package.json package-lock.json
git commit -m "chore(release): prepare for $version"
git tag -a "$version" -m "Release $version"

cat <<MSG

Done. Bumped package.json, wrote CHANGELOG.md, tagged $version.

  Inspect:  git show $version
  Undo:     git tag -d $version && git reset --hard HEAD~1
  Publish:  git push origin main --follow-tags
MSG
