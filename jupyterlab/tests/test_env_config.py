# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

"""Tests for JUPYTER_NOTEBOOK_DIR and JUPYTER_NO_BROWSER environment variables."""

import logging
import os
import tempfile
from unittest import TestCase
from unittest.mock import patch

from jupyter_server.serverapp import ServerApp
from traitlets.config import Config

from jupyterlab.labapp import LabApp, _apply_env_overrides, _parse_bool_env


def _initialize_lab_server(argv=None, **kwargs):
    """Helper to initialize LabApp with background extensions like jupyter_lsp disabled."""
    args = ["--ServerApp.jpserver_extensions={'jupyter_lsp': False}"]
    if argv:
        args.extend(argv)
    return LabApp.initialize_server(argv=args, **kwargs)


class TestParseBoolEnv(TestCase):
    """Test boolean parsing of environment variables."""

    def test_truthy_values(self):
        truthy_inputs = [
            "1",
            "true",
            "True",
            "TRUE",
            "yes",
            "Yes",
            "YES",
            "t",
            "T",
            "y",
            "Y",
            "on",
            "On",
            "ON",
            " 1 ",
            " true ",
            "  YES  ",
        ]
        for val in truthy_inputs:
            with patch.dict(os.environ, {"TEST_BOOL_VAR": val}):
                self.assertIs(
                    _parse_bool_env("TEST_BOOL_VAR"),
                    True,
                    f"Expected True for {val!r}",
                )

    def test_falsy_values(self):
        falsy_inputs = [
            "0",
            "false",
            "False",
            "FALSE",
            "no",
            "No",
            "NO",
            "f",
            "F",
            "n",
            "N",
            "off",
            "Off",
            "OFF",
            " 0 ",
            " false ",
            "  NO  ",
        ]
        for val in falsy_inputs:
            with patch.dict(os.environ, {"TEST_BOOL_VAR": val}):
                self.assertIs(
                    _parse_bool_env("TEST_BOOL_VAR"),
                    False,
                    f"Expected False for {val!r}",
                )

    def test_unset_and_empty(self):
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("TEST_BOOL_VAR", None)
            self.assertIsNone(_parse_bool_env("TEST_BOOL_VAR"))

        for val in ["", "   ", "\t"]:
            with patch.dict(os.environ, {"TEST_BOOL_VAR": val}):
                self.assertIsNone(_parse_bool_env("TEST_BOOL_VAR"))

    def test_invalid_values(self):
        logger = logging.getLogger("test_logger")
        invalid_inputs = ["invalid", "2", "-1", "none", "null", "maybe", "disabled"]
        for val in invalid_inputs:
            with (
                patch.dict(os.environ, {"TEST_BOOL_VAR": val}),
                self.assertLogs(logger, level="WARNING") as cm,
            ):
                res = _parse_bool_env("TEST_BOOL_VAR", log=logger)
                self.assertIsNone(res)
                self.assertTrue(any("Unrecognized value" in log for log in cm.output))


