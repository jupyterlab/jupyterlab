import y_py as Y

from .yutils import create_update_message


class YBaseDoc:

    _ydoc: Y.YDoc
    transaction: "Transaction"

    def __init__(self, room):
        self._room = room
        self._ydoc = Y.YDoc()
        self._ystate = self._ydoc.get_map("state")
        self.initialized = False
        self.transaction = Transaction(self)

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
            with self.transaction as t:
                self._ystate.set(t, "dirty", value)

    def observe(self, callback):
        raise RuntimeError("Y document observe not implemented")

    def unobserve(self, subscription_id):
        raise RuntimeError("Y document unobserve not implemented")


class Transaction:

    ydoc: YBaseDoc

    def __init__(self, ydoc: YBaseDoc):
        self.ydoc = ydoc

    def __enter__(self):
        if self.ydoc.initialized:
            self.state = Y.encode_state_vector(self.ydoc.ydoc)
        self.transaction_context = self.ydoc.ydoc.begin_transaction()
        self.transaction = self.transaction_context.__enter__()
        return self.transaction

    def __exit__(self, exc_type, exc_value, exc_tb):
        res = self.transaction_context.__exit__(exc_type, exc_value, exc_tb)
        if self.ydoc.initialized:
            update = Y.encode_state_as_update(self.ydoc.ydoc, self.state)
            message = create_update_message(update)
            for client in self.ydoc._room.clients:
                client.write_message(message, binary=True)
        return res


class YFile(YBaseDoc):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._ysource = self._ydoc.get_text("source")

    @property
    def source(self):
        return str(self._ysource)

    @source.setter
    def source(self, value):
        with self.transaction as t:
            # clear document
            source_len = len(self._ysource)
            if source_len:
                self._ysource.delete(t, 0, source_len)
            # initialize document
            self._ysource.push(t, value)

    def observe(self, callback):
        self.source_subscription_id = self._ysource.observe(callback)

    def unobserve(self):
        self._ysource.unobserve(self.source_subscription_id)


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
        for cell in cells:
            if "id" in cell and state["nbformat"] == 4 and state["nbformatMinor"] <= 4:
                # strip cell ids if we have notebook format 4.0-4.4
                del cell["id"]
            if "execution_count" in cell:
                execution_count = cell["execution_count"]
                if isinstance(execution_count, float):
                    cell["execution_count"] = int(execution_count)
            if "outputs" in cell:
                for output in cell["outputs"]:
                    if "execution_count" in output:
                        execution_count = output["execution_count"]
                        if isinstance(execution_count, float):
                            output["execution_count"] = int(execution_count)
        return dict(
            cells=cells,
            metadata=meta,
            nbformat=int(state["nbformat"]),
            nbformat_minor=int(state["nbformatMinor"]),
        )

    @source.setter
    def source(self, value):
        with self.transaction as t:
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
                ycell = Y.YMap({})
                if "id" in cell:
                    ycell.set(t, "id", cell["id"])

                ycell.set(t, "source", cell["source"])
                ycell.set(t, "metadata", cell["metadata"])
                ycell.set(t, "cell_type", cell["cell_type"])

                if cell["cell_type"] == "code":
                    ycell.set(t, "execution_count", 0)
                    ycell.set(t, "outputs", cell.get("outputs", []))

                ycells.append(ycell)

            self._ycells.push(t, ycells)

            for k, v in value["metadata"].items():
                self._ymeta.set(t, k, v)

            self._ystate.set(t, "nbformat", value["nbformat"])
            self._ystate.set(t, "nbformatMinor", value["nbformat_minor"])

    def observe(self, callback):
        self.cells_subscription_id = self._ycells.observe(callback)
        self.meta_subscription_id = self._ymeta.observe(callback)

    def unobserve(self):
        self._ycells.unobserve(self.cells_subscription_id)
        self._ymeta.unobserve(self.meta_subscription_id)
