# coding: utf-8
# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import os
import shutil

from .commands import build, get_app_dir

here = os.path.dirname(__file__)
app_dir = get_app_dir()

build(updating=True)

target = os.path.join(app_dir, 'staging', 'yarn.lock')
shutil.copy(target, os.path.join(here, 'yarn.app.lock'))
