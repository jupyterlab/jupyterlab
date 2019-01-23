c.ServerProxy.servers = {
    'lab-dev': {
        'command': [
            'jupyter',
            'lab',
            '--no-browser',
            '--dev-mode',
            '--port={port}',
            '--NotebookApp.token=""',
            '--NotebookApp.base_url={base_url}/lab-dev'
        ]
    }
}

c.NotebookApp.default_url = '/lab-dev'
