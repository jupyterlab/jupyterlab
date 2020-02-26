"""Test the kernels service API."""
from tempfile import TemporaryDirectory
import threading

import pytest
import json
import tornado

import urllib.parse

from tornado.escape import url_escape

from jupyterlab.labapp import LabApp
from jupyterlab_server.tests.utils import expected_http_error
from jupyter_server.utils import url_path_join


class BuildAPITester():
    """Wrapper for build REST API requests"""
    url = 'lab/api/build'

    def __init__(self, labapp, fetch):
        self.fetch = fetch
        self.labapp = labapp

    async def _req(self, verb, path, body=None):
        return await self.fetch(self.url + path,
            method=verb,
            body=body
            )

    async def getStatus(self):
        return await self._req('GET', '')

    async def build(self):
        return await self._req('POST', '', json.dumps({}))

    async def clear(self):
        return await self._req('DELETE', '')


@pytest.fixture
def labapp(serverapp, make_lab_extension_app):
    app = make_lab_extension_app()
    app.initialize(serverapp)
    return app


@pytest.fixture
def build_api_tester(serverapp, labapp, fetch_long):
    return BuildAPITester(labapp, fetch_long)


@pytest.fixture
def fetch_long(http_server_client, auth_header, base_url):
    """fetch fixture that handles auth, base_url, and path"""
    def client_fetch(*parts, headers={}, params={}, **kwargs):
        # Handle URL strings
        path_url = url_escape(url_path_join(base_url, *parts), plus=False)
        params_url = urllib.parse.urlencode(params)
        url = path_url + "?" + params_url
        # Add auth keys to header
        headers.update(auth_header)
        # Make request.
        return http_server_client.fetch(
            url, headers=headers, request_timeout=30, **kwargs
        )
    return client_fetch


@pytest.mark.slow
class TestBuildAPI:

    def tempdir(self):
        td = TemporaryDirectory()
        self.tempdirs.append(td)
        return td.name

    def setUp(self):
        # Any TemporaryDirectory objects appended to this list will be cleaned
        # up at the end of the test run.
        self.tempdirs = []

        # TODO(@echarles) Move the cleanup in the fixture.
        @self.addCleanup
        def cleanup_tempdirs():
            for d in self.tempdirs:
                d.cleanup()

#    @pytest.mark.timeout(timeout=30)
#    @pytest.mark.gen_test(timeout=30)
    async def test_get_status(self, build_api_tester):
        """Make sure there are no kernels running at the start"""
        r = await build_api_tester.getStatus()
        res = r.body.decode()
        resp = json.loads(res)
        assert 'status' in resp
        assert 'message' in resp

#    @pytest.mark.gen_test(timeout=30)
    async def test_build(self, build_api_tester):
        r = await build_api_tester.build()
        assert r.code == 200

#    @pytest.mark.gen_test(timeout=30)
    async def test_clear(self, build_api_tester):
        with pytest.raises(tornado.httpclient.HTTPClientError) as e:
            r = await build_api_tester.clear()
            res = r.body.decode()
        assert expected_http_error(e, 500)

        async def build_thread():
            with pytest.raises(tornado.httpclient.HTTPClientError) as e:
                r = await build_api_tester.build()
                res = r.body.decode()
            assert expected_http_error(e, 500)

        t1 = threading.Thread(target=build_thread)
        t1.start()
        """
        TODO(@echarles) FIX ME
        while 1:
            r = await build_api_tester.getStatus()
            res = r.body.decode()
            resp = json.loads(res)
            if resp['status'] == 'building':
                break

        r = await build_api_tester.clear()
        res = r.body.decode()
        resp = json.loads(res)
        assert resp.code == 204
        """
    