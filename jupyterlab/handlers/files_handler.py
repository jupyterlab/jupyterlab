# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import os
import time
from fnmatch import fnmatch

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import ensure_async
from tornado import web
from tornado.escape import json_encode


class FilesHandler(APIHandler):
    """Handler for file listing requests."""

    @property
    def contents_manager(self):
        """Currently configured jupyter server ContentsManager."""
        return self.settings["contents_manager"]

    @property
    def root_dir(self):
        """Root directory to scan."""
        return self.contents_manager.root_dir

    async def should_hide(self, entry, excludes):
        """Decides if a file or directory should be hidden from the search results.

        Based on the `allow_hidden` and `hide_globs` properties of the ContentsManager,
        as well as a set of exclude patterns included in the client request.

        Parameters
        ----------
        entry: DirEntry
            From os.scandir
        excludes: set of str
            Exclude patterns

        Returns
        -------
        bool
        """
        relpath = os.path.relpath(entry.path)

        return (
            any(fnmatch(entry.name, glob) for glob in excludes)
            or not self.contents_manager.should_list(entry.name)
            or (
                await ensure_async(self.contents_manager.is_hidden(relpath))
                and not self.contents_manager.allow_hidden
            )
        )

    async def scan_disk(self, path, excludes, on_disk=None, max_depth=None, current_depth=0):
        """Recursively scan directory for files.

        Parameters
        ----------
        path: str
            Directory path to scan
        excludes: set of str
            Exclude patterns
        on_disk: dict
            Dictionary to accumulate results
        max_depth: int or None
            Maximum depth to scan
        current_depth: int
            Current depth level

        Returns
        -------
        dict
            Dictionary of files grouped by parent directory
        """
        if on_disk is None:
            on_disk = {}
        if max_depth is not None and current_depth >= max_depth:
            return on_disk

        try:
            for entry in os.scandir(path):
                if await self.should_hide(entry, excludes):
                    continue
                elif entry.is_dir():
                    await self.scan_disk(
                        entry.path, excludes, on_disk, max_depth, current_depth + 1
                    )
                elif entry.is_file():
                    parent = os.path.relpath(os.path.dirname(entry.path), self.root_dir)
                    on_disk.setdefault(parent, []).append(entry.name)
        except (OSError, PermissionError):
            # Skip directories we can't access
            pass

        return on_disk

    @web.authenticated
    async def get(self):
        """Get file listing for file scanning functionality.

        Gets the name of every file under the specified directory
        binned by parent folder relative to the root notebooks dir.

        Query Parameters
        ----------------
        path: str
            Path to search within (relative to root_dir)
        excludes: list of str
            File name patterns to exclude from results
        depth: int, optional
            Maximum directory depth to search

        Response
        --------
        JSON
            scan_seconds: Time in seconds to collect all file names
            contents: File names binned by parent directory
        """
        excludes = set(self.get_arguments("excludes"))
        current_path = self.get_argument("path", default="")
        depth_arg = self.get_argument("depth", default=None)
        max_depth = int(depth_arg) if depth_arg is not None and depth_arg != "null" else None

        start_ts = time.time()

        full_path = os.path.join(self.root_dir, current_path) if current_path else self.root_dir

        contents_by_path = await self.scan_disk(full_path, excludes, max_depth=max_depth)
        delta_ts = time.time() - start_ts

        self.write(json_encode({"scan_seconds": delta_ts, "contents": contents_by_path}))


# The path for lab files API.
files_path = r"/lab/api/files"
