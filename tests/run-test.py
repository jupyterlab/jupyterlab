import os
from jupyterlab.tests.test_app import run_jest

HERE = os.path.realpath(os.path.dirname(__file__))

if __name__ == '__main__':
    run_jest(HERE)
