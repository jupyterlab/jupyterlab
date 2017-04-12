# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from __future__ import print_function

import argparse
import json
import os
from subprocess import check_output
import sys

from jupyter_core import paths
from .commands import (
    install_extension, uninstall_extension, link_extension,
    list_extensions, build
)
from .labapp import LabApp
from ._version import __version__


class JupyterLabParser(argparse.ArgumentParser):

    @property
    def epilog(self):
        """Add subcommands to epilog on request

        Avoids searching PATH for subcommands unless help output is requested.
        """
        return 'Available subcommands: %s' % ' '.join(list_subcommands())

    @epilog.setter
    def epilog(self, x):
        """Ignore epilog set in Parser.__init__"""
        pass


def list_subcommands():
    return ['launch', 'install_extension', 'build', 'list_extensions',
            'uninstall_extension', 'link_extension']


def jupyterlab_parser():
    parser = JupyterLabParser(
        description="JupyterLab: Interactive Computing Environment",
    )
    group = parser.add_mutually_exclusive_group(required=True)
    # don't use argparse's version action because it prints to stderr on py2
    group.add_argument('--version', action='store_true',
        help="show the jupyter command's version and exit")
    group.add_argument('subcommand', type=str, nargs='?',
        help='the subcommand to launch')
    group.add_argument('--config-dir', action='store_true',
        help="show Jupyter config dir")
    group.add_argument('--data-dir', action='store_true',
        help="show Jupyter data dir")
    group.add_argument('--paths', action='store_true',
        help="show all Jupyter paths. Add --json for machine-readable format.")
    group.add_argument('--describe', action='store_true',
        help="describe the JupyterLab application")
    parser.add_argument('--json', action='store_true',
        help="output paths as machine-readable json")

    return parser


def main():
    if len(sys.argv) > 1 and not sys.argv[1].startswith('-'):
        # Don't parse if a subcommand is given
        # Avoids argparse gobbling up args passed to subcommand, such as `-h`.
        subcommand = sys.argv[1]
    else:
        parser = jupyterlab_parser()
        args, opts = parser.parse_known_args()
        subcommand = args.subcommand
        if args.version:
            print(__version__)
            return
        if args.json and not args.paths:
            sys.exit("--json is only used with --paths")
        if args.config_dir:
            print(paths.jupyter_config_dir()[0])
            return
        if args.data_dir:
            print(paths.jupyter_data_dir()[0])
            return
        if args.paths:
            data = {}
            data['config'] = paths.ENV_CONFIG_PATH[0]
            data['data'] = paths.ENV_JUPYTER_PATH[0]
            if args.json:
                print(json.dumps(data))
            else:
                for name in sorted(data):
                    path = data[name]
                    print('%s:' % name)
                    print('    ' + path)
            return
        if args.describe:
            description = 'unknown'
            try:
                cwd = os.path.dirname(os.path.dirname(__file__))
                description = check_output(['git', 'describe'], cwd=cwd)
                description = description.decode('utf8').strip()
            except Exception:
                pass
            print(description)
            return

    if subcommand == 'launch':
        sys.argv = sys.argv[1:]
        LabApp.launch_instance()
    elif subcommand == 'install_extension':
        [install_extension(arg) for arg in args]
    elif subcommand == 'list_extensions':
        list_extensions()
    elif subcommand == 'uninstall_extension':
        [uninstall_extension(arg) for arg in args]
    elif subcommand == 'link_extension':
        [link_extension(arg) for arg in args]
    elif subcommand == 'build':
        build()
    else:
        print('unknown subcommand "%s"' % subcommand)
        sys.exit(1)


if __name__ == '__main__':
    main()
