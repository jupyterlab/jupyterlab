// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect from 'expect';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import { DocumentWidgetOpenerMock } from '@jupyterlab/docregistry/lib/testutils';
import { Notification } from '@jupyterlab/apputils';
import { signalToPromises } from '@jupyterlab/testing';
import { DocumentRegistry, TextModelFactory } from '@jupyterlab/docregistry';
import { DocumentManager } from '@jupyterlab/docmanager';
import type { IDocumentManager } from '@jupyterlab/docmanager';
import type { ServiceManager } from '@jupyterlab/services';
import { StateDB } from '@jupyterlab/statedb';
import { CHUNK_SIZE, FileBrowserModel, UploadNotifications } from '../src';
import { UUID } from '@lumino/coreutils';

describe('filebrowser/uploadnotifications', () => {
  let registry: DocumentRegistry;
  let serviceManager: ServiceManager.IManager;
  let manager: IDocumentManager;
  let model: FileBrowserModel;
  let state: StateDB;
  let notifications: UploadNotifications;
  let emitSpy: jest.SpyInstance;
  let updateSpy: jest.SpyInstance;
  const opener = new DocumentWidgetOpenerMock();

  beforeAll(() => {
    registry = new DocumentRegistry({
      textModelFactory: new TextModelFactory()
    });
    serviceManager = new ServiceManagerMock();
    manager = new DocumentManager({
      registry,
      opener,
      manager: serviceManager
    });
    state = new StateDB();
  });

  beforeEach(async () => {
    await state.clear();
    model = new FileBrowserModel({ manager, state });
    await model.cd();
    notifications = new UploadNotifications({ model });

    emitSpy = jest.spyOn(Notification, 'emit');
    updateSpy = jest.spyOn(Notification, 'update');
  });

  afterEach(() => {
    emitSpy.mockRestore();
    updateSpy.mockRestore();
    notifications.dispose();
    model.dispose();
  });

  it('should emit in-progress notification on upload start', async () => {
    const fname = UUID.uuid4() + '.txt';

    const [startPromise] = signalToPromises(model.uploadChanged, 1);

    const uploaded = model.upload(
      new File(['<p>Hello, world!</p>'], fname, { type: 'text/html' })
    );

    const [_sender, _args] = await startPromise;

    expect(emitSpy).toHaveBeenCalledWith(
      expect.stringContaining('Uploading'),
      'in-progress',
      expect.objectContaining({ progress: 0, autoClose: false })
    );
    await expect(uploaded).resolves.toBeDefined();
  });

  it('should emit success notification on upload finished', async () => {
    const fname = UUID.uuid4() + '.txt';

    const [_startPromise, finishPromise] = signalToPromises(
      model.uploadChanged,
      2
    );

    const uploaded = model.upload(
      new File(['<p>Hello, world!</p>'], fname, { type: 'text/html' })
    );

    const [, finishArgs] = await finishPromise;

    expect(finishArgs.name).toBe('finish');
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        autoClose: 2000,
        message: expect.stringContaining('Upload complete')
      })
    );
    await uploaded;
  });

  it('should emit warning notification on upload cancelled', async () => {
    const fname = UUID.uuid4() + '.txt';

    (manager.services.contents.save as jest.Mock).mockRejectedValueOnce({
      name: 'AbortError',
      cause: { name: 'AbortError' }
    });

    const [startPromise, cancelledPromise] = signalToPromises(
      model.uploadChanged,
      2
    );

    const uploaded = model.upload(new File([], fname, { type: 'text/html' }));

    await startPromise;

    const [_sender, cancelledArgs] = await cancelledPromise;
    expect(cancelledArgs.name).toBe('cancelled');

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'warning',
        message: expect.stringContaining('Upload cancelled')
      })
    );
    await expect(uploaded).rejects.toThrow('Upload cancelled');
  });

  it('should emit error notification on upload failed', async () => {
    const fname = UUID.uuid4() + '.txt';
    (manager.services.contents.save as jest.Mock).mockRejectedValueOnce(
      new Error('Upload failed')
    );

    const [startPromise, failurePromise] = signalToPromises(
      model.uploadChanged,
      2
    );
    const uploaded = model.upload(
      new File(['<p>Hello, world!</p>'], fname, { type: 'text/html' })
    );
    await startPromise;

    const [_sender, args] = await failurePromise;

    expect(args.name).toBe('failure');

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        autoClose: 10000,
        message: expect.stringContaining('failed')
      })
    );
    await expect(uploaded).rejects.toThrow('Upload failed');
  });

  it('should emit update progress notification on upload updated', async () => {
    const fname = UUID.uuid4() + '.txt';
    const content = 'x'.repeat(2 * CHUNK_SIZE);
    const file = new File([content], fname, { type: 'text/plain' });

    const [startPromise, _firstUpdate, secondUpdate, finishPromise] =
      signalToPromises(model.uploadChanged, 4);

    const uploaded = model.upload(file);
    await startPromise;

    // Clear last update time so notification update is not skipped
    (notifications as any)._lastUpdateTime.clear();

    const [_sender, updateArgs] = await secondUpdate;
    expect(updateArgs.name).toBe('update');

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        progress: expect.any(Number)
      })
    );

    await finishPromise;
    await uploaded;
  });
});
