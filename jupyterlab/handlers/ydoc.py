import y_py as Y


class YBaseDoc:
    def __init__(self):
        self._ydoc = Y.YDoc()

    @property
    def ydoc(self):
        return self._ydoc

    @property
    def source(self):
        raise RuntimeError("Y document source generation not implemented")


class YFile(YBaseDoc):
    def __init__(self):
        super().__init__()
        self._ysource = self._ydoc.get_text("source")

    @property
    def source(self):
        with self._ydoc.begin_transaction() as t:
            return self._ysource.to_string(t)


class YNotebook(YBaseDoc):
    def __init__(self):
        super().__init__()
        self._ycells = self._ydoc.get_array("cells")
        self._ymeta = self._ydoc.get_map("meta")
        self._ystate = self._ydoc.get_map("state")

    @property
    def source(self):
        with self._ydoc.begin_transaction() as t:
            cells = self._ycells.to_json(t)
            meta = self._ymeta.to_json(t)
            state = self._ystate.to_json(t)
        for cell in cells:
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
            metadata=meta["metadata"],
            nbformat=int(state["nbformat"]),
            nbformat_minor=int(state["nbformatMinor"]),
        )
