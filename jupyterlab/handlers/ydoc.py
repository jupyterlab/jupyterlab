from typing import Dict, List, Union

import y_py as Y
from ypy_websocket.websocket_server import YDoc


class YBaseDoc:
    def __init__(self, ydoc: YDoc):
        self._ydoc = ydoc
        self._ystate = self._ydoc.get_map("state")
        self._subscriptions = {}

    @property
    def ystate(self):
        return self._ystate

    @property
    def ydoc(self):
        return self._ydoc

    @property
    def source(self):
        raise RuntimeError("Y document source generation not implemented")

    @source.setter
    def source(self, value):
        raise RuntimeError("Y document source initialization not implemented")

    @property
    def dirty(self) -> None:
        return self._ystate["dirty"]

    @dirty.setter
    def dirty(self, value: bool) -> None:
        if self.dirty != value:
            with self._ydoc.begin_transaction() as t:
                self._ystate.set(t, "dirty", value)

    def observe(self, callback):
        raise RuntimeError("Y document observe not implemented")

    def unobserve(self):
        for k, v in self._subscriptions.items():
            k.unobserve(v)
        self._subscriptions = {}


class YFile(YBaseDoc):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._ysource = self._ydoc.get_text("source")

    @property
    def source(self):
        return str(self._ysource)

    @source.setter
    def source(self, value):
        with self._ydoc.begin_transaction() as t:
            # clear document
            source_len = len(self._ysource)
            if source_len:
                self._ysource.delete(t, 0, source_len)
            # initialize document
            self._ysource.push(t, value)

    def observe(self, callback):
        self._subscriptions[self._ysource] = self._ysource.observe(callback)


class YNotebook(YBaseDoc):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._ycells = self._ydoc.get_array("cells")
        self._ymeta = self._ydoc.get_map("meta")

    @property
    def source(self):
        cells = self._ycells.to_json()
        meta = self._ymeta.to_json()
        state = self._ystate.to_json()
        cast_all(cells, float, int)
        cast_all(meta, float, int)
        for cell in cells:
            if "id" in cell and state["nbformat"] == 4 and state["nbformatMinor"] <= 4:
                # strip cell ids if we have notebook format 4.0-4.4
                del cell["id"]
        return dict(
            cells=cells,
            metadata=meta,
            nbformat=int(state["nbformat"]),
            nbformat_minor=int(state["nbformatMinor"]),
        )

    @source.setter
    def source(self, value):
        cast_all(value, int, float)
        with self._ydoc.begin_transaction() as t:
            # clear document
            cells_len = len(self._ycells)
            if cells_len:
                self._ycells.delete(t, 0, cells_len)
            for key in self._ymeta:
                self._ymeta.delete(t, key)
            for key in [k for k in self._ystate if k != "dirty"]:
                self._ystate.delete(t, key)

            # initialize document
            ycells = []
            for cell in value["cells"]:
                cell["source"] = Y.YText(cell["source"])
                if "outputs" in cell:
                    cell["outputs"] = Y.YArray(cell["outputs"])
                ycell = Y.YMap(cell)
                ycells.append(ycell)

            self._ycells.push(t, ycells)
            self._ymeta.set(t, "metadata", value["metadata"])
            self._ystate.set(t, "nbformat", value["nbformat"])
            self._ystate.set(t, "nbformatMinor", value["nbformat_minor"])

    def observe(self, callback):
        self.unobserve()
        for cell in self._ycells:
            self._subscriptions[cell["source"]] = cell["source"].observe(callback)
            if "outputs" in cell:
                self._subscriptions[cell["outputs"]] = cell["outputs"].observe(callback)
            self._subscriptions[cell] = cell.observe(callback)
        self._subscriptions[self._ycells] = self._ycells.observe(callback)
        self._subscriptions[self._ymeta] = self._ymeta.observe(callback)


def cast_all(o: Union[List, Dict], from_type, to_type) -> None:
    if isinstance(o, list):
        for i, v in enumerate(o):
            if isinstance(v, from_type):
                o[i] = to_type(v)
            elif isinstance(v, (list, dict)):
                cast_all(v, from_type, to_type)
    elif isinstance(o, dict):
        for k, v in o.items():
            if isinstance(v, from_type):
                o[k] = to_type(v)
            elif isinstance(v, (list, dict)):
                cast_all(v, from_type, to_type)
