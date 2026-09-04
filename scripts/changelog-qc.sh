#!/usr/bin/env bash
# Stage 1: code has merged to `dev`, QC needs to know what to test.
#
# READ-ONLY. Creates no tag, no commit, and no file (unless you pass one).
# Run it as often as you like -- on every merge to dev, if you want.
#
# Usage: ./scripts/changelog-qc.sh [output-file]

set -euo pipefail
cd "$(dirname "$0")/.."
. scripts/_cliff.sh

# The label QC sees. Not a real tag -- nothing is created in git. It exists
# only so the heading says something more useful than "Unreleased".
QC_LABEL="dev-$(date +%Y%m%d-%H%M)"

# --unreleased : only commits after the most recent tag
# --tag        : label those commits with QC_LABEL in the output
#
# Note the absence of --prepend and --bump. That is the point: this stage
# observes history without changing it.
if [ $# -ge 1 ]; then
  "$CLIFF" --unreleased --tag "$QC_LABEL" --output "$1"
  echo "QC changelog written to $1"
else
  "$CLIFF" --unreleased --tag "$QC_LABEL"
fi
