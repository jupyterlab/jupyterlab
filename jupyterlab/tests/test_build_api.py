"""Test the kernels service API."""
from tempfile import TemporaryDirectory
import threading

import asyncio
import os
import pytest
import json
import tornado

from jupyterlab_server.tests.utils import expected_http_error


@pytest.fixture
def build_api_tester(jp_serverapp, labapp, fetch_long):
    return BuildAPITester(labapp, fetch_long)


class BuildAPITester():
    """Wrapper for build REST API requests"""
    url = 'lab/api/build'

    def __init__(self, labapp, fetch_long):
        self.labapp = labapp
        self.fetch = fetch_long

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
    # FIXME
    @pytest.mark.skipif(os.name == 'nt',
                    reason="Currently failing on windows")
    async def test_build(self, build_api_tester):
        r = await build_api_tester.build()
        assert r.code == 200

#    @pytest.mark.gen_test(timeout=30)
    # FIXME
    @pytest.mark.skipif(os.name == 'nt',
                    reason="Currently failing on windows")
    async def test_clear(self, build_api_tester):
        with pytest.raises(tornado.httpclient.HTTPClientError) as e:
            r = await build_api_tester.clear()
            res = r.body.decode()
        assert expected_http_error(e, 500)

        loop = asyncio.get_event_loop()
        asyncio.ensure_future(build_api_tester.build(), loop=loop)

        while True:
            r = await build_api_tester.getStatus()
            res = r.body.decode()
            print(res)
            resp = json.loads(res)
            if resp['status'] == 'building':
                break

        r = await build_api_tester.clear()
        assert r.code == 204
