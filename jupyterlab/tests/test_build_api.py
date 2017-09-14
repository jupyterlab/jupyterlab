"""Test the kernels service API."""
import threading
import time

from jupyterlab.tests.utils import LabTestBase, APITester
from notebook.tests.launchnotebook import assert_http_error


class BuildAPITester(APITester):
    """Wrapper for build REST API requests"""
    url = 'lab/api/build'

    def getStatus(self):
        return self._req('GET', '')

    def build(self):
        return self._req('POST', '')

    def clear(self):
        return self._req('DELETE', '')


class BuildAPITest(LabTestBase):
    """Test the build web service API"""

    def setUp(self):
        self.build_api = BuildAPITester(self.request)

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
            with assert_http_error(500):
                self.build_api.build()

        t1 = threading.Thread(target=build_thread)
        t1.start()

        while 1:
            resp = self.build_api.getStatus().json()
            if resp['status'] == 'building':
                break

        resp = self.build_api.clear()
        assert resp.status_code == 204
