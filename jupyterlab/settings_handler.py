"""Tornado handlers for frontend config storage."""

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
import json
import os
from tornado import web

from notebook.base.handlers import APIHandler, json_errors

try:
    from jsonschema import ValidationError
    from jsonschema import Draft4Validator as Validator
except ImportError:
    Validator = None


class SettingsHandler(APIHandler):

    def initialize(self, schemas_dir, settings_dir):
        self.schemas_dir = schemas_dir
        self.settings_dir = settings_dir

    @json_errors
    @web.authenticated
    def get(self, section_name):
        self.set_header('Content-Type', "application/json")
        path = os.path.join(self.schemas_dir, section_name + ".json")

        if not os.path.exists(path):
            raise web.HTTPError(404, "Schema not found: %r" % section_name)
        with open(path) as fid:
            # Attempt to load the schema file.
            try:
                schema = json.load(fid)
            except Exception as e:
                name = section_name
                message = "Failed parsing schema ({}): {}".format(name, str(e))
                raise web.HTTPError(500, message)

        path = os.path.join(self.settings_dir, section_name + '.json')
        settings = dict()
        if os.path.exists(path):
            with open(path) as fid:
                # Attempt to load the settings file.
                try:
                    settings = json.load(fid)
                except Exception as e:
                    self.log.warn(str(e))

        # Validate the data against the schema.
        if Validator is not None and len(settings):
            validator = Validator(schema)
            try:
                validator.validate(settings)
            except ValidationError as e:
                self.log.warn(str(e))
                settings = dict()

        resp = dict(id=section_name, data=dict(user=settings), schema=schema)
        self.finish(json.dumps(resp))

    @json_errors
    @web.authenticated
    def patch(self, section_name):
        if not self.settings_dir:
            raise web.HTTPError(404, "No current settings directory")

        path = os.path.join(self.schemas_dir, section_name + '.json')

        if not os.path.exists(path):
            raise web.HTTPError(404, "Schema not found for: %r" % section_name)

        data = self.get_json_body()  # Will raise 400 if content is not valid JSON

        # Validate the data against the schema.
        if Validator is not None:
            with open(path) as fid:
                schema = json.load(fid)
            validator = Validator(schema)
            try:
                validator.validate(data)
            except ValidationError as e:
                raise web.HTTPError(400, str(e))

        # Create the settings dir as needed.
        if not os.path.exists(self.settings_dir):
            os.makedirs(self.settings_dir)

        path = os.path.join(self.settings_dir, section_name + '.json')

        with open(path, 'w') as fid:
            json.dump(data, fid)

        self.set_status(204)


# The path for a lab settings section.
settings_path = r"/lab/api/settings/(?P<section_name>[\w.-]+)"
