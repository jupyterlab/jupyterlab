import json
import os.path as osp

name = "mock-package"
HERE = osp.abspath(osp.dirname(__file__))

with open(osp.join(HERE, "package.json")) as fid:
    data = json.load(fid)

from setuptools import setup

setup(name=name, version=data["version"], py_modules=[name])
