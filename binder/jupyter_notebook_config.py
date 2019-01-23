c.ServerProxy.servers = {
    'lab-dev': {
        'command': [
            'jupyter',
            'lab',
            '--no-browser',
            '--port={port}',
            '--NotebookApp.token=""',
            '--NotebookApp.base_url={base_url}lab-dev'
        ]
    }
}

c.NotebookApp.default_url = '/lab-dev'

import logging
c.NotebookApp.log_level = logging.DEBUG
