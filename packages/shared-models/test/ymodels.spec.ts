// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IListChange, IMapChange, YCodeCell, YNotebook } from '../src';

describe('@jupyterlab/shared-models', () => {
  describe('YNotebook', () => {
    describe('#constructor', () => {
      it('should create a notebook without arguments', () => {
        const notebook = YNotebook.create();
        expect(notebook.cells.length).toBe(0);
      });
    });

    describe('metadata', () => {
      it('should get metadata', () => {
        const notebook = YNotebook.create();
        const metadata = {
          orig_nbformat: 1,
          kernelspec: {
            display_name: 'python',
            name: 'python'
          }
        };

        notebook.setMetadata(metadata);

        expect(notebook.metadata).toEqual(metadata);
      });

      it('should get all metadata', () => {
        const notebook = YNotebook.create();
        const metadata = {
          orig_nbformat: 1,
          kernelspec: {
            display_name: 'python',
            name: 'python'
          }
        };

        notebook.setMetadata(metadata);

        expect(notebook.getMetadata()).toEqual(metadata);
      });

      it('should get one metadata', () => {
        const notebook = YNotebook.create();
        const metadata = {
          orig_nbformat: 1,
          kernelspec: {
            display_name: 'python',
            name: 'python'
          }
        };

        notebook.setMetadata(metadata);

        expect(notebook.getMetadata('orig_nbformat')).toEqual(1);
      });

      it('should set one metadata', () => {
        const notebook = YNotebook.create();
        const metadata = {
          orig_nbformat: 1,
          kernelspec: {
            display_name: 'python',
            name: 'python'
          }
        };

        notebook.setMetadata(metadata);
        notebook.setMetadata('test', 'banana');

        expect(notebook.getMetadata('test')).toEqual('banana');
      });

      it('should update metadata', () => {
        const notebook = YNotebook.create();
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

      it('should emit all metadata changes', () => {
        const notebook = YNotebook.create();
        const metadata = {
          orig_nbformat: 1,
          kernelspec: {
            display_name: 'python',
            name: 'python'
          }
        };

        const changes: IMapChange[] = [];
        notebook.metadataChanged.connect((_, c) => {
          changes.push(c);
        });
        notebook.metadata = metadata;

        expect(changes).toHaveLength(2);
        expect(changes).toEqual([
          {
            type: 'add',
            key: 'orig_nbformat',
            newValue: metadata.orig_nbformat,
            oldValue: undefined
          },
          {
            type: 'add',
            key: 'kernelspec',
            newValue: metadata.kernelspec,
            oldValue: undefined
          }
        ]);

        notebook.dispose();
      });

      it('should emit a add metadata change', () => {
        const notebook = YNotebook.create();
        const metadata = {
          orig_nbformat: 1,
          kernelspec: {
            display_name: 'python',
            name: 'python'
          }
        };
        notebook.metadata = metadata;

        const changes: IMapChange[] = [];
        notebook.metadataChanged.connect((_, c) => {
          changes.push(c);
        });
        notebook.setMetadata('test', 'banana');

        expect(changes).toHaveLength(1);
        expect(changes).toEqual([
          { type: 'add', key: 'test', newValue: 'banana', oldValue: undefined }
        ]);

        notebook.dispose();
      });

      it('should emit a delete metadata change', () => {
        const notebook = YNotebook.create();
        const metadata = {
          orig_nbformat: 1,
          kernelspec: {
            display_name: 'python',
            name: 'python'
          }
        };
        notebook.metadata = metadata;

        const changes: IMapChange[] = [];
        notebook.setMetadata('test', 'banana');

        notebook.metadataChanged.connect((_, c) => {
          changes.push(c);
        });
        notebook.deleteMetadata('test');

        expect(changes).toHaveLength(1);
        expect(changes).toEqual([
          {
            type: 'remove',
            key: 'test',
            newValue: undefined,
            oldValue: 'banana'
          }
        ]);

        notebook.dispose();
      });

      it('should emit an update metadata change', () => {
        const notebook = YNotebook.create();
        const metadata = {
          orig_nbformat: 1,
          kernelspec: {
            display_name: 'python',
            name: 'python'
          }
        };
        notebook.metadata = metadata;

        const changes: IMapChange[] = [];
        notebook.setMetadata('test', 'banana');

        notebook.metadataChanged.connect((_, c) => {
          changes.push(c);
        });
        notebook.setMetadata('test', 'orange');

        expect(changes).toHaveLength(1);
        expect(changes).toEqual([
          {
            type: 'change',
            key: 'test',
            newValue: 'orange',
            oldValue: 'banana'
          }
        ]);

        notebook.dispose();
      });
    });

    describe('#insertCell', () => {
      it('should insert a cell', () => {
        const notebook = YNotebook.create();
        notebook.insertCell(0, { cell_type: 'code' });
        expect(notebook.cells.length).toBe(1);
      });
      it('should set cell source', () => {
        const notebook = YNotebook.create();
        const codeCell = notebook.insertCell(0, { cell_type: 'code' });
        codeCell.setSource('test');
        expect(notebook.cells[0].getSource()).toBe('test');
      });
      it('should update source', () => {
        const notebook = YNotebook.create();
        const codeCell = notebook.insertCell(0, { cell_type: 'code' });
        codeCell.setSource('test');
        codeCell.updateSource(0, 0, 'hello');
        expect(codeCell.getSource()).toBe('hellotest');
      });

      it('should emit a add cells change', () => {
        const notebook = YNotebook.create();
        const changes: IListChange[] = [];
        notebook.cellsChanged.connect((_, c) => {
          changes.push(c);
        });
        const codeCell = notebook.insertCell(0, { cell_type: 'code' });

        expect(changes).toHaveLength(1);
        expect(changes).toEqual([
          {
            type: 'add',
            newIndex: 0,
            newValues: [codeCell],
            oldIndex: -2,
            oldValues: []
          }
        ]);
      });
    });

    describe('#deleteCell', () => {
      it('should emit a delete cells change', () => {
        const notebook = YNotebook.create();
        const changes: IListChange[] = [];
        const codeCell = notebook.insertCell(0, { cell_type: 'code' });

        notebook.cellsChanged.connect((_, c) => {
          changes.push(c);
        });
        notebook.deleteCell(0);

        expect(changes).toHaveLength(1);
        expect(codeCell.isDisposed).toEqual(true);
        expect(changes).toEqual([
          {
            type: 'remove',
            oldIndex: 0,
            oldValues: [codeCell],
            newIndex: -1,
            newValues: []
          }
        ]);
      });
    });

    describe('#moveCell', () => {
      it('should emit add and delete cells changes when moving a cell', () => {
        const notebook = YNotebook.create();
        const changes: IListChange[] = [];
        const codeCell = notebook.addCell({ cell_type: 'code' });
        notebook.addCell({ cell_type: 'markdown' });
        const raw = codeCell.toJSON();
        notebook.cellsChanged.connect((_, c) => {
          changes.push(c);
        });
        notebook.moveCell(0, 1);

        expect(notebook.getCell(1)).not.toEqual(codeCell);
        expect(notebook.getCell(1).toJSON()).toEqual(raw);
        expect(changes).toHaveLength(2);
        expect(changes).toEqual([
          {
            type: 'remove',
            oldIndex: 0,
            // The id is already gone as the cell is disposed
            oldValues: [codeCell],
            newIndex: -1,
            newValues: []
          },
          {
            type: 'add',
            newIndex: 1,
            newValues: [notebook.getCell(1)],
            oldIndex: -2,
            oldValues: []
          }
        ]);
      });
    });
  });

  describe('YCell standalone', () => {
    it('should set source', () => {
      const codeCell = YCodeCell.createStandalone();
      codeCell.setSource('test');
      expect(codeCell.getSource()).toBe('test');
    });

    it('should update source', () => {
      const codeCell = YCodeCell.createStandalone();
      codeCell.setSource('test');
      codeCell.updateSource(0, 0, 'hello');
      expect(codeCell.getSource()).toBe('hellotest');
    });

    it('should get metadata', () => {
      const cell = YCodeCell.createStandalone();
      const metadata = {
        collapsed: true,
        editable: false,
        name: 'cell-name'
      };

      cell.setMetadata(metadata);

      expect(cell.metadata).toEqual({
        ...metadata,
        jupyter: { outputs_hidden: true }
      });
    });

    it('should get all metadata', () => {
      const cell = YCodeCell.createStandalone();
      const metadata = {
        jupyter: { outputs_hidden: true },
        editable: false,
        name: 'cell-name'
      };

      cell.setMetadata(metadata);

      expect(cell.getMetadata()).toEqual({ ...metadata, collapsed: true });
    });

    it('should get one metadata', () => {
      const cell = YCodeCell.createStandalone();
      const metadata = {
        collapsed: true,
        editable: false,
        name: 'cell-name'
      };

      cell.setMetadata(metadata);

      expect(cell.getMetadata('editable')).toEqual(metadata.editable);
    });

    it('should set one metadata', () => {
      const cell = YCodeCell.createStandalone();
      const metadata = {
        collapsed: true,
        editable: false,
        name: 'cell-name'
      };

      cell.setMetadata(metadata);
      cell.setMetadata('test', 'banana');

      expect(cell.getMetadata('test')).toEqual('banana');
    });

    it('should emit all metadata changes', () => {
      const notebook = YNotebook.create();
      const metadata = {
        collapsed: true,
        editable: false,
        name: 'cell-name'
      };

      const changes: IMapChange[] = [];
      notebook.metadataChanged.connect((_, c) => {
        changes.push(c);
      });
      notebook.metadata = metadata;

      expect(changes).toHaveLength(3);
      expect(changes).toEqual([
        {
          type: 'add',
          key: 'collapsed',
          newValue: metadata.collapsed,
          oldValue: undefined
        },
        {
          type: 'add',
          key: 'editable',
          newValue: metadata.editable,
          oldValue: undefined
        },
        {
          type: 'add',
          key: 'name',
          newValue: metadata.name,
          oldValue: undefined
        }
      ]);

      notebook.dispose();
    });

    it('should emit a add metadata change', () => {
      const cell = YCodeCell.createStandalone();
      const metadata = {
        collapsed: true,
        editable: false,
        name: 'cell-name'
      };
      cell.metadata = metadata;

      const changes: IMapChange[] = [];
      cell.metadataChanged.connect((_, c) => {
        changes.push(c);
      });
      cell.setMetadata('test', 'banana');

      expect(changes).toHaveLength(1);
      expect(changes).toEqual([
        { type: 'add', key: 'test', newValue: 'banana', oldValue: undefined }
      ]);

      cell.dispose();
    });

    it('should emit a delete metadata change', () => {
      const cell = YCodeCell.createStandalone();
      const metadata = {
        collapsed: true,
        editable: false,
        name: 'cell-name'
      };
      cell.metadata = metadata;

      const changes: IMapChange[] = [];
      cell.setMetadata('test', 'banana');

      cell.metadataChanged.connect((_, c) => {
        changes.push(c);
      });
      cell.deleteMetadata('test');

      expect(changes).toHaveLength(1);
      expect(changes).toEqual([
        {
          type: 'remove',
          key: 'test',
          newValue: undefined,
          oldValue: 'banana'
        }
      ]);

      cell.dispose();
    });

    it('should emit an update metadata change', () => {
      const cell = YCodeCell.createStandalone();
      const metadata = {
        collapsed: true,
        editable: false,
        name: 'cell-name'
      };
      cell.metadata = metadata;

      const changes: IMapChange[] = [];
      cell.setMetadata('test', 'banana');

      cell.metadataChanged.connect((_, c) => {
        changes.push(c);
      });
      cell.setMetadata('test', 'orange');

      expect(changes).toHaveLength(1);
      expect(changes).toEqual([
        {
          type: 'change',
          key: 'test',
          newValue: 'orange',
          oldValue: 'banana'
        }
      ]);

      cell.dispose();
    });
  });
});
