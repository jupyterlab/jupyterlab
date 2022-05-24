import asyncio

from jupyter_ydoc import YNotebook
from websockets import connect  # type: ignore
from ypy_websocket import WebsocketProvider, YDoc


class MockDoc:
    def __init__(self, doc: YNotebook, timeout: float = 1.0):
        self.timeout = timeout
        self.doc = doc

    async def change(self):
        change = asyncio.Event()

        def callback(event):
            print(event)
            change.set()

        self.doc.observe(callback)
        return await asyncio.wait_for(change.wait(), timeout=self.timeout)


async def test_client():
    doc = YDoc()
    notebook = YNotebook(doc)
    websocket = await connect("ws://localhost:1234/::test_room")
    WebsocketProvider(doc, websocket)
    mock_doc = MockDoc(notebook)
    await mock_doc.change()


asyncio.run(test_client())
