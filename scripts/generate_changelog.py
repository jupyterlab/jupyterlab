''' Generate a changelog for JupyterLab from the GitHub releases '''

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.


import requests

# Get the list of releases.
r = requests.get('https://api.github.com/repos/jupyterlab/jupyterlab/releases')

if r.status_code == 200:
    releases = r.json()
    with open('CHANGELOG.md', 'w') as f:
        f.write('# Changelog\n\n')
        for release in releases:
            name = release['name']
            tag_name = release['tag_name']
            notes = release['body'].replace('\r\n', '\n')

            title = f'{name} ({tag_name})' if name != tag_name else name
            f.write(f'## {title}\n')
            f.write(notes)
            f.write('\n\n')
