#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from __future__ import print_function

# the name of the project
name = 'jupyterlab'

#-----------------------------------------------------------------------------
# Minimal Python version sanity check
#-----------------------------------------------------------------------------

import sys

v = sys.version_info
if v[:2] < (2,7) or (v[0] >= 3 and v[:2] < (3,3)):
    error = "ERROR: %s requires Python version 2.7 or 3.3 or above." % name
    print(error, file=sys.stderr)
    sys.exit(1)

PY3 = (sys.version_info[0] >= 3)

#-----------------------------------------------------------------------------
# get on with it
#-----------------------------------------------------------------------------

from distutils import log
import io
import json
import os
from glob import glob
from distutils.command.build_ext import build_ext
from distutils.command.sdist import sdist
from setuptools import setup
from setuptools.command.bdist_egg import bdist_egg


# Our own imports

from setupbase import (
    bdist_egg_disabled,
    find_packages,
    find_package_data,
    js_prerelease,
    NPM
)

# BEFORE importing distutils, remove MANIFEST. distutils doesn't properly
# update it when the contents of directories change.
if os.path.exists('MANIFEST'): os.remove('MANIFEST')


here = os.path.dirname(os.path.abspath(__file__))
pjoin = os.path.join

DESCRIPTION = 'An alpha preview of the JupyterLab notebook server extension.'
LONG_DESCRIPTION = 'This is an alpha preview of JupyterLab. It is not ready for general usage yet. Development happens on https://github.com/jupyter/jupyterlab, with chat on https://gitter.im/jupyter/jupyterlab.'


version_ns = {}
with io.open(pjoin(here, name, '_version.py'), encoding="utf8") as f:
    exec(f.read(), {}, version_ns)


setup_args = dict(
    name             = name,
    description      = DESCRIPTION,
    long_description = LONG_DESCRIPTION,
    version          = version_ns['__version__'],
    scripts          = glob(pjoin('scripts', '*')),
    packages         = find_packages(),
    package_data     = find_package_data(),
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
)


cmdclass = dict(
    build_ext = js_prerelease(build_ext),
    sdist  = js_prerelease(sdist, strict=True),
    jsdeps = NPM,
    bdist_egg = bdist_egg if 'bdist_egg' in sys.argv else bdist_egg_disabled,
)
try:
    from wheel.bdist_wheel import bdist_wheel
    cmdclass['bdist_wheel'] = js_prerelease(bdist_wheel, strict=True)
except ImportError:
    pass


setup_args['cmdclass'] = cmdclass


setuptools_args = {}
install_requires = setuptools_args['install_requires'] = [
    'notebook>=4.2.0',
]

extras_require = setuptools_args['extras_require'] = {
    'test:python_version == "2.7"': ['mock'],
    'test': ['pytest'],
    'docs': [
        'sphinx',
        'recommonmark',
        'sphinx_rtd_theme'
    ],
}


if 'setuptools' in sys.modules:
    setup_args.update(setuptools_args)

    # force entrypoints with setuptools (needed for Windows, unconditional because of wheels)
    setup_args['entry_points'] = {
        'console_scripts': [
            'jupyter-lab = jupyterlab.labapp:main',
            'jupyter-labextension = jupyterlab.labextensions:main',
        ]
    }
    setup_args.pop('scripts', None)

    setup_args.update(setuptools_args)

if __name__ == '__main__':
    setup(**setup_args)
