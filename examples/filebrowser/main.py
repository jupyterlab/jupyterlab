"""
An example demonstrating a stand-alone "filebrowser" example.

Copyright (c) Jupyter Development Team.
Distributed under the terms of the Modified BSD License.

Example
-------

To run the example, see the instructions in the README to build it. Then
run ``python main.py`` and navigate your browser to ``localhost:8765``.

Note
----

This file provides the Python code for interacting with the Jupyter notebook
server using ``ZMQ`` and the ``tornado`` web server.

"""
import re
import subprocess
import sys
import threading

import tornado.web

# Install the pyzmq ioloop. Must be done after importing tornado.web and
# before importing any additional tornado modules
from zmq.eventloop import ioloop
ioloop.install()

PORT = 8765
"""int: Port number of web application"""


class MainPageHandler(tornado.web.RequestHandler):
    """Handle requests between the main app page and notebook server."""

    def initialize(self, base_url):
        """Intitialize the base URL of the handler."""
        self.base_url = base_url

    def get(self):
        """Get the main page for the application's interface."""
        return self.render("index.html", static=self.static_url,
                           base_url=self.base_url)


def main(argv):
    """Start the 'filebrowser' example.

    - Start the Tornado main event loop for the Jupyter notebook server
    - Set up the main page event handler for the 'console' example

    """
    url = "http://localhost:%s" % PORT

    nb_command = [sys.executable, '-m', 'notebook', '--no-browser', '--debug',
                  '--NotebookApp.allow_origin="%s"' % url]
    nb_server = subprocess.Popen(nb_command, stderr=subprocess.STDOUT,
                                 stdout=subprocess.PIPE)

    # Wait for Jupyter notebook server to complete start up
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

    handlers = [
        (r"/", MainPageHandler, {'base_url': base_url}),
        (r'/(.*)', tornado.web.StaticFileHandler, {'path': '.'}),
    ]

    app = tornado.web.Application(handlers, static_path='build',
                                  template_path='.',
                                  compiled_template_cache=False)

    app.listen(PORT, 'localhost')

    # For Windows, add no-op to wake every 5 seconds (5000 ms) to handle
    # signals that may be ignored by the Tornado main event loop
    if sys.platform.startswith('win'):
        # add no-op to wake every 5s
        # to handle signals that may be ignored by the inner loop
        pc = ioloop.PeriodicCallback(lambda: None, 5000)
        pc.start()

    loop = ioloop.IOLoop.current()
    print('Browse to http://localhost:%s' % PORT)
    try:
        # Start the Tornado main event loop
        loop.start()
    except KeyboardInterrupt:
        print(" Shutting down on SIGINT")
    finally:
        nb_server.kill()
        loop.close()

if __name__ == '__main__':
    main(sys.argv)
