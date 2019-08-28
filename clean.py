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


subprocess.check_call('python -m pip uninstall -y jupyterlab'.split(), cwd=here)

# get the exclude patterns listed in .cleanignore
with open(os.path.join(here, '.cleanignore')) as f:
    git_clean_exclude = [f'--exclude={stripped}'
                         for stripped in
                         (line.strip() for line in f)
                         if stripped and not stripped.startswith('#')]

git_clean_command = ['git', 'clean', '-dfx'] + git_clean_exclude
subprocess.check_call(git_clean_command, cwd=here)
