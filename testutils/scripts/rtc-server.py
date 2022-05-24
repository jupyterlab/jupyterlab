import asyncio
import sys

from websockets import serve  # type: ignore
from ypy_websocket import WebsocketServer


async def server(url, port):
    if url is None:
        url = "localhost"
    if port is None:
        port = 12345

    websocket_server = WebsocketServer()
    async with serve(websocket_server.serve, url, port):
        await asyncio.Future()  # run forever


url = port = None
if len(sys.argv) >= 2:
    url = sys.argv[1]
if len(sys.argv) >= 3:
    port = sys.argv[2]

asyncio.run(server(url, port))
