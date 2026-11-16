// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ILabShell, JupyterFrontEnd } from '@jupyterlab/application';
import type { IDocumentManagerDialogs } from '@jupyterlab/docmanager';
import { DocumentManager } from '@jupyterlab/docmanager';
import plugins from '@jupyterlab/docmanager-extension';
import type { IDocumentWidget } from '@jupyterlab/docregistry';
import {
  ABCWidgetFactory,
  DocumentRegistry,
  DocumentWidget,
  TextModelFactory
} from '@jupyterlab/docregistry';
import { DocumentWidgetOpenerMock } from '@jupyterlab/docregistry/lib/testutils';
import type { Contents } from '@jupyterlab/services';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import type { ISettingRegistry } from '@jupyterlab/settingregistry';
import { dismissDialog, waitForDialog } from '@jupyterlab/testing';
import { nullTranslator } from '@jupyterlab/translation';
import { CommandRegistry } from '@lumino/commands';
import { UUID } from '@lumino/coreutils';
import { Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';

class WidgetFactory extends ABCWidgetFactory<IDocumentWidget> {
  protected createNewWidget(
    context: DocumentRegistry.Context
  ): IDocumentWidget {
    return new DocumentWidget({ content: new Widget(), context });
  }
}

/**
 * Custom dialogs with only the methods that are not optional.
 */
const requiredDialogs: IDocumentManagerDialogs = {
  rename: async () => null,
  confirmClose: async () => ({
    shouldClose: true,
    ignoreSave: true,
    doNotAskAgain: false
  }),
  saveBeforeClose: async () => ({ shouldClose: true, ignoreSave: true })
};

describe('@jupyterlab/docmanager-extension:plugin', () => {
  const plugin = plugins.find(
    plugin => plugin.id === '@jupyterlab/docmanager-extension:plugin'
  )!;

  let commands: CommandRegistry;
  let docManager: DocumentManager;
  let path: string;
  let widget: IDocumentWidget;
  let context: DocumentRegistry.Context;

  const activate = (dialogs: IDocumentManagerDialogs) => {
    const shell = {
      currentWidget: widget,
      currentChanged: new Signal<unknown, unknown>({})
    };
    const app = {
      commands,
      shell,
      docRegistry: docManager.registry,
      // Never restored, so the plugin does not load its settings.
      restored: new Promise(() => undefined),
      contextMenuHitTest: () => undefined
    } as unknown as JupyterFrontEnd;
    const settingRegistry = {
      load: () => new Promise(() => undefined),
      transform: jest.fn()
    } as unknown as ISettingRegistry;
    void plugin.activate(
      app,
      docManager,
      new DocumentWidgetOpenerMock(),
      settingRegistry,
      nullTranslator,
      null,
      shell as unknown as ILabShell,
      dialogs
    );
  };

  beforeEach(async () => {
    const registry = new DocumentRegistry({
      textModelFactory: new TextModelFactory()
    });
    registry.addWidgetFactory(
      new WidgetFactory({ name: 'test', fileTypes: ['*'], defaultFor: ['*'] })
    );
    const services = new ServiceManagerMock();
    docManager = new DocumentManager({
      registry,
      manager: services,
      opener: new DocumentWidgetOpenerMock()
    });
    path = UUID.uuid4() + '.txt';
    await services.contents.save(path, {
      type: 'file',
      format: 'text',
      content: 'text'
    });
    widget = docManager.open(path)!;
    context = docManager.contextForWidget(widget)!;
    await context.ready;
    commands = new CommandRegistry();
  });

  afterEach(() => {
    // Close the document without asking to save it.
    context.model.dirty = false;
    docManager.dispose();
  });

  it('should use the custom reload dialog', async () => {
    const reload = jest.fn().mockResolvedValue({ shouldReload: true });
    activate({ ...requiredDialogs, reload });
    const revert = jest.spyOn(context, 'revert').mockResolvedValue();
    context.model.dirty = true;

    await commands.execute('docmanager:reload');

    expect(reload).toHaveBeenCalledWith({ type: 'Text' });
    expect(revert).toHaveBeenCalled();
  });

  it('should show the default dialog for a method the custom dialogs do not implement', async () => {
    activate(requiredDialogs);
    const revert = jest.spyOn(context, 'revert').mockResolvedValue();
    context.model.dirty = true;

    const reloading = commands.execute('docmanager:reload');
    await waitForDialog();
    expect(document.querySelector('.jp-Dialog-body')!.textContent).toBe(
      'Are you sure you want to reload the Text from the disk?'
    );
    await dismissDialog();
    await reloading;

    expect(revert).not.toHaveBeenCalled();
  });

  it('should use the custom dialogs to revert to a checkpoint', async () => {
    const checkpoints: Contents.ICheckpointModel[] = [
      { id: 'older', last_modified: '2025-10-15T12:00:00.000Z' },
      { id: 'newer', last_modified: '2025-10-16T12:00:00.000Z' }
    ];
    const chooseCheckpoint = jest
      .fn()
      .mockResolvedValue({ checkpoint: checkpoints[0] });
    const revertDialog = jest.fn().mockResolvedValue({ shouldRevert: true });
    activate({ ...requiredDialogs, chooseCheckpoint, revert: revertDialog });
    jest.spyOn(context, 'listCheckpoints').mockResolvedValue(checkpoints);
    const restore = jest
      .spyOn(context, 'restoreCheckpoint')
      .mockResolvedValue();
    jest.spyOn(context, 'revert').mockResolvedValue();

    await commands.execute('docmanager:restore-checkpoint');

    expect(chooseCheckpoint).toHaveBeenCalledWith({
      checkpoints: [checkpoints[1], checkpoints[0]],
      fileType: 'Text'
    });
    expect(revertDialog).toHaveBeenCalledWith({
      checkpoint: checkpoints[0],
      fileType: 'Text'
    });
    expect(restore).toHaveBeenCalledWith('older');
  });

  it('should use the custom delete dialog', async () => {
    const deleteDialog = jest.fn().mockResolvedValue({ shouldDelete: true });
    activate({ ...requiredDialogs, delete: deleteDialog });
    const deleteFile = jest.spyOn(docManager, 'deleteFile').mockResolvedValue();

    await commands.execute('docmanager:delete');

    expect(deleteDialog).toHaveBeenCalledWith({ path });
    expect(deleteFile).toHaveBeenCalledWith(path);
  });

  it('should use the custom dialog to rename an untitled file on save', async () => {
    const renameOnSave = jest
      .fn()
      .mockResolvedValue({ accepted: true, newName: 'notes.txt' });
    activate({ ...requiredDialogs, renameOnSave });
    widget.isUntitled = true;
    jest.spyOn(context, 'save').mockResolvedValue();
    const rename = jest.spyOn(context, 'rename').mockResolvedValue();
    jest
      .spyOn(context, 'createCheckpoint')
      .mockResolvedValue({ id: 'checkpoint', last_modified: '' });

    await commands.execute('docmanager:save');

    expect(renameOnSave).toHaveBeenCalledWith({ name: path });
    expect(rename).toHaveBeenCalledWith('notes.txt');
  });
});
