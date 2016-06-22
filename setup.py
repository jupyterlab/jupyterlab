# -*- coding: utf-8 -*-

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from __future__ import print_function
from setuptools import setup, find_packages, Command
from setuptools.command.sdist import sdist
from setuptools.command.build_py import build_py
from setuptools.command.egg_info import egg_info
from subprocess import check_call
import os
import sys
import platform
import shutil

here = os.path.dirname(os.path.abspath(__file__))
extension_root = os.path.join(here, 'jupyterlab')
is_repo = os.path.exists(os.path.join(here, '.git'))

def run(cmd, cwd=None):
    """Run a command

    >>> run('npm install', cwd='./subdir')
    """
    # On Windows, shell should be True so that the path is searched for the command.
    shell = (sys.platform == 'win32')
    check_call(cmd.split(), shell=shell, cwd=cwd, stdout=sys.stdout, stderr=sys.stderr)

from distutils import log
log.set_verbosity(log.DEBUG)
log.info('setup.py entered')

LONG_DESCRIPTION = 'This is a very early pre-alpha developer preview. It is not ready for general usage yet.'

def js_prerelease(command, strict=False):
    """decorator for building minified js/css prior to another command"""
    class DecoratedCommand(command):
        def run(self):
            jsdeps = self.distribution.get_command_obj('jsdeps')
            if not is_repo and all(os.path.exists(t) for t in jsdeps.targets):
                # sdist, nothing to do
                command.run(self)
                return

            try:
                self.distribution.run_command('jsdeps')
            except Exception as e:
                missing = [t for t in jsdeps.targets if not os.path.exists(t)]
                if strict or missing:
                    log.warn('rebuilding js and css failed')
                    if missing:
                        log.error('missing files: %s' % missing)
                    raise e
                else:
                    log.warn('rebuilding js and css failed (not a problem)')
                    log.warn(str(e))
            command.run(self)
    return DecoratedCommand

def update_package_data(distribution):
    """update build_py options to get package_data changes"""
    build_py = distribution.get_command_obj('build_py')
    build_py.finalize_options()


class NPM(Command):
    description = 'install package.json dependencies using npm'

    user_options = []

    node_modules = os.path.join(here, 'node_modules')
    jlab_node_modules = os.path.join(extension_root, 'node_modules')

    targets = [
        os.path.join(here, 'jupyterlab', 'build', 'bundle.js'),
    ]

    def initialize_options(self):
        pass

    def finalize_options(self):
        pass

    def has_npm(self):
        try:
            run('npm --version')
            return True
        except:
            return False

    def run(self):
        has_npm = self.has_npm()
        if not has_npm:
            log.error("`npm` unavailable.  If you're running this command using sudo, make sure `npm` is available to sudo")
        if not os.path.exists(self.node_modules):
            log.info("Installing build dependencies with npm.  This may take a while...")
            run('npm install', cwd=here)
        if not os.path.exists(self.jlab_node_modules):
            log.info("Installing extension build dependencies with npm.  This may take a while...")
            run('npm install', cwd=extension_root)
        run('npm run build:serverextension')

        for t in self.targets:
            if not os.path.exists(t):
                msg = 'Missing file: %s' % t
                if not has_npm:
                    msg += '\nnpm is required to build the development version'
                raise ValueError(msg)

        # update package data in case this created new files
        update_package_data(self.distribution)

import json
with open(os.path.join(here, 'package.json')) as f:
    packagejson = json.load(f)

setup_args = {
    'name': 'jupyterlab',
    'version': packagejson['version'],
    'description': 'A pre-alpha Jupyter lab environment notebook server extension.',
    'long_description': LONG_DESCRIPTION,
    'License': 'BSD',
    'include_package_data': True,
    'install_requires': ['notebook>=4.2.0'],
    'packages': find_packages(),
    'zip_safe': False,
    'package_data': {'jupyterlab': [
        'build/*',
        'lab.html'
    ]},
    'cmdclass': {
        'build_py': js_prerelease(build_py),
        'egg_info': js_prerelease(egg_info),
        'sdist': js_prerelease(sdist, strict=True),
        'jsdeps': NPM,
    },
    'entry_points': {
        'console_scripts': [
            'jupyter-lab = jupyterlab.labapp:main',
        ]
    },
    'author': 'Jupyter Development Team',
    'author_email': 'jupyter@googlegroups.com',
    'url': 'http://jupyter.org',
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

setup(**setup_args)
