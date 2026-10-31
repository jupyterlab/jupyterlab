/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { Time } from '@jupyterlab/coreutils';
import type { IDocumentManagerDialogs } from '@jupyterlab/docmanager';
import {
  DocumentManager,
  DocumentManagerDialogs,
  renameDialog,
  renameFile
} from '@jupyterlab/docmanager';
import type { IDocumentWidget } from '@jupyterlab/docregistry';
import {
  ABCWidgetFactory,
  DocumentRegistry,
  DocumentWidget,
  TextModelFactory
} from '@jupyterlab/docregistry';
import { DocumentWidgetOpenerMock } from '@jupyterlab/docregistry/lib/testutils';
import type { Contents, ServiceManager } from '@jupyterlab/services';
import {
  acceptDialog,
  dismissDialog,
  waitForDialog
} from '@jupyterlab/testing';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import { Widget } from '@lumino/widgets';
import { UUID } from '@lumino/coreutils';

describe('docregistry/dialog', () => {
  let manager: DocumentManager;
  let services: ServiceManager.IManager;
  let alreadyExistsError: any = {};

  beforeAll(() => {
    const registry = new DocumentRegistry({});
    services = new ServiceManagerMock();
    const opener = new DocumentWidgetOpenerMock();
    manager = new DocumentManager({
      registry,
      manager: services,
      opener
    });
  });

  beforeEach(() => {
    alreadyExistsError = {
      name: 'file already exists',
      message: 'File already exists: bar.ipynb',
      response: {
        status: 409
      }
    };
    const spyRename = jest.spyOn(manager, 'rename');
    spyRename.mockRejectedValue(alreadyExistsError);
  });

  describe('@jupyterlab/docmanager', () => {
    describe('#renameFile()', () => {
      it('should show overwrite dialog when file is already existing', async () => {
        alreadyExistsError.response.status = 409;
        await expect(
          Promise.all([
            dismissDialog(),
            renameFile(manager, 'foo.ipynb', 'bar.ipynb')
          ])
        ).rejects.toBe('File not renamed');
      });
      it('should show one overwrite dialog at a time', async () => {
        const renames = [
          renameFile(manager, 'foo.ipynb', 'bar.ipynb'),
          renameFile(manager, 'baz.ipynb', 'qux.ipynb')
        ].map(rename => rename.catch((reason: unknown) => reason));
        await waitForDialog();
        expect(document.querySelectorAll('.jp-Dialog')).toHaveLength(1);
        await dismissDialog();
        await waitForDialog();
        expect(document.querySelectorAll('.jp-Dialog')).toHaveLength(1);
        await dismissDialog();

        expect(await Promise.all(renames)).toEqual([
          'File not renamed',
          'File not renamed'
        ]);
      });
      it('should throw error on no status', async () => {
        alreadyExistsError.response = {};
        await expect(
          renameFile(manager, 'foo.ipynb', 'bar.ipynb')
        ).rejects.toBe(alreadyExistsError);
      });
      it('should throw error on not 409 status', async () => {
        alreadyExistsError.response.status = 408;
        await expect(
          renameFile(manager, 'foo.ipynb', 'bar.ipynb')
        ).rejects.toBe(alreadyExistsError);
      });
    });
  });
});

/**
 * A minimal docmanager dialog for test
 */
class MinimalCustomDialogs implements IDocumentManagerDialogs {
  renameCalled = false;
  confirmCloseCalled = false;
  saveBeforeCloseCalled = false;

  async rename(context: DocumentRegistry.Context): Promise<void | null> {
    this.renameCalled = true;
    return null;
  }

  async confirmClose(
    args: IDocumentManagerDialogs.ConfirmClose.IOptions
  ): Promise<IDocumentManagerDialogs.ConfirmClose.IResult> {
    this.confirmCloseCalled = true;
    return { shouldClose: false, ignoreSave: true, doNotAskAgain: true };
  }

  async saveBeforeClose(
    args: IDocumentManagerDialogs.SaveBeforeClose.IOptions
  ): Promise<IDocumentManagerDialogs.SaveBeforeClose.IResult> {
    this.saveBeforeCloseCalled = true;
    return { shouldClose: false, ignoreSave: true };
  }
}

class WidgetFactory extends ABCWidgetFactory<IDocumentWidget> {
  protected createNewWidget(
    context: DocumentRegistry.Context
  ): IDocumentWidget {
    const content = new Widget();
    const widget = new DocumentWidget({ content, context });
    widget.addClass('WidgetFactory');
    return widget;
  }
}

