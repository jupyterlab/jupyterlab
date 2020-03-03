
#!/bin/bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
jlpm
jlpm build:packages
jlpm docs
cd docs/api
git init
touch .nojekyll  # disable jekyll
git add .
git commit -m "Deploy to GitHub Pages"
git push --force "https://github.com/jupyterlab/jupyterlab" master:gh-pages
