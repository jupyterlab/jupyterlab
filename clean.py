import os
import subprocess

here = os.path.abspath(os.path.dirname(__file__))


# Workaround for https://github.com/git-for-windows/git/issues/607
if os.name == 'nt':
    for (root, dnames, files) in os.walk(here):
        if 'node_modules' in dnames:
            subprocess.check_call(['rmdir', '/s', '/q', 'node_modules'],
                                  cwd=root, shell=True)
            dnames.remove('node_modules')


subprocess.check_call(['git', 'clean', '-dfx'], cwd=here)

subprocess.call('python -m pip uninstall -y jupyterlab'.split(), cwd=here)