describe('docmanager/custom-dialogs', () => {
  let manager: DocumentManager;
  let customDialogs: MinimalCustomDialogs;
  let services: ServiceManager.IManager;

  beforeEach(() => {
    const registry = new DocumentRegistry({
      textModelFactory: new TextModelFactory()
    });
    const factory = new WidgetFactory({
      name: 'bar',
      fileTypes: ['*'],
      defaultFor: ['*']
    });
    registry.addWidgetFactory(factory);

    services = new ServiceManagerMock();
    const opener = new DocumentWidgetOpenerMock();
    customDialogs = new MinimalCustomDialogs();

    manager = new DocumentManager({
      registry,
      manager: services,
      opener,
      docManagerDialogs: customDialogs
    });
  });

  it('should use custom rename dialog', async () => {
    const path = UUID.uuid4() + '.txt';
    await services.contents.save(path, {
      type: 'file',
      format: 'text',
      content: 'test content'
    });

    const widget = manager.open(path);
    const context = manager.contextForWidget(widget!)!;

    await renameDialog(manager, context!, undefined, customDialogs);

    expect(customDialogs.renameCalled).toBe(true);
  });

  it('should use custom confirmClose and saveBeforeClose dialogs when closing dirty file', async () => {
    const path = UUID.uuid4() + '.txt';
    await services.contents.save(path, {
      type: 'file',
      format: 'text',
      content: 'test content'
    });
    manager.confirmClosingDocument = true;

    const widget = manager.open(path);
    const context = manager.contextForWidget(widget!)!;
    context.model.dirty = true;

    await manager.closeFile(path);

    expect(customDialogs.confirmCloseCalled).toBe(true);

    context.model.dirty = true;

    // Since custom confirmClose returned doNotAskAgain: true, saveBeforeClose will now be triggered
    await manager.closeFile(path);

    expect(customDialogs.saveBeforeCloseCalled).toBe(true);
  });
});

describe('docmanager/default-dialogs', () => {
  const dialogs = new DocumentManagerDialogs();
  const checkpoints: Contents.ICheckpointModel[] = [
    { id: 'newer', last_modified: '2025-10-16T12:00:00.000Z' },
    { id: 'older', last_modified: '2025-10-15T12:00:00.000Z' }
  ];

  const dialogBody = () => document.querySelector('.jp-Dialog-body')!;

  describe('#reload()', () => {
    it('should reload when accepted', async () => {
      const result = dialogs.reload({ type: 'Notebook' });
      await waitForDialog();
      expect(dialogBody().textContent).toBe(
        'Are you sure you want to reload the Notebook from the disk?'
      );
      await acceptDialog();
      expect(await result).toEqual({ shouldReload: true });
    });

    it('should not reload when dismissed', async () => {
      const result = dialogs.reload({ type: 'Notebook' });
      await dismissDialog();
      expect(await result).toEqual({ shouldReload: false });
    });
  });

  describe('#delete()', () => {
    it('should delete when accepted', async () => {
      const result = dialogs.delete({ path: 'folder/data.csv' });
      await waitForDialog();
      expect(dialogBody().textContent).toBe(
        'Are you sure you want to delete folder/data.csv'
      );
      await acceptDialog();
      expect(await result).toEqual({ shouldDelete: true });
    });

    it('should not delete when dismissed', async () => {
      const result = dialogs.delete({ path: 'folder/data.csv' });
      await dismissDialog();
      expect(await result).toEqual({ shouldDelete: false });
    });
  });

  describe('#chooseCheckpoint()', () => {
    it('should return the selected checkpoint', async () => {
      const result = dialogs.chooseCheckpoint({
        checkpoints,
        fileType: 'Notebook'
      });
      await waitForDialog();
      const select =
        document.querySelector<HTMLSelectElement>('.jp-Dialog select')!;
      const date = checkpoints[1].last_modified;
      expect(select.options[1].textContent).toBe(
        `1. ${Time.format(date)} (${Time.formatHuman(date)})`
      );
      select.value = select.options[1].value;
      await acceptDialog();
      expect((await result).checkpoint).toBe(checkpoints[1]);
    });

    it('should return no checkpoint when dismissed', async () => {
      const result = dialogs.chooseCheckpoint({
        checkpoints,
        fileType: 'Notebook'
      });
      await dismissDialog();
      expect((await result).checkpoint).toBeUndefined();
    });
  });

  describe('#revert()', () => {
    it('should revert when accepted', async () => {
      const result = dialogs.revert({
        checkpoint: checkpoints[0],
        fileType: 'Notebook'
      });
      await waitForDialog();
      expect(dialogBody().textContent).toContain(
        'Are you sure you want to revert the Notebook to checkpoint? This cannot be undone.'
      );
      expect(dialogBody().textContent).toContain(
        Time.format(checkpoints[0].last_modified)
      );
      await acceptDialog();
      expect(await result).toEqual({ shouldRevert: true });
    });

    it('should not revert when dismissed', async () => {
      const result = dialogs.revert({
        checkpoint: checkpoints[0],
        fileType: 'Notebook'
      });
      await dismissDialog();
      expect(await result).toEqual({ shouldRevert: false });
    });
  });

  describe('#renameOnSave()', () => {
    it('should return the new name and the checkbox state', async () => {
      const result = dialogs.renameOnSave({ name: 'untitled.txt' });
      await waitForDialog();
      const input = dialogBody().querySelector('input')!;
      expect(input.value).toBe('untitled.txt');
      input.value = 'notes.txt';
      document.querySelector<HTMLInputElement>(
        '.jp-Dialog-checkbox input'
      )!.checked = true;
      await acceptDialog();
      expect(await result).toEqual({
        accepted: true,
        newName: 'notes.txt',
        doNotAskAgain: true
      });
    });

    it('should not rename when dismissed', async () => {
      const result = dialogs.renameOnSave({ name: 'untitled.txt' });
      await dismissDialog();
      expect((await result).accepted).toBe(false);
    });
  });
});
