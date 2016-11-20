"""
Took this from the jupyter command script, to run Jupyter interactively
or in debug mode.
"""

import re
import sys
from pkg_resources import load_entry_point

if __name__ == '__main__':
    sys.argv[0] = re.sub(r'(-script\.pyw?|\.exe)?$', '', sys.argv[0])
    sys.exit(
        load_entry_point('jupyterlab', 'console_scripts', 'jupyter-lab')()
    )
