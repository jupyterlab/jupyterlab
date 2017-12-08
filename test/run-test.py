# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from __future__ import print_function, absolute_import

from os.path import join as pjoin
import json
import os
import sys

from jupyterlab.tests.test_app import TestApp

HERE = os.path.abspath(os.path.dirname(__file__))


class JupyterLabTestApp(TestApp):
    """A notebook app that runs the jupyterlab karma tests.
    """

    def get_command(self):
        """Get the command to run."""
        terminalsAvailable = self.web_app.settings['terminals_available']
        # Compatibility with Notebook 4.2.
        token = getattr(self, 'token', '')
        config = dict(baseUrl=self.connection_url, token=token,
                      terminalsAvailable=str(terminalsAvailable),
                      foo='bar')

        print('\n\nNotebook config:')
        print(json.dumps(config))

        with open(pjoin(HERE, 'build', 'injector.js'), 'w') as fid:
            fid.write("""
            var node = document.createElement('script');
            node.id = 'jupyter-config-data';
            node.type = 'application/json';
            node.textContent = '%s';
            document.body.appendChild(node);
            """ % json.dumps(config))

        return ['karma', 'start'] + sys.argv[1:], dict(cwd=HERE)


if __name__ == '__main__':
    JupyterLabTestApp.launch_instance([])
