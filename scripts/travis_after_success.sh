#!/bin/bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

if [[ $TRAVIS_PULL_REQUEST == false && $TRAVIS_BRANCH == "master" && $GROUP == "coverage_and_docs" ]]
then
    echo "-- pushing docs --"

    ( cd docs
    git init
    git config user.email "travis@travis-ci.com"
    git config user.name "Travis Bot"

    touch .nojekyll  # disable jekyll
    git add .
    git commit -m "Deploy to GitHub Pages"
    git push --force --quiet "https://${GHTOKEN}@${GH_REF}" master:gh-pages > /dev/null 2>&1
    ) && echo "-- pushed docs --"
else
    echo "-- will only push docs from master branch \"coverage_and_docs\" build --"
fi
