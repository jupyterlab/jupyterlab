"""An error handler for JupyterLab."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from jupyter_server.base.handlers import JupyterHandler
from jupyter_server.extension.handler import ExtensionHandlerMixin
from tornado import web

TEMPLATE = """
<!DOCTYPE HTML>
<html>
<head>
    <meta charset="utf-8">
    <title>JupyterLab Error</title>
</head>
<body>
<h1>JupyterLab Error<h1>
{messages}
</body>
"""


class ErrorHandler(ExtensionHandlerMixin, JupyterHandler):
    def initialize(
        self,
        name: str | list[str] | None = "",
        messages: list[str] | None = None,
    ) -> None:
        if isinstance(name, list):
            if messages is not None:
                msg = "messages was provided both positionally and as a keyword"
                raise TypeError(msg)
            messages = name
            name = ""
        super().initialize(name=name or "")
        self.messages = messages or []

    @web.authenticated
    @web.removeslash
    def get(self) -> None:
        msgs = [f"<h2>{msg}</h2>" for msg in self.messages]
        self.write(TEMPLATE.format(messages="\n".join(msgs)))
