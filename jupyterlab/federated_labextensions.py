# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from typing import Any

from jupyter_builder.federated_extensions import (
    build_labextension as _build_labextension,
)
from jupyter_builder.federated_extensions import (
    develop_labextension as _develop_labextension,
)
from jupyter_builder.federated_extensions import (
    develop_labextension_py as _develop_labextension_py,
)
from jupyter_builder.federated_extensions import (
    watch_labextension as _watch_labextension,
)

from jupyterlab.utils import deprecated


@deprecated("jupyter_builder.federated_extensions.build_labextension")
def build_labextension(*args: Any, **kwargs: Any) -> None:
    return _build_labextension(*args, **kwargs)


@deprecated("jupyter_builder.federated_extensions.watch_labextension")
def watch_labextension(*args: Any, **kwargs: Any) -> None:
    return _watch_labextension(*args, **kwargs)


@deprecated("jupyter_builder.federated_extensions.develop_labextension")
def develop_labextension(*args: Any, **kwargs: Any) -> str:
    return _develop_labextension(*args, **kwargs)


@deprecated("jupyter_builder.federated_extensions.develop_labextension_py")
def develop_labextension_py(*args: Any, **kwargs: Any) -> list[str]:
    return _develop_labextension_py(*args, **kwargs)


__all__ = [
    "build_labextension",
    "develop_labextension",
    "develop_labextension_py",
    "watch_labextension",
]
