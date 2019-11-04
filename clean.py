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

def resolvePattern(pat):
    """handle a leading `#` or `@` in a pattern
    """
    pat = pat.strip()

    if not pat or pat.startswith('#'):
        return []
    elif pat.startswith('@'):
        raw = pat[1:]
        return [
            raw,
            f'!packages/**/{raw}',
            f'!**/node_modules/**/{raw}'
        ]
    else:
        return [pat]

# get the exclude patterns listed in .cleanignore
with open(os.path.join(here, '.cleanignore')) as f:
    git_clean_exclude = [f'--exclude={pat}'
                         for line in f
                         for pat in resolvePattern(line)]

git_clean_command = ['git', 'clean', '-dfx'] + git_clean_exclude
subprocess.check_call(git_clean_command, cwd=here)
