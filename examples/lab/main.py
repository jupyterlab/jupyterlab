"""
Copyright (c) Jupyter Development Team.
Distributed under the terms of the Modified BSD License.
"""
import re
import subprocess
import sys
import threading

import tornado.web

# Install the pyzmq ioloop. This has to be done before anything else from
# tornado is imported.
from zmq.eventloop import ioloop
ioloop.install()

PORT = 8765


class MainPageHandler(tornado.web.RequestHandler):

    def initialize(self, base_url, ws_url):
        self.base_url = base_url
        self.ws_url = ws_url

    def get(self):
        return self.render("index.html", static=self.static_url,
                           base_url=self.base_url, ws_url=self.ws_url)


def main(argv):

    url = "http://localhost:%s" % PORT

    nb_command = [sys.executable, '-m', 'notebook', '--no-browser', '--debug',
                  '--NotebookApp.allow_origin="%s"' % url]
    nb_server = subprocess.Popen(nb_command, stderr=subprocess.STDOUT,
                                 stdout=subprocess.PIPE)

    # wait for notebook server to start up
    while 1:
        line = nb_server.stdout.readline().decode('utf-8').strip()
        if not line:
            continue
        print(line)
        if 'Jupyter Notebook is running at:' in line:
            base_url = re.search('(http.*?)$', line).groups()[0]
            ws_url = base_url.replace('http', 'ws')
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
        (r"/", MainPageHandler, {'base_url': base_url, 'ws_url': ws_url}),
        (r'/(.*)', tornado.web.StaticFileHandler, {'path': '.'}),
    ]

    app = tornado.web.Application(handlers, static_path='build',
                                  template_path='.',
                                  compiled_template_cache=False)

    app.listen(PORT, 'localhost')

    if sys.platform.startswith('win'):
        # add no-op to wake every 5s
        # to handle signals that may be ignored by the inner loop
        pc = ioloop.PeriodicCallback(lambda: None, 5000)
        pc.start()

    loop = ioloop.IOLoop.current()
    print('Browse to http://localhost:%s' % PORT)
    try:
        loop.start()
    except KeyboardInterrupt:
        print(" Shutting down on SIGINT")
    finally:
        nb_server.kill()
        loop.close()

if __name__ == '__main__':
    main(sys.argv)
