/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  DocumentManager,
  IDocumentManagerDialogs,
  renameDialog,
  renameFile
} from '@jupyterlab/docmanager';
import {
  ABCWidgetFactory,
  DocumentRegistry,
  DocumentWidget,
  IDocumentWidget,
  TextModelFactory
} from '@jupyterlab/docregistry';
import { DocumentWidgetOpenerMock } from '@jupyterlab/docregistry/lib/testutils';
import { ServiceManager } from '@jupyterlab/services';
import { dismissDialog } from '@jupyterlab/testing';
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
      it('should throw error on no status', async () => {
        alreadyExistsError.response = {};
        await expect(
          Promise.all([
            dismissDialog(),
            renameFile(manager, 'foo.ipynb', 'bar.ipynb')
          ])
        ).rejects.toBe(alreadyExistsError);
      });
      it('should throw error on not 409 status', async () => {
        alreadyExistsError.response.status = 408;
        await expect(
          Promise.all([
            dismissDialog(),
            renameFile(manager, 'foo.ipynb', 'bar.ipynb')
          ])
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
