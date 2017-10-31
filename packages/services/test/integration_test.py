# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from __future__ import print_function, absolute_import

import json
import logging
import os

from jupyterlab.process_app import TestApp


HERE = os.path.dirname(os.path.realpath(__file__))


class ServicesTestApp(TestApp):
    """A notebook app that runs a mocha test."""

    def get_command(self):
        """Get the command to run"""
        terminalsAvailable = self.web_app.settings['terminals_available']
        mocha = os.path.join(HERE, '..', 'node_modules', '.bin', 'mocha')
        mocha = os.path.realpath(mocha)
        cmd = [mocha, '--timeout', '200000',
               '--retries', '2',
               'build/integration.js',
               '--jupyter-config-data=./build/config.json']
        if self.log.level == logging.DEBUG:
            cmd = ['devtool', mocha, '-qc'] + cmd[1:]

        config = dict(baseUrl=self.connection_url,
                      terminalsAvailable=str(terminalsAvailable),
                      token=self.token)

        with open('build/config.json', 'w') as fid:
            json.dump(config, fid)

        return cmd, dict(cwd=HERE)


if __name__ == '__main__':
    ServicesTestApp.launch_instance()
