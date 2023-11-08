# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import json
from unittest.mock import patch

from . import fake_client_factory

# test server starts up with custom-css flag
# should return an OK response for requests
# to the custom css file handler enpoint


@patch("tornado.httpclient.AsyncHTTPClient", new_callable=fake_client_factory)
async def test_CustomCssHandler(mock_client, labserverapp, jp_fetch):
    response = await jp_fetch("lab", "custom", "custom.css", method="GET")

    assert response.code == 200
    json.loads(response.body)
    # TODO: assert payload matches the custom CSS expected
