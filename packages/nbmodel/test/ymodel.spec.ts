// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { YNotebook } from '../src';

describe('@jupyterlab/nbmodel', () => {
  describe('ynotebook', () => {
    it('should create a notebook', () => {
      const notebook = YNotebook.createSharedNotebook();
      expect(notebook.cells.length).toBe(0);
    });
  });

  describe('ynotebook metadata', () => {
    it('should update metadata', () => {
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

  describe('ycell shared', () => {
    it('should insert a cell', () => {
      const notebook = YNotebook.createSharedNotebook();
      const codeCell = YNotebook.createSharedCodeCell();
      notebook.insertCell(0, codeCell);
      expect(notebook.cells.length).toBe(1);
    });
    it('should set cell source', () => {
      const notebook = YNotebook.createSharedNotebook();
      const codeCell = YNotebook.createSharedCodeCell();
      notebook.insertCell(0, codeCell);
      codeCell.setSource('test');
      expect(notebook.cells[0].getSource()).toBe('test');
    });
    it('should update source', () => {
      const notebook = YNotebook.createSharedNotebook();
      const codeCell = YNotebook.createSharedCodeCell();
      notebook.insertCell(0, codeCell);
      codeCell.setSource('test');
      codeCell.updateSource(0, 0, 'hello');
      expect(codeCell.getSource()).toBe('hellotest');
    });
  });

  describe('ycell standalone', () => {
    it('should not insert a standalone cell', () => {
      const notebook = YNotebook.createSharedNotebook();
      const codeCell = YNotebook.createStandaloneCodeCell();
      let failed = false;
      try {
        notebook.insertCell(0, codeCell);
      } catch (error) {
        failed = true;
      }
      expect(failed).toBe(true);
    });
    it('should set source', () => {
      const codeCell = YNotebook.createStandaloneCodeCell();
      codeCell.setSource('test');
      expect(codeCell.getSource()).toBe('test');
    });
    it('should update source', () => {
      const codeCell = YNotebook.createStandaloneCodeCell();
      codeCell.setSource('test');
      codeCell.updateSource(0, 0, 'hello');
      expect(codeCell.getSource()).toBe('hellotest');
    });
  });
});
