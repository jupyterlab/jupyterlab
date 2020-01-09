lab_command = ' '.join([
    'jupyter',
    'lab',
    '--dev-mode',
    '--debug',
    '--no-browser',
    '--port={port}',
    '--NotebookApp.token=""',
    '--NotebookApp.use_redirect_file=False',
    '--NotebookApp.base_url={base_url}lab-dev',
    # Disable dns rebinding protection here, since our 'Host' header
    # is not going to be localhost when coming from hub.mybinder.org
    '--NotebookApp.allow_remote_access=True'
])

c.ServerProxy.servers = {
    'lab-dev': {
        'command': [
            '/bin/bash', '-c',
            # Redirect all logs to a log file
            f'{lab_command} >jupyterlab-dev.log 2>&1'
        ],
        'timeout': 20,
        'absolute_url': True
    }
}

c.NotebookApp.default_url = '/lab-dev'
c.NotebookApp.use_redirect_file=False

import logging
c.NotebookApp.log_level = logging.DEBUG
