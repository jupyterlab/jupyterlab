# coding: utf-8
"""The JupyterLab build entry point"""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import json
import os
import shutil
from subprocess import check_call

from jupyter_core.application import JupyterApp
from notebook.services.config import ConfigManager
from jupyter_core.paths import jupyter_config_path
from jinja2 import Environment, FileSystemLoader

from ._version import __version__
from .labextensions import (
    CONFIG_DIR, find_labextension, validate_labextension_folder,
    get_labextension_manifest_data_by_name
)


HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_ENVIRONMENT = Environment(
    autoescape=False,
    loader=FileSystemLoader(os.path.join(HERE, 'src')),
    trim_blocks=False)


def render_template(template_filename, context):
    return TEMPLATE_ENVIRONMENT.get_template(template_filename).render(context)


def get_labconfig(app):
    """Get the merged lab configuration."""
    # Load server extensions with ConfigManager.
    # This enables merging on keys, which we want for extension enabling.
    # Regular config loading only merges at the class level,
    # so each level (user > env > system) clobbers the previous.
    config_path = jupyter_config_path()
    if app.config_dir not in config_path:
        # add nbapp's config_dir to the front, if set manually
        config_path.insert(0, app.config_dir)
    config_path = [os.path.join(p, CONFIG_DIR) for p in config_path]
    return ConfigManager(read_config_path=config_path)


def get_extensions(lab_config):
    """Get the valid extensions from lab config."""
    extensions = dict()
    labextensions = lab_config.get('labextensions')
    for (name, ext_config) in labextensions.items():
        if not ext_config['enabled']:
            continue
        folder = find_labextension(name)
        if folder is None:
            continue
        warnings = validate_labextension_folder(name, folder)
        if warnings:
            continue
        data = get_labextension_manifest_data_by_name(name)
        if data is None:
            continue
        modname = ext_config.get('python_module', None)
        data['jupyter']['python_module'] = modname
        extensions[name] = data
    return extensions


def move_extension(value):
    """Move an extension to the appropriate folder in the build directory"""
    # Figure out the target path.
    parts = value['name'].split('/')
    path = os.sep.join(parts)
    path = os.path.join('./build/node_modules', path)
    try:
        shutil.copytree(value['jupyter']['labextension_path'], path)
    except OSError:
        pass


class LabBuilder(JupyterApp):
    version = __version__

    description = """
        JupyterLab Builder - builds the Application with extensions.
    """

    def start(self):
        config = get_labconfig(self)
        extensions = get_extensions(config)

        # Run build-main
        check_call(['node', 'build-main'], cwd=HERE)

        # Copy the labextension folders
        for value in extensions.values():
            move_extension(value)

        # Template index.js
        context = dict(jupyterlab_extensions=list(extensions.keys()))
        with open(os.path.join(HERE, 'build', 'index.js'), 'w') as fid:
            fid.write(render_template('index.js', context))

        # Fill in package.json dependencies
        with open(os.path.join(HERE, 'src', 'package.json')) as fid:
            data = json.load(fid)
        for value in extensions.values():
            data['dependencies'][value['name']] = '^' + value['version']
        with open(os.path.join(HERE, 'build', 'package.json'), 'w') as fid:
            json.dump(data, fid)

        # Run finish-build
        check_call(['node', 'finish-build'], cwd=HERE)


#-----------------------------------------------------------------------------
# Main entry point
#-----------------------------------------------------------------------------
main = launch_new_instance = LabBuilder.launch_instance

if __name__ == '__main__':
    main()

