# Sourced by the other scripts. Sets $CLIFF to a runnable git-cliff.
#
# Prefers the version pinned in package.json so that local runs and CI runs
# produce byte-identical output; falls back to whatever is on PATH (e.g. a
# `brew install git-cliff`) so the scripts work before `npm install`.
if [ -x "node_modules/.bin/git-cliff" ]; then
  CLIFF="node_modules/.bin/git-cliff"
elif command -v git-cliff >/dev/null 2>&1; then
  CLIFF="git-cliff"
else
  echo "git-cliff not found. Run 'npm install' or 'brew install git-cliff'." >&2
  exit 1
fi
