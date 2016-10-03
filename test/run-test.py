# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import argparse
import subprocess
import sys
import os
import re
import shutil
import threading
import tempfile


# Set up the file structure
root_dir = tempfile.mkdtemp(prefix='mock_contents')
os.mkdir(os.path.join(root_dir, 'src'))
with open(os.path.join(root_dir, 'src', 'temp.txt'), 'w') as fid:
    fid.write('hello')


HERE = os.path.dirname(__file__)


KARMA_PORT = 9876


shell = (sys.platform == 'win32')


def start_notebook():
    nb_command = [sys.executable, '-m', 'notebook', '--no-browser',
                  '--debug', '--NotebookApp.allow_origin="*"',
                  '--NotebookApp.notebook_dir="%s"' % root_dir]
    nb_server = subprocess.Popen(nb_command, shell=shell,
                                 stderr=subprocess.STDOUT,
                                 stdout=subprocess.PIPE)

    # wait for notebook server to start up
    while 1:
        line = nb_server.stdout.readline().decode('utf-8').strip()
        if not line:
            continue
        print(line)
        if 'Jupyter Notebook is running at:' in line:
            base_url = re.search('(http.*?)$', line).groups()[0]
            break

    while 1:
        line = nb_server.stdout.readline().decode('utf-8').strip()
        if not line:
            continue
        print(line)
        if 'Control-C' in line:
            break

    def print_thread():
        while 1:
            line = nb_server.stdout.readline().decode('utf-8').strip()
            if not line:
                continue
            print(line)

    thread = threading.Thread(target=print_thread)
    thread.setDaemon(True)
    thread.start()

    return nb_server, base_url


def run_karma(options, base_url):
    with open(os.path.join(HERE, 'build', 'injector.js'), 'w') as fid:
        fid.write("""
        var node = document.createElement('script');
        node.id = 'jupyter-config-data';
        node.type = 'application/json';
        node.textContent = '{"baseUrl": "%s"}';
        document.body.appendChild(node);
        """ % base_url)

    cmd = 'karma start --browsers=Firefox karma.conf.js'
    return subprocess.check_call(cmd.split(), shell=shell,
                                 stderr=subprocess.STDOUT)


if __name__ == '__main__':
    argparser = argparse.ArgumentParser(
        description='Run Jupyter JS Sevices integration tests'
    )
    argparser.add_argument('-b', '--browsers', default='Firefox',
                           help="Browsers to use for Karma test")
    argparser.add_argument('-d', '--debug', action='store_true',
                           help="Whether to enter debug mode in Karma")
    options = argparser.parse_args(sys.argv[1:])

    nb_server, base_url = start_notebook()

    try:
        resp = run_karma(options, base_url)
    except subprocess.CalledProcessError:
        resp = 1
    finally:
        nb_server.kill()

    shutil.rmtree(root_dir, True)
    sys.exit(resp)
