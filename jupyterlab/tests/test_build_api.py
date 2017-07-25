"""Test the kernels service API."""
import threading
import time

from notebook.utils import url_path_join
from jupyterlab.tests.utils import LabTestBase
from notebook.tests.launchnotebook import assert_http_error


class BuildAPI(object):
    """Wrapper for build REST API requests"""

    def __init__(self, request):
        self.request = request

    def _req(self, verb, path, body=None):
        response = self.request(verb,
                url_path_join('lab/api/build', path), data=body)

        if 400 <= response.status_code < 600:
            try:
                response.reason = response.json()['message']
            except Exception:
                pass
        response.raise_for_status()

        return response

    def getStatus(self):
        return self._req('GET', '')

    def build(self):
        return self._req('POST', '')

    def clear(self):
        return self._req('DELETE', '')


class BuildAPITest(LabTestBase):
    """Test the build web service API"""

    def setUp(self):
        self.build_api = BuildAPI(self.request)

    def test_get_status(self):
        """Make sure there are no kernels running at the start"""
        resp = self.build_api.getStatus().json()
        assert 'status' in resp
        assert 'message' in resp

    def test_build(self):
        resp = self.build_api.build()
        assert resp.status_code == 200

    def test_clear(self):
        with assert_http_error(500):
            self.build_api.clear()

        def build_thread():
            self.build_api.build()

        t1 = threading.Thread(target=build_thread)
        t1.start()

        time.sleep(1)
        resp = self.build_api.clear()
        assert resp.status_code == 204
