# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import subprocess
import sys
import argparse
import threading

KARMA_PORT = 9876

argparser = argparse.ArgumentParser(
        description='Run Jupyter JS Terminal integration tests'
    )
argparser.add_argument('-b', '--browsers', default='Firefox',
                       help="Browsers to use for Karma test")
argparser.add_argument('-d', '--debug', action='store_true',
                       help="Whether to enter debug mode in Karma")
options = argparser.parse_args(sys.argv[1:])

nb_command = [sys.executable, '-m', 'notebook', '--no-browser',
              '--NotebookApp.allow_origin="*"']
nb_server = subprocess.Popen(nb_command, stderr=subprocess.STDOUT,
                             stdout=subprocess.PIPE)

# wait for notebook server to start up
while 1:
    line = nb_server.stdout.readline().decode('utf-8').strip()
    if not line:
        continue
    print(line)
    if 'The IPython Notebook is running at: http://localhost:8888/':
        break
    if 'Control-C' in line:
        raise ValueError(
            'The port 8888 was already taken, kill running notebook servers'
        )


def readlines():
    """Print the notebook server output."""
    while 1:
        line = nb_server.stdout.readline().decode('utf-8').strip()
        if line:
            print(line)


thread = threading.Thread(target=readlines)
thread.setDaemon(True)
thread.start()

if options.debug:
    options.browsers = 'Chrome'

karma_command = ['karma', 'start', '--browsers=' + options.browsers,
                 'karma.conf.js', '--port=%s' % KARMA_PORT]
if options.debug:
    karma_command += ['--singleRun=false', '--debug=true']
print(' '.join(karma_command))
resp = 1
try:
    resp = subprocess.check_call(karma_command, stderr=subprocess.STDOUT)
except subprocess.CalledProcessError:
    pass
finally:
    nb_server.kill()
sys.exit(resp)
