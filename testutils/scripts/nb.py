import asyncio
import json
import sys
from pathlib import Path

from jupyter_ydoc import YNotebook
from websockets import connect  # type: ignore
from ypy_websocket import WebsocketProvider, YDoc

files_dir = Path(__file__).parent


async def test_YNotebook(url):
    if url is None:
        url = "ws://localhost:12345/test_room"

    ydoc = YDoc()
    ynotebook = YNotebook(ydoc)
    websocket = await connect(url)
    WebsocketProvider(ydoc, websocket)
    nb = json.loads((files_dir / "nb.json").read_text())
    ynotebook.source = nb
    print(nb)


url = port = None
if len(sys.argv) >= 2:
    url = sys.argv[1]

print(url)
asyncio.run(test_YNotebook(url))
