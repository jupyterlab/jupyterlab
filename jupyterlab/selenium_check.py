import warnings

from .browser_check import *

warnings.warn("Should switch to using `browser_check.py` instead of `selenium_check.py`", DeprecationWarning)

if __name__ == '__main__':
    BrowserApp.launch_instance()
