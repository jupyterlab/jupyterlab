// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ISharedDoc,
  ISharedList,
  ISharedMap,
  ISharedType,
  SharedDoc,
  SharedList
} from '@jupyterlab/shared-models';

import { CellList, NotebookModel } from '../src';

describe('@jupyterlab/notebook', () => {
  describe('#CellList', () => {
    let sharedDoc: ISharedDoc;
    let sharedList: ISharedList<ISharedMap<ISharedType>>;
    let contentFactory: NotebookModel.ContentFactory;
    let cells: CellList;

    beforeEach(() => {
      sharedDoc = new SharedDoc();
      sharedList = sharedDoc.createList<ISharedMap<ISharedType>>('cells');
      sharedList.undoManager = SharedDoc.createUndoManager(
        (sharedList as SharedList<any>).underlyingModel,
        []
      );
      contentFactory = new NotebookModel.ContentFactory({ sharedDoc });
      cells = new CellList(contentFactory, sharedList);
    });

    afterEach(() => {
      sharedDoc.dispose();
      cells.dispose();
    });

    it('should not be able to undo|redo', () => {
      expect(cells.canUndo).toEqual(false);
      expect(cells.canRedo).toEqual(false);
    });

    it('should undo and redo the operation', () => {
      expect(cells.canUndo).toEqual(false);
      expect(cells.canRedo).toEqual(false);

      cells.push(contentFactory.createRawCell());
      expect(cells.length).toEqual(1);

      expect(cells.canUndo).toEqual(true);
      cells.undo();
      expect(cells.length).toEqual(0);
      expect(cells.canUndo).toEqual(false);

      expect(cells.canRedo).toEqual(true);
      cells.redo();
      expect(cells.length).toEqual(1);
    });

    it('should from a transaction undo and redo the operation', () => {
      cells.transact(() => {
        cells.push(contentFactory.createCodeCell());
        cells.push(contentFactory.createMarkdownCell());
        cells.push(contentFactory.createRawCell());
      });

      expect(cells.length).toEqual(3);

      expect(cells.canUndo).toEqual(true);
      cells.undo();
      expect(cells.length).toEqual(0);
      expect(cells.canUndo).toEqual(false);

      expect(cells.canRedo).toEqual(true);
      cells.redo();
      expect(cells.length).toEqual(3);
    });
  });
});
