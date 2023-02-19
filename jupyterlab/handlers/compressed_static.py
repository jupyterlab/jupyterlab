"""A static file handler that prefers brotli-compressed assets."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import mimetypes

from jupyter_server.base.handlers import FileFindHandler, log


class CompressedFileFindHandler(FileFindHandler):
    """Subclass of ``FileFindHandler`` which prefers brotli-compressed files."""

    async def get(self, path: str, include_body: bool = True) -> None:
        """Overload ``get`` to detect whether a path has a `.br` sidecar."""
        if "br" in self.request.headers.get("Accept-Encoding"):
            path = self.parse_url_path(path)
            br_path = f"{path}.br"

            abspath = self.get_absolute_path(self.root, br_path)
            if abspath:
                log().debug(f"Path {path}(.br) served from {abspath} with brotli")
                path = br_path

        await super().get(path, include_body)

    def get_content_type(self) -> str:
        """Returns the ``Content-Type`` header to be used for this request.

        Overloaded in marked lines to also detect brotli compression
        """
        ### replace assert for ruff ##
        if self.absolute_path is None:
            message = "Path not found"
            raise ValueError(message)
        ##############################
        mime_type, encoding = mimetypes.guess_type(self.absolute_path)
        # per RFC 6713, use the appropriate type for a gzip compressed file
        if encoding == "gzip":
            return "application/gzip"
        ########### THESE ARE THE ADDED LINES ###########
        elif encoding == "br":
            self.set_header("Content-Encoding", encoding)
            return mime_type
        ########### END ADDED LINES ######################
        # As of 2015-07-21 there is no bzip2 encoding defined at
        # http://www.iana.org/assignments/media-types/media-types.xhtml
        # So for that (and any other encoding), use octet-stream.
        elif encoding is not None:
            return "application/octet-stream"
        elif mime_type is not None:
            return mime_type
        # if mime_type not detected, use application/octet-stream
        else:
            return "application/octet-stream"
