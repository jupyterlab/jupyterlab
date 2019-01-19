c.ServerProxy.servers = {
    'lab-dev': {
        'command': [
            'python',
            '-m',
            'http.server',
            '{port}',
        ]
    }
}

c.NotebookApp.default_url = '/lab-dev'
