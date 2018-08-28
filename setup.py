#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
from os.path import join as pjoin
import json
import os
import sys

# Our own imports
from setupbase import (
    create_cmdclass, ensure_python, find_packages, get_version,
    command_for_func, combine_commands, install_npm, HERE, run,
    skip_npm, which, log
)

from setuptools import setup
from setuptools.command.develop import develop


NAME = 'jupyterlab'
DESCRIPTION = 'The JupyterLab notebook server extension.'
LONG_DESCRIPTION = """
An extensible, comprehensive Jupyter web application.
Development happens on https://github.com/jupyter/jupyterlab, with chat on
https://gitter.im/jupyterlab/jupyterlab.
"""

ensure_python(['>=3.5'])

data_files_spec = [
    ('share/jupyter/lab/static', '%s/static' % NAME, '**'),
    ('share/jupyter/lab/schemas', '%s/schemas' % NAME, '**'),
    ('share/jupyter/lab/themes', '%s/themes' % NAME, '**'),
    ('etc/jupyter/jupyter_notebook_config.d',
     'jupyter-config/jupyter_notebook_config.d', 'jupyterlab.json'),
]

package_data_spec = dict()
package_data_spec[NAME] = [
    'staging/*', 'staging/templates/*', 'static/**', 'tests/mock_packages/**',
    'themes/**', 'schemas/**', '*.js'
]

staging = pjoin(HERE, NAME, 'staging')
npm = ['node', pjoin(staging, 'yarn.js')]
VERSION = get_version('%s/_version.py' % NAME)


def check_assets():
    from distutils.version import LooseVersion

    # Representative files that should exist after a successful build
    targets = [
        'static/package.json',
        'schemas/@jupyterlab/shortcuts-extension/plugin.json',
        'themes/@jupyterlab/theme-light-extension/index.css'
    ]

    for t in targets:
        if not os.path.exists(pjoin(HERE, NAME, t)):
            msg = ('Missing file: %s, `build:prod` script did not complete '
                   'successfully' % t)
            raise ValueError(msg)

    if 'sdist' not in sys.argv and 'bdist_wheel' not in sys.argv:
        return

    target = pjoin(HERE, NAME, 'static', 'package.json')
    with open(target) as fid:
        version = json.load(fid)['jupyterlab']['version']

    if LooseVersion(version) != LooseVersion(VERSION):
        raise ValueError('Version mismatch, please run `build:update`')


cmdclass = create_cmdclass('jsdeps', data_files_spec=data_files_spec,
                           package_data_spec=package_data_spec)
cmdclass['jsdeps'] = combine_commands(
    install_npm(build_cmd='build:prod', path=staging, source_dir=staging,
                build_dir=pjoin(HERE, NAME, 'static'), npm=npm),
    command_for_func(check_assets)
)


class JupyterlabDevelop(develop):
    """A custom develop command that runs yarn"""

    def run(self):
        if not skip_npm:
            if not which('node'):
                error_message = """
Please install nodejs and npm before continuing installation.
nodejs may be installed using conda or directly from: https://nodejs.org/
"""
                log.error(error_message)
                return
            run(npm, cwd=HERE)
        develop.run(self)


# Use default develop - we can ensure core mode later if needed.
cmdclass['develop'] = JupyterlabDevelop


setup_args = dict(
    name=NAME,
    description=DESCRIPTION,
    long_description=LONG_DESCRIPTION,
    version=VERSION,
    packages=find_packages(),
    cmdclass=cmdclass,
    author='Jupyter Development Team',
    author_email='jupyter@googlegroups.com',
    url='http://jupyter.org',
    license='BSD',
    platforms='Linux, Mac OS X, Windows',
    keywords=['ipython', 'jupyter', 'Web'],
    classifiers=[
        'Development Status :: 4 - Beta',
        'Intended Audience :: Developers',
        'Intended Audience :: System Administrators',
        'Intended Audience :: Science/Research',
        'License :: OSI Approved :: BSD License',
        'Programming Language :: Python',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.5',
        'Programming Language :: Python :: 3.6',
    ],
)


setup_args['install_requires'] = [
    'notebook>=4.3.1',
    'jupyterlab_server>=0.2.0,<0.3.0'
]

setup_args['extras_require'] = {
    'test': ['pytest', 'requests', 'pytest-check-links'],
    'docs': [
        'sphinx',
        'recommonmark',
        'sphinx_rtd_theme'
    ],
}


setup_args['include_package_data'] = True
setup_args['python_requires'] = '>=3.5'

# Force entrypoints with setuptools (needed for Windows, unconditional
# because of wheels)
setup_args['entry_points'] = {
    'console_scripts': [
        'jupyter-lab = jupyterlab.labapp:main',
        'jupyter-labextension = jupyterlab.labextensions:main',
        'jupyter-labhub = jupyterlab.labhubapp:main',
        'jlpm = jupyterlab.jlpmapp:main',
    ]
}


if __name__ == '__main__':
    setup(**setup_args)
