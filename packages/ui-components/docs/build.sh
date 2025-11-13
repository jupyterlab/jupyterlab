#!/usr/bin/env bash
# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.


# get this script's parent dir
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# set some project dirs
SOURCE=$DIR/source
BUILD=$SOURCE/_build
PKG_ROOT=$(realpath $DIR/..)
MONOREPO_DEVDOC=$(realpath $PKG_ROOT/../../docs/source/developer)

# echo "SOURCE=$SOURCE"
# echo "BUILD=$BUILD"
# echo "PKG_ROOT=$PKG_ROOT"
# echo "MONOREPO_DEVDOC=$MONOREPO_DEVDOC"

# make the docs build dir
mkdir -p $BUILD

# paths in markdown include directives are resolved relative to pwd
pushd $SOURCE > /dev/null

# make a copy of labicon.md with section levels shifted down
pandoc $SOURCE/labicon.md -f markdown -t markdown --wrap=preserve --shift-heading-level-by=1 -o $BUILD/labicon.md

# make the README.md at package root
pandoc $SOURCE/generated_warning.md $SOURCE/README.md -f markdown -t gfm -o $PKG_ROOT/README.md    #--resource-path=$SOURCE
echo "built $PKG_ROOT/README.md"

# make the dev docs for the monorepo's docs
pandoc $SOURCE/generated_warning.md $SOURCE/ui_components.md -f markdown -t markdown --wrap=preserve -o $MONOREPO_DEVDOC/ui_components.md
echo "built $MONOREPO_DEVDOC/ui_components.md"

popd > /dev/null
