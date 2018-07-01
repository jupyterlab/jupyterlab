# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from __future__ import print_function, absolute_import

import json
import logging
import os

from traitlets import Bool

from jupyterlab.tests.test_app import ProcessTestApp


HERE = os.path.dirname(os.path.realpath(__file__))


class ServicesTestApp(ProcessTestApp):
    """A notebook app that runs a mocha test."""

    coverage = Bool(False, help='Whether to run coverage')

    devtool = Bool(False, help='Whether to run with devtool')

    def get_command(self):
        """Get the command to run"""
        terminalsAvailable = self.web_app.settings['terminals_available']
        mocha = os.path.join(HERE, '..', 'node_modules', '.bin', '_mocha')
        mocha = os.path.realpath(mocha)
        defaults = ['build/**/*.spec.js', 'build/*.spec.js']
        defaults += ['--retries', '2',
                     '--jupyter-config-data=./build/config.json']
        default_timeout = ['--timeout', '20000']
        debug = self.log.level == logging.DEBUG

        if self.coverage:
            istanbul = os.path.realpath(
                os.path.join(HERE, '..', 'node_modules', '.bin', 'istanbul')
            )
            cmd = [istanbul, 'cover', '--dir', 'coverage', '_mocha', '--']
            cmd += default_timeout + defaults
        elif self.devtool:
            cmd = ['devtool', mocha, '-qc', '--timeout', '120000'] + defaults
        else:
            cmd = [mocha] + default_timeout + defaults
            if debug:
                cmd += ['--debug-brk']

        config = dict(baseUrl=self.connection_url,
                      terminalsAvailable=str(terminalsAvailable),
                      token=self.token)

        with open(os.path.join(HERE, 'build', 'config.json'), 'w') as fid:
            json.dump(config, fid)

        return cmd, dict(cwd=HERE)


if __name__ == '__main__':
    ServicesTestApp.launch_instance()
