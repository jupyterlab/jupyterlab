// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { YNotebook, SharedCellFactory, createSharedNotebook } from '../src';

describe('@jupyterlab/nbmodel', () => {
  describe('ynotebook', () => {
    it('should create a notebook', () => {
      const notebook = createSharedNotebook();
      const codeCell = SharedCellFactory.createCodeCell();
      notebook.insertCell(0, codeCell);
      expect(notebook.cells.length).toBe(1);
    });
    it('should create a jupyter metadata', () => {
      const notebook = new YNotebook();
      const metadata = notebook.getMetadata();
      expect(metadata).toBeTruthy();
      metadata.orig_nbformat = 1;
      metadata.kernelspec = {
        display_name: 'python',
        name: 'python'
      };
      notebook.setMetadata(metadata);
      {
        const metadata = notebook.getMetadata();
        expect(metadata.kernelspec!.name).toBe('python');
        expect(metadata.orig_nbformat).toBe(1);
      }
      notebook.updateMetadata({
        orig_nbformat: 2
      });
      {
        const metadata = notebook.getMetadata();
        expect(metadata.kernelspec!.name).toBe('python');
        expect(metadata.orig_nbformat).toBe(2);
      }
    });
  });
});
