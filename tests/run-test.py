import os
from jupyterlab.tests.test_app import run_jest, JestApp

HERE = os.path.realpath(os.path.dirname(__file__))

if __name__ == '__main__':
    # xeus-python requires the xpython_debug_logs folder
    jest_app = JestApp.instance()
    os.mkdir(os.path.join(jest_app.notebook_dir, 'xpython_debug_logs'))

    run_jest(HERE)
