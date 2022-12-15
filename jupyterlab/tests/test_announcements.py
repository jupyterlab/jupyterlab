# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import hashlib
import json
from unittest.mock import MagicMock, patch

import tornado

from . import Response, to_async_mock

FAKE_ATOM_FEED = b"""<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom" ><generator uri="https://jekyllrb.com/" version="3.9.2">Jekyll</generator><link href="https://jupyterlab.github.io/assets/feed.xml" rel="self" type="application/atom+xml" /><link href="https://jupyterlab.github.io/assets/" rel="alternate" type="text/html" /><updated>2022-11-02T15:14:50+00:00</updated><id>https://jupyterlab.github.io/assets/feed.xml</id><title type="html">JupyterLab News</title><subtitle>Subscribe to get news about JupyterLab.</subtitle><entry><title type="html">Thanks for using JupyterLab</title><link href="https://jupyterlab.github.io/assets/posts/2022/11/02/demo.html" rel="alternate" type="text/html" title="Thanks for using JupyterLab" /><published>2022-11-02T14:00:00+00:00</published><updated>2022-11-02T14:00:00+00:00</updated><id>https://jupyterlab.github.io/assets/posts/2022/11/02/demo</id><content type="html" xml:base="https://jupyterlab.github.io/assets/posts/2022/11/02/demo.html">&lt;h1 id=&quot;welcome&quot;&gt;Welcome&lt;/h1&gt;

&lt;p&gt;Thanks a lot for your interest in JupyterLab.&lt;/p&gt;</content><author><name></name></author><category term="posts" /><summary type="html">Big thanks to you, beloved JupyterLab user.</summary></entry></feed>"""

FAKE_JUPYTERLAB_PYPI_JSON = b"""{ "info": { "version": "1000.0.0" } }"""


@patch("tornado.httpclient.AsyncHTTPClient")
async def test_NewsHandler_get_success(mock_client, labserverapp, jp_fetch):

    mock_client.return_value = MagicMock(
        spec=tornado.httpclient.AsyncHTTPClient,
        fetch=to_async_mock(Response(FAKE_ATOM_FEED)),
    )

    response = await jp_fetch("lab", "api", "news", method="GET")

    assert response.code == 200
    payload = json.loads(response.body)
    assert payload["news"] == [
        {
            "createdAt": 1667397600000.0,
            "message": "Thanks for using JupyterLab\nBig thanks to you, beloved JupyterLab user.",
            "modifiedAt": 1667397600000.0,
            "type": "info",
            "link": [
                "Open full post",
                "https://jupyterlab.github.io/assets/posts/2022/11/02/demo.html",
            ],
            "options": {
                "data": {
                    "id": "https://jupyterlab.github.io/assets/posts/2022/11/02/demo",
                    "tags": ["news"],
                }
            },
        }
    ]


@patch("tornado.httpclient.AsyncHTTPClient")
async def test_NewsHandler_get_failure(mock_client, labserverapp, jp_fetch):

    mock_client.return_value = MagicMock(
        spec=tornado.httpclient.AsyncHTTPClient,
        # Empty feed stock
        fetch=to_async_mock(Response("")),
    )

    response = await jp_fetch("lab", "api", "news", method="GET")

    assert response.code == 200
    payload = json.loads(response.body)
    assert payload["news"] == []


@patch("tornado.httpclient.AsyncHTTPClient")
async def test_CheckForUpdateHandler_get_pypi_success(mock_client, labserverapp, jp_fetch):
    mock_client.return_value = MagicMock(
        spec=tornado.httpclient.AsyncHTTPClient,
        # Empty feed stock
        fetch=to_async_mock(Response(FAKE_JUPYTERLAB_PYPI_JSON)),
    )

    response = await jp_fetch("lab", "api", "update", method="GET")

    message = "A newer version (1000.0.0) of JupyterLab is available."
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload["notification"]["message"] == message
    assert payload["notification"]["link"] == [
        "Open changelog",
        "https://github.com/jupyterlab/jupyterlab/releases/tag/v1000.0.0",
    ]
    assert payload["notification"]["options"] == {
        "data": {"id": hashlib.sha1(message.encode()).hexdigest(), "tags": ["update"]}
    }


@patch("tornado.httpclient.AsyncHTTPClient")
async def test_CheckForUpdateHandler_get_failure(mock_client, labserverapp, jp_fetch):
    mock_client.return_value = MagicMock(
        spec=tornado.httpclient.AsyncHTTPClient,
        # Empty feed stock
        fetch=to_async_mock(Response("")),
    )

    response = await jp_fetch("lab", "api", "update", method="GET")

    assert response.code == 200
    payload = json.loads(response.body)
    assert payload["notification"] is None