class TestJupyterNotebookDir(TestCase):
    """Test JUPYTER_NOTEBOOK_DIR environment variable."""

    def test_notebook_dir_env_sets_root_dir(self):
        with (
            tempfile.TemporaryDirectory() as td_env,
            patch.dict(os.environ, {"JUPYTER_NOTEBOOK_DIR": td_env}),
        ):
            server = _initialize_lab_server()
            try:
                self.assertEqual(os.path.realpath(server.root_dir), os.path.realpath(td_env))
                self.assertEqual(
                    os.path.realpath(server.contents_manager.root_dir),
                    os.path.realpath(td_env),
                )
            finally:
                server.stop()

    def test_notebook_dir_env_overrides_config_file(self):
        with tempfile.TemporaryDirectory() as td_cfg, tempfile.TemporaryDirectory() as td_env:
            c = Config()
            c.ServerApp.root_dir = td_cfg
            with patch.dict(os.environ, {"JUPYTER_NOTEBOOK_DIR": td_env}):
                server = ServerApp(config=c)
                lab = LabApp()
                lab._link_jupyter_server_extension(server)
                server.init_configurables()
                try:
                    self.assertEqual(os.path.realpath(server.root_dir), os.path.realpath(td_env))
                    self.assertEqual(
                        os.path.realpath(server.contents_manager.root_dir),
                        os.path.realpath(td_env),
                    )
                finally:
                    server.stop()

    def test_cli_flag_overrides_notebook_dir_env(self):
        with (
            tempfile.TemporaryDirectory() as td_cli,
            tempfile.TemporaryDirectory() as td_env,
            patch.dict(os.environ, {"JUPYTER_NOTEBOOK_DIR": td_env}),
        ):
            server = _initialize_lab_server(argv=[f"--notebook-dir={td_cli}"])
            try:
                self.assertEqual(os.path.realpath(server.root_dir), os.path.realpath(td_cli))
                self.assertEqual(
                    os.path.realpath(server.contents_manager.root_dir),
                    os.path.realpath(td_cli),
                )
            finally:
                server.stop()

    def test_cli_serverapp_root_dir_overrides_notebook_dir_env(self):
        with (
            tempfile.TemporaryDirectory() as td_cli,
            tempfile.TemporaryDirectory() as td_env,
            patch.dict(os.environ, {"JUPYTER_NOTEBOOK_DIR": td_env}),
        ):
            server = _initialize_lab_server(argv=[f"--ServerApp.root_dir={td_cli}"])
            try:
                self.assertEqual(os.path.realpath(server.root_dir), os.path.realpath(td_cli))
                self.assertEqual(
                    os.path.realpath(server.contents_manager.root_dir),
                    os.path.realpath(td_cli),
                )
            finally:
                server.stop()

    def test_notebook_dir_tilde_expansion(self):
        home_dir = os.path.expanduser("~")
        with patch.dict(os.environ, {"JUPYTER_NOTEBOOK_DIR": "~"}):
            server = _initialize_lab_server()
            try:
                self.assertEqual(os.path.realpath(server.root_dir), os.path.realpath(home_dir))
            finally:
                server.stop()

    def test_empty_notebook_dir_ignored(self):
        with patch.dict(os.environ, {"JUPYTER_NOTEBOOK_DIR": "   "}):
            server = ServerApp()
            initial_root = server.root_dir
            _apply_env_overrides(server)
            try:
                self.assertEqual(server.root_dir, initial_root)
            finally:
                server.stop()


class TestJupyterNoBrowser(TestCase):
    """Test JUPYTER_NO_BROWSER environment variable."""

    def test_no_browser_env_truthy(self):
        with patch.dict(os.environ, {"JUPYTER_NO_BROWSER": "1"}):
            server = _initialize_lab_server()
            try:
                self.assertFalse(server.open_browser)
            finally:
                server.stop()

    def test_no_browser_env_falsy(self):
        with patch.dict(os.environ, {"JUPYTER_NO_BROWSER": "0"}):
            server = _initialize_lab_server()
            try:
                self.assertTrue(server.open_browser)
            finally:
                server.stop()

    def test_no_browser_env_overrides_config_file(self):
        c = Config()
        c.ServerApp.open_browser = True
        with patch.dict(os.environ, {"JUPYTER_NO_BROWSER": "true"}):
            server = ServerApp(config=c)
            lab = LabApp()
            lab._link_jupyter_server_extension(server)
            try:
                self.assertFalse(server.open_browser)
                self.assertFalse(lab.open_browser)
            finally:
                server.stop()

    def test_cli_no_browser_overrides_env_falsy(self):
        with patch.dict(os.environ, {"JUPYTER_NO_BROWSER": "false"}):
            server = _initialize_lab_server(argv=["--no-browser"])
            try:
                self.assertFalse(server.open_browser)
            finally:
                server.stop()

    def test_cli_open_browser_true_overrides_env_truthy(self):
        with patch.dict(os.environ, {"JUPYTER_NO_BROWSER": "true"}):
            server = _initialize_lab_server(argv=["--ServerApp.open_browser=True"])
            try:
                self.assertTrue(server.open_browser)
            finally:
                server.stop()

    def test_invalid_no_browser_env_ignored(self):
        server = ServerApp()
        server.open_browser = True
        with patch.dict(os.environ, {"JUPYTER_NO_BROWSER": "invalid"}):
            _apply_env_overrides(server)
            try:
                self.assertTrue(server.open_browser)
            finally:
                server.stop()

    def test_extension_link_applies_overrides(self):
        with (
            tempfile.TemporaryDirectory() as td_env,
            patch.dict(
                os.environ,
                {"JUPYTER_NOTEBOOK_DIR": td_env, "JUPYTER_NO_BROWSER": "yes"},
            ),
        ):
            server = ServerApp()
            lab = LabApp()
            lab._link_jupyter_server_extension(server)
            server.init_configurables()
            try:
                self.assertEqual(os.path.realpath(server.root_dir), os.path.realpath(td_env))
                self.assertFalse(server.open_browser)
                self.assertFalse(lab.open_browser)
            finally:
                server.stop()
