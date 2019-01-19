c.ServerProxy.servers = {
    'lab-dev': {
        'command': [
            'jupyter',
            'lab',
            '--no-browser',
            '--dev-mode',
            '--port={port}',
            '--NotebookApp.token=""',
        ]
    }
}

c.NotebookApp.default_url = '/lab-dev'
