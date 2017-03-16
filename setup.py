#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from __future__ import print_function
from setuptools import setup
from glob import glob
import json
import os
from os.path import join as pjoin
from setupbase import (
    create_cmdclass, install_npm, find_packages
)


# the name of the project
name = 'jupyterlab'

here = os.path.dirname(os.path.abspath(__file__))

DESCRIPTION = 'An alpha preview of the JupyterLab notebook server extension.'
LONG_DESCRIPTION = 'This is an alpha preview of JupyterLab. It is not ready for general usage yet. Development happens on https://github.com/jupyter/jupyterlab, with chat on https://gitter.im/jupyter/jupyterlab.'


# Get the npm package version and set the python package to the same.
with open(os.path.join(here, 'package.json')) as f:
    packagejson = json.load(f)
with open(os.path.join(here, 'jupyterlab', '_version.py'), 'w') as f:
    f.write('# This file is auto-generated, do not edit!\n')
    f.write('__version__ = "%s"\n' % packagejson['version'])

package_data = dict(jupyterlab=['build/*', 'lab.html'])

cmdclass = create_cmdclass(['js'], ['jupyterlab/build'])

build_path = os.path.join(here, 'jupyterlab', 'build')
source_path = os.path.join(here, 'src')
cmdclass['js'] = install_npm(
    here, build_path, source_path, 'build:all'
)


setup_args = dict(
    name             = name,
    description      = DESCRIPTION,
    long_description = LONG_DESCRIPTION,
    version          = packagejson['version'],
    scripts          = glob(pjoin('scripts', '*')),
    packages         = find_packages(name),
    package_data     = package_data,
    cmdclass         = cmdclass,
    author           = 'Jupyter Development Team',
    author_email     = 'jupyter@googlegroups.com',
    url              = 'http://jupyter.org',
    license          = 'BSD',
    platforms        = "Linux, Mac OS X, Windows",
    keywords         = ['ipython', 'jupyter', 'Web'],
    classifiers      = [
        'Development Status :: 3 - Alpha',
        'Intended Audience :: Developers',
        'Intended Audience :: System Administrators',
        'Intended Audience :: Science/Research',
        'License :: OSI Approved :: BSD License',
        'Programming Language :: Python',
        'Programming Language :: Python :: 2.7',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.3',
        'Programming Language :: Python :: 3.4',
        'Programming Language :: Python :: 3.5',
    ],
    # setuptools requirements
    zip_safe         = False,
    install_requires = [
        'notebook>=4.2.0',
    ],
    extras_require   = {
        'test:python_version == "2.7"': ['mock'],
        'test': ['pytest'],
        'docs': [
            'sphinx',
            'recommonmark',
            'sphinx_rtd_theme'
        ]
    },
    entry_points     = {
        'console_scripts': [
            'jupyter-lab = jupyterlab.labapp:main',
            'jupyter-labextension = jupyterlab.labextensions:main',
        ]
    }
)


if __name__ == '__main__':
    setup(**setup_args)
