"""Tornado handlers for frontend config storage."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import json
import os
from tornado import web

from notebook.base.handlers import APIHandler, json_errors


class SettingsHandler(APIHandler):

    def initialize(self, schemas_path, settings_path):
        self.schemas_path = schemas_path
        self.settings_path = settings_path

    @json_errors
    @web.authenticated
    def get(self, section_name):
        self.set_header("Content-Type", 'application/json')
        path = os.path.join(self.schemas_path, section_name + '.json')

        if not os.path.exists(path):
            raise web.HTTPError(404, "Schema not found: %r" % section_name)
        with open(path) as fid:
            schema = json.load(fid)

        path = os.path.join(self.settings_path, section_name + '.json')
        settings = dict()
        if os.path.exists(path):
            with open(path) as fid:
                settings = json.load(fid)

        self.finish(json.dumps(dict(schema=schema, settings=settings)))

    @json_errors
    @web.authenticated
    def put(self, section_name):
        data = self.get_json_body()  # Will raise 400 if content is not valid JSON
        print(section_name, data)
        # TODO: set the appropriate settings for the section name.
        self.set_status(204)


# The path for a labsettings section.
settings_path = r"/labsettings/(?P<section_name>[\w.-]+)"
