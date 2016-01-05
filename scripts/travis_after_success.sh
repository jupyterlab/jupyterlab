#!/bin/bash
if [[ $TRAVIS_PULL_REQUEST == false && $TRAVIS_BRANCH == "master" ]]
then
    echo "-- pushing docs --"

    ( cd docs
    git init
    git config user.email "travis@travis-ci.com"
    git config user.name "Travis Bot"

    git add .
    git commit -m "Deploy to GitHub Pages"
    git push --force --quiet "https://${GHTOKEN}@${GH_REF}" master:gh-pages > /dev/null 2>&1
    ) && echo "-- pushed docs --"
else
    echo "-- will only push docs from master --"
fi
