# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import functools
import warnings
from collections.abc import Callable
from typing import ParamSpec, TypeVar

P = ParamSpec("P")
R = TypeVar("R")


class jupyterlab_deprecation(Warning):  # noqa
    """Create our own deprecation class, since Python >= 2.7
    silences deprecations by default.
    """


class deprecated:  # noqa
    """Decorator to mark deprecated functions with warning.
    Adapted from `scikit-image/skimage/_shared/utils.py`.

    Parameters
    ----------
    alt_func : str
        If given, tell user what function to use instead.
    behavior : {'warn', 'raise'}
        Behavior during call to deprecated function: 'warn' = warn user that
        function is deprecated; 'raise' = raise error.
    removed_version : str
        The package version in which the deprecated function will be removed.
    """

    def __init__(
        self,
        alt_func: str | None = None,
        behavior: str = "warn",
        removed_version: str | None = None,
    ):
        self.alt_func = alt_func
        self.behavior = behavior
        self.removed_version = removed_version

    def __call__(self, func: Callable[P, R]) -> Callable[P, R]:
        alt_msg = ""
        if self.alt_func is not None:
            alt_msg = f" Use ``{self.alt_func}`` instead."
        rmv_msg = ""
        if self.removed_version is not None:
            rmv_msg = f" and will be removed in version {self.removed_version}"

        function_description = func.__name__ + rmv_msg + "." + alt_msg
        msg = f"Function ``{function_description}`` is deprecated"

        @functools.wraps(func)
        def wrapped(*args: P.args, **kwargs: P.kwargs) -> R:
            if self.behavior == "warn":
                func_code = func.__code__
                warnings.simplefilter("always", jupyterlab_deprecation)
                warnings.warn_explicit(
                    msg,
                    category=jupyterlab_deprecation,
                    filename=func_code.co_filename,
                    lineno=func_code.co_firstlineno + 1,
                )
            elif self.behavior == "raise":
                raise jupyterlab_deprecation(msg)
            return func(*args, **kwargs)

        # modify doc string to display deprecation warning
        doc = "**Deprecated function**." + alt_msg
        if wrapped.__doc__ is None:
            wrapped.__doc__ = doc
        else:
            wrapped.__doc__ = doc + "\n\n    " + wrapped.__doc__

        return wrapped
