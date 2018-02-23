''' Generate a changelog for JupyterLab from the GitHub releases '''

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import re
import requests
import dateutil.parser

# Get the list of releases.
r = requests.get('https://api.github.com/repos/jupyterlab/jupyterlab/releases')

if r.status_code == 200:
    releases = r.json()
    with open('CHANGELOG.md', 'w') as f:
        f.write('# JupyterLab Changelog\n\n')
        for release in releases:
            name = release['name']
            tag_name = release['tag_name']
            tag_url = release['html_url']
            tag_date = dateutil.parser.parse(release['published_at'])
            notes = release['body'].replace('\r\n', '\n')
            notes = re.sub(r'#([0-9]+)',
                           r'[#\1](https://github.com/jupyterlab/jupyterlab/issues/\1)',
                           notes)

            title = f'{name} ({tag_name})' if name != tag_name else name
            f.write(f'## [{title}]({tag_url})\n')
            f.write(f'#### {tag_date.strftime("%b %d, %Y")}\n')
            f.write(notes)
            f.write('\n\n')
