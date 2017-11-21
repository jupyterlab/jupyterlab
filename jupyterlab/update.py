# coding: utf-8
# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
from os.path import join as pjoin
import json
import os
import shutil

HERE = os.path.dirname(__file__)


# Get the dev mode package.json file.
dev_path = os.path.realpath(pjoin(HERE, '..', 'dev_mode'))
with open(pjoin(dev_path, 'package.json')) as fid:
    data = json.load(fid)


# Update the values that need to change and write to staging.
data['scripts']['build'] = 'webpack'
data['scripts']['watch'] = 'webpack --watch'
data['scripts']['build:prod'] = (
    "webpack --define process.env.NODE_ENV=\"'production'\"")
data['jupyterlab']['outputDir'] = '..'
data['jupyterlab']['staticDir'] = '../static'
data['jupyterlab']['linkedPackages'] = dict()

staging = pjoin(HERE, 'staging')

with open(pjoin(staging, 'package.json'), 'w') as fid:
    json.dump(data, fid)

# Update our index file and webpack file.
for fname in ['index.js', 'webpack.config.js']:
    shutil.copy(pjoin(dev_path, fname), pjoin(staging, fname))


# Get a new yarn lock file.

target = os.path.join(app_dir, 'staging', 'yarn.lock')
shutil.copy(target, os.path.join(staging, 'yarn.lock'))
