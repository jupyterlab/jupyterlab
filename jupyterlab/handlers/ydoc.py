import y_py as Y

from .yutils import message_yjs_update, write_var_uint


class YBaseDoc:

    _ydoc: Y.YDoc
    transaction: "Transaction"

    def __init__(self, handler):
        self._handler = handler
        self._ydoc = Y.YDoc()
        self._initialized = False
        self.transaction = Transaction(self)

    @property
    def ydoc(self):
        return self._ydoc

    @property
    def source(self):
        raise RuntimeError("Y document source generation not implemented")

    @source.setter
    def source(self, value):
        raise RuntimeError("Y document source initialization not implemented")


class Transaction:

    ydoc: YBaseDoc

    def __init__(self, ydoc: YBaseDoc):
        self.ydoc = ydoc

    def __enter__(self):
        if self.ydoc._initialized:
            self.state = Y.encode_state_vector(self.ydoc.ydoc)
        self.transaction_context = self.ydoc.ydoc.begin_transaction()
        self.transaction = self.transaction_context.__enter__()
        return self.transaction

    def __exit__(self, exc_type, exc_value, exc_tb):
        res = self.transaction_context.__exit__(exc_type, exc_value, exc_tb)
        del self.transaction_context
        del self.transaction
        if self.ydoc._initialized:
            update = Y.encode_state_as_update(self.ydoc.ydoc, self.state)
            msg = bytes([0, message_yjs_update] + write_var_uint(len(update)) + update)
            self.ydoc._handler.write_message(msg, binary=True)
        else:
            self.ydoc._initialized = True
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
            self._ysource.delete(t, 0, len(self._ysource))
            # initialize document
            self._ysource.push(t, value)


class YNotebook(YBaseDoc):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._ycells = self._ydoc.get_array("cells")
        self._ymeta = self._ydoc.get_map("meta")
        self._ystate = self._ydoc.get_map("state")

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
            self._ycells.delete(t, 0, len(self._ycells))
            for key in self._ymeta:
                self._ymeta.delete(t, key)
            for key in self._ystate:
                self._ystate.delete(t, key)
            # initialize document
            ycells = []
            for cell in value["cells"]:
                ycell = Y.YMap()
                ycell.set(t, "source", cell["source"])
                ycell.set(t, "metadata", cell["metadata"])
                ycell.set(t, "cell_type", cell["cell_type"])
                ycell.set(t, "id", cell["id"])
                ycells.append(ycell)
            self._ycells.push(t, ycells)
            for k, v in value["metadata"].items():
                self._ymeta.set(t, k, v)
            self._ystate.set(t, "dirty", False)
            self._ystate.set(t, "nbformat", value["nbformat"])
            self._ystate.set(t, "nbformatMinor", value["nbformat_minor"])
