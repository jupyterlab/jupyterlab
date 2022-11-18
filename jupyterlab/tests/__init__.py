# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from typing import NamedTuple

try:
    from unittest.mock import AsyncMock
except ImportError:
    AsyncMock = None

from jupyter_server.utils import ensure_async


def to_async_mock(args):
    """Convert arguments to awaitable arguments or asynchronous mock."""
    if AsyncMock is None:
        return ensure_async(args)
    else:
        return AsyncMock(return_value=args)


class Response(NamedTuple):
    """Fake tornado response."""

    body: bytes
