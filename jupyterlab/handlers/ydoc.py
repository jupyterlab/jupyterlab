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

    @source.setter
    def source(self, value):
        raise RuntimeError("Y document source initialization not implemented")


class YFile(YBaseDoc):
    def __init__(self):
        super().__init__()
        self._ysource = self._ydoc.get_text("source")

    @property
    def source(self):
        return str(self._ysource)

    @source.setter
    def source(self, value):
        with self._ydoc.begin_transaction() as t:
            self._ysource.push(t, value)


class YNotebook(YBaseDoc):
    def __init__(self):
        super().__init__()
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
        with self._ydoc.begin_transaction() as t:
            self._ycells.push(t, value["cells"])
            for k, v in value["metadata"].items():
                self._ymeta.set(t, k, v)
            self._ystate.set(t, "dirty", False)
            self._ystate.set(t, "nbformat", value["nbformat"])
            self._ystate.set(t, "nbformatMinor", value["nbformat_minor"])
