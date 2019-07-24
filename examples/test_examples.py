
# -*- coding: utf-8 -*-
"""
This file is meant to be used to test all of the example here and and
in ../packages/services/examples.  We import each of the applications
and add instrument them with a puppeteer test that makes sure
there are no console errors or uncaught errors prior to a sentinel
string being printed.
"""
import glob
import os
import os.path as osp
import subprocess
import sys
from traitlets import Unicode
from traitlets.config.application import Application

here = osp.abspath(osp.dirname(__file__))

def header(path):
    test_name = osp.basename(path)
    print('\n')
    print('*' * 40)
    print('Starting %s test' % test_name)
    print('*' * 40)

aliases = {'path': 'RunTestExamples.path'}

class RunTestExamples(Application):
    aliases = aliases

    path = Unicode(None, allow_none=True, config=True,
                   help='Path to example dir')

    def start(self):
        if self.path is None:
            self.path = here
            paths = [i for i in glob.glob('%s/*' % self.path) if osp.isdir(i)]

            services_dir = osp.abspath(osp.join(self.path, '../packages/services/examples'))
            paths += [i for i in glob.glob('%s/*' % services_dir)]
        else:
            paths = [dirpath for (dirpath, _, filenames) in os.walk(self.path) if 'main.py' in filenames]

        count = 0
        for path in sorted(paths):
            if osp.basename(path) == 'node':
                header(path)
                runner = osp.join(path, 'main.py')
                subprocess.check_call([sys.executable, runner])
                count += 1
                continue

            if not osp.exists(osp.join(path, 'main.py')):
                continue

            count += 1
            header(path)
            runner = osp.join(here, 'example_check.py')
            subprocess.check_call([sys.executable, runner, path])

        print('\n\n%s tests complete!' % count)

        # start subapps, if any
        super().start()

if __name__ == "__main__":
    RunTestExamples.launch_instance()
