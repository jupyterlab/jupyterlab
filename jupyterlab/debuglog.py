"""A mixin for adding a debug log file."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import contextlib
import logging
import os
import sys
import tempfile
import traceback
import warnings
from collections.abc import Iterator
from typing import Protocol, cast

from traitlets import Unicode
from traitlets.config import Configurable


class _DebugLogApp(Protocol):
    log: logging.Logger
    log_level: int | str
    log_format: str
    log_datefmt: str
    _log_formatter_cls: type[logging.Formatter]

    def exit(self, exit_status: int | str | None = None) -> None:
        pass


class DebugLogFileMixin(Configurable):
    debug_log_path = Unicode("", config=True, help="Path to use for the debug log file")

    @contextlib.contextmanager
    def debug_logging(self) -> Iterator[None]:
        app = cast("_DebugLogApp", self)
        log_path = self.debug_log_path
        if os.path.isdir(log_path):
            log_path = os.path.join(log_path, "jupyterlab-debug.log")
        if not log_path:
            handle, log_path = tempfile.mkstemp(prefix="jupyterlab-debug-", suffix=".log")
            os.close(handle)
        log = app.log

        # Transfer current log level to the handlers:
        for h in log.handlers:
            h.setLevel(app.log_level)
        log.setLevel("DEBUG")

        # Create our debug-level file handler:
        _debug_handler = logging.FileHandler(log_path, "w", "utf8", delay=True)
        _log_formatter = app._log_formatter_cls(fmt=app.log_format, datefmt=app.log_datefmt)
        _debug_handler.setFormatter(_log_formatter)
        _debug_handler.setLevel("DEBUG")

        log.addHandler(_debug_handler)

        try:
            yield
        except Exception as ex:
            _, _, exc_traceback = sys.exc_info()
            msg = traceback.format_exception(ex.__class__, ex, exc_traceback)
            for line in msg:
                app.log.debug(line)
            if isinstance(ex, SystemExit):
                warnings.warn(f"An error occurred. See the log file for details: {log_path!s}")
                raise
            warnings.warn("An error occurred.")
            warnings.warn(msg[-1].strip())
            warnings.warn(f"See the log file for details: {log_path!s}")
            app.exit(1)
        else:
            log.removeHandler(_debug_handler)
            _debug_handler.flush()
            _debug_handler.close()
            try:
                os.remove(log_path)
            except FileNotFoundError:
                pass
        log.removeHandler(_debug_handler)
