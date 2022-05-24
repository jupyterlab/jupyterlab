import asyncio
import sys
from pathlib import Path

from jupyter_ydoc import YFile
from websockets import connect  # type: ignore
from ypy_websocket import WebsocketProvider, YDoc

files_dir = Path(__file__).parent


async def test_YNotebook(url):
    if url is None:
        url = "ws://localhost:12345/test_room"

    ydoc = YDoc()
    yfile = YFile(ydoc)
    websocket = await connect(url)
    WebsocketProvider(ydoc, websocket)
    file = (files_dir / "file.txt").read_text()
    yfile.source = file
    print(file)


url = port = None
if len(sys.argv) >= 2:
    url = sys.argv[1]

asyncio.run(test_YNotebook(url))
