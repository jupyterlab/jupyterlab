"""Tornado handlers for license reporting."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import json
import re
import csv
import textwrap
import io
from pathlib import Path

from concurrent.futures import ThreadPoolExecutor

from tornado.platform.asyncio import to_tornado_future
from tornado import web, gen

from traitlets import default, Dict, Unicode, Instance
from traitlets.config import LoggingConfigurable
from jupyter_server.base.handlers import APIHandler

from ..commands import AppOptions, get_app_info


# TODO: maybe better as JSON?
THIRD_PARTY_LICENSES = "third-party-licenses.json"

# The path for lab licenses handler.
licenses_handler_path = r"/lab/api/licenses"


class LicensesManager(LoggingConfigurable):
    """A manager for listing the licenses for all frontend end code distributed
    by an application and any federated extensions
    """

    executor = ThreadPoolExecutor(max_workers=1)

    app_info = Dict()

    @default("app_info")
    def _default_app_info(self):
        """Lazily load the app info. This is expensive, but probably the only
        way to be sure.
        """
        return get_app_info(
            AppOptions(
                logger=self.parent.log,
                app_dir=self.parent.app_dir,
                labextensions_path=[
                    *self.parent.extra_labextensions_path,
                    *self.parent.labextensions_path,
                ],
            )
        )

    @gen.coroutine
    def report_async(
        self, report_format="markdown", bundles_pattern=".*", full_text=False
    ):
        """Asynchronous wrapper around the potentially slow job of locating
        and encoding all of the licenses
        """
        report = yield self.executor.submit(
            self.report,
            report_format=report_format,
            bundles_pattern=bundles_pattern,
            full_text=full_text,
        )
        return report

    def report(self, report_format, bundles_pattern, full_text):
        """create a human- or machine-readable report"""
        licenses = self.licenses(bundles_pattern=bundles_pattern)
        if report_format == "json":
            return json.dumps(licenses, indent=2, sort_keys=True), "application/json"
        elif report_format == "csv":
            return self.report_csv(licenses), "text/csv"
        elif report_format == "markdown":
            return (self.report_markdown(licenses, full_text=full_text), "text/plain")

    def report_csv(self, licenses):
        """create a CSV report"""
        outfile = io.StringIO()
        writer = csv.DictWriter(
            outfile,
            fieldnames=["bundle", "library", "version", "licenseId", "licenseText"],
        )
        writer.writeheader()
        for bundle_name, bundle in licenses.items():
            for library, spec in bundle.get("licenses", {}).items():
                writer.writerow({"bundle": bundle_name, "library": library, **spec})
        return outfile.getvalue()

    def report_markdown(self, licenses, full_text=True):
        """create a markdown report"""
        lines = []
        longest_name = max(
            [
                len(library_name)
                for bundle_name, bundle in licenses.items()
                for library_name in bundle["licenses"]
            ]
        )
        for bundle_name, bundle in licenses.items():
            # TODO: parametrize template
            lines += [f"# {bundle_name}", ""]

            for library, spec in bundle.get("licenses", {}).items():
                lines += [
                    "- "
                    + (
                        "\t".join(
                            [
                                f"**{library.strip()}**".ljust(longest_name),
                                f"""`{spec["version"] or ""}`""".ljust(20),
                                (spec["licenseId"] or ""),
                            ]
                        )
                    )
                ]
                if full_text:
                    lines += [""]
                    if spec["licenseText"]:
                        lines += [
                            textwrap.indent(spec["licenseText"].strip(), " " * 6),
                            "",
                        ]
        return "\n".join(lines)

    def license_bundle(self, path, bundle, validate=None):
        """Return the content of a path's license bundle, or None if it doesn't exist"""
        licenses_path = path / THIRD_PARTY_LICENSES
        if not licenses_path.exists():
            self.log.warn(
                "Third-party licenses not found for %s: %s", bundle, licenses_path
            )
            return None

        try:
            bundle_text = licenses_path.read_text(encoding="utf-8")
        except Exception as err:
            self.log.warn(
                "Failed to open third-party licenses for %s: %s\n%s",
                bundle,
                licenses_path,
                err,
            )
            return None

        try:
            bundle_json = json.loads(bundle_text)
        except Exception as err:
            self.log.warn(
                "Failed to parse third-party licenses for %s: %s\n%s",
                bundle,
                licenses_path,
                err,
            )
            return None

        return bundle_json

    def app_static(self):
        """get the static directory for this app"""
        if self.parent.dev_mode:
            return Path(__file__).parent.parent.parent / "dev_mode/static"
        return Path(self.parent.app_dir) / "static"

    def licenses(self, bundles_pattern=".*") -> dict:
        """Read all of the licenses
        TODO: schema
        """
        licenses = {}

        if re.match(bundles_pattern, self.parent.app_name):
            licenses[self.parent.app_name] = self.license_bundle(
                self.app_static(), self.parent.app_name
            )

        for ext_name, ext_info in self.app_info["federated_extensions"].items():
            if re.match(bundles_pattern, ext_name):
                licenses[fed_ext] = ext_info["license_text"]

        return licenses


class LicensesHandler(APIHandler):
    """A handler for serving licenses used by the application"""

    def initialize(self, manager: LicensesManager):
        super(LicensesHandler, self).initialize()
        self.manager = manager

    @web.authenticated
    async def get(self):
        """Return all the frontend licenses as JSON"""
        report, mime = await self.manager.report_async(
            report_format=self.get_argument("format", "json"),
            bundles_pattern=self.get_argument("bundles", ".*"),
            full_text=bool(json.loads(self.get_argument("full_text", "true"))),
        )
        self.write(report)
        self.set_header("Content-Type", mime)
