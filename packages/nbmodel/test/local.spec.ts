// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { LocalNotebook, LocalCodeCellJupyterMetadata } from './../src';

describe('@jupyterlab/nbmodel', () => {
  describe('local', () => {
    it('should create a notebook', () => {
      const notebook = new LocalNotebook();
      expect(notebook.cells).toBe(undefined);
      notebook.cells = [];
      expect(notebook.cells.length).toBe(0);
      expect(notebook.getCell(0)).toBe(undefined);
    });
    it('should create a jupyter metadata', () => {
      const jupyterMetadata = new LocalCodeCellJupyterMetadata();
      expect(jupyterMetadata.source_hidden).toBe(false);
    });
  });
});
