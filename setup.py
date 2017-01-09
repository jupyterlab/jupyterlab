# -*- coding: utf-8 -*-

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from __future__ import print_function

from distutils import log
import json
import os
import sys


# Our own imports

from setupbase import (
    find_packages,
    js_prerelease,
    NPM
)

# BEFORE importing distutils, remove MANIFEST. distutils doesn't properly
# update it when the contents of directories change.
if os.path.exists('MANIFEST'): os.remove('MANIFEST')

from distutils.core import setup


here = os.path.dirname(os.path.abspath(__file__))
log.set_verbosity(log.DEBUG)
log.info('setup.py entered')

DESCRIPTION = 'An alpha preview of the JupyterLab notebook server extension.'
LONG_DESCRIPTION = 'This is an alpha preview of JupyterLab. It is not ready for general usage yet. Development happens on https://github.com/jupyter/jupyterlab, with chat on https://gitter.im/jupyter/jupyterlab.'


# Get the npm package version and set the python package to the same.
with open(os.path.join(here, 'package.json')) as f:
    packagejson = json.load(f)
with open(os.path.join(here, 'jupyterlab', '_version.py'), 'w') as f:
    f.write('# This file is auto-generated, do not edit!\n')
    f.write('__version__ = "%s"\n' % packagejson['version'])


#---------------------------------------------------------------------------
# custom distutils commands
#---------------------------------------------------------------------------
# imports here, so they are after setuptools import if there was one
from distutils.command.build_py import build_py
from distutils.command.sdist import sdist


setup_args = {
    'name': 'jupyterlab',
    'version': packagejson['version'],
    'description': DESCRIPTION,
    'long_description': LONG_DESCRIPTION,
    'License': 'BSD',
    'include_package_data': True,
    'install_requires': ['notebook>=4.2.0'],
    'packages': find_packages(),
    'pack'
    'zip_safe': False,
    'package_data': {'jupyterlab': [
        'build/*',
        'lab.html'
    ]},
    'cmdclass': {
        'build_py': js_prerelease(build_py),
        'sdist': js_prerelease(sdist, strict=True),
        'jsdeps': NPM,
    },
    'entry_points': {
        'console_scripts': [
            'jupyter-lab = jupyterlab.labapp:main',
            'jupyter-labextension = jupyterlab.labextensions:main',
        ]
    },
    'author': 'Jupyter Development Team',
    'author_email': 'jupyter@googlegroups.com',
    'url': 'https://github.com/jupyter/jupyterlab',
    'keywords': ['ipython', 'jupyter', 'Web'],
    'classifiers': [
        'Development Status :: 2 - Pre-Alpha',
        'Intended Audience :: Developers',
        'Intended Audience :: Science/Research',
        'License :: OSI Approved :: BSD License',
        'Programming Language :: Python :: 2',
        'Programming Language :: Python :: 2.7',
        'Programming Language :: Python :: 3',
    ],
}

#---------------------------------------------------------------------------
# Handle scripts, dependencies, and setuptools specific things
#---------------------------------------------------------------------------

if any(arg.startswith('bdist') for arg in sys.argv):
    import setuptools

# This dict is used for passing extra arguments that are setuptools
# specific to setup
setuptools_extra_args = {}


if 'setuptools' in sys.modules:
    # setup.py develop should check for submodules
    from setuptools.command.develop import develop
    setup_args['cmdclass']['develop'] = js_prerelease(develop)

    try:
        from wheel.bdist_wheel import bdist_wheel
    except ImportError:
        pass
    else:
        setup_args['cmdclass']['bdist_wheel'] = js_prerelease(bdist_wheel)

    setuptools_extra_args['zip_safe'] = False

#---------------------------------------------------------------------------
# Do the actual setup now
#---------------------------------------------------------------------------

setup_args.update(setuptools_extra_args)


def main():
    setup(**setup_args)


if __name__ == '__main__':
    main()
