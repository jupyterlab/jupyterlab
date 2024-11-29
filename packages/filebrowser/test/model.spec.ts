// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PageConfig } from '@jupyterlab/coreutils';
import { DocumentManager, IDocumentManager } from '@jupyterlab/docmanager';
import { DocumentRegistry, TextModelFactory } from '@jupyterlab/docregistry';
import { DocumentWidgetOpenerMock } from '@jupyterlab/docregistry/lib/testutils';
import { Contents, ServiceManager } from '@jupyterlab/services';
import { StateDB } from '@jupyterlab/statedb';
import {
  acceptDialog,
  dismissDialog,
  signalToPromises,
  sleep
} from '@jupyterlab/testing';
import {
  ContentsManagerMock,
  ServiceManagerMock
} from '@jupyterlab/services/lib/testutils';
import { UUID } from '@lumino/coreutils';
import expect from 'expect';
import { CHUNK_SIZE, FileBrowserModel, LARGE_FILE_SIZE } from '../src';

/**
 * A contents manager that delays requests by less each time it is called
 * in order to simulate out-of-order responses from the server.
 */
class DelayedContentsManager extends ContentsManagerMock {
  get(
    path: string,
    options?: Contents.IFetchOptions
  ): Promise<Contents.IModel> {
    return new Promise<Contents.IModel>(resolve => {
      const delay = this._delay;
      this._delay -= 500;
      void super.get(path, options).then(contents => {
        setTimeout(
          () => {
            resolve(contents);
          },
          Math.max(delay, 0)
        );
      });
    });
  }

  private _delay = 1000;
}

describe('filebrowser/model', () => {
  let manager: IDocumentManager;
  let serviceManager: ServiceManager.IManager;
  let registry: DocumentRegistry;
  let model: FileBrowserModel;
  let name: string;
  let subDir: string;
  let subSubDir: string;
  let state: StateDB;
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

    let contents = await manager.newUntitled({ type: 'file' });
    name = contents.name;

    contents = await manager.newUntitled({ type: 'directory' });
    subDir = contents.path;

    contents = await manager.newUntitled({ path: subDir, type: 'directory' });
    subSubDir = contents.path;

    return model.cd();
  });

  afterEach(() => {
    model.dispose();
  });

  describe('FileBrowserModel', () => {
    describe('#constructor()', () => {
      it('should construct a new file browser model', () => {
        model = new FileBrowserModel({ manager });
        expect(model).toBeInstanceOf(FileBrowserModel);
      });
    });

    describe('#pathChanged', () => {
      it('should be emitted when the path changes', async () => {
        let called = false;
        model.pathChanged.connect((sender, args) => {
          expect(sender).toBe(model);
          expect(args.name).toBe('path');
          expect(args.oldValue).toBe('');
          expect(args.newValue).toBe(subDir);
          called = true;
        });
        await model.cd(subDir);
        expect(called).toBe(true);
      });
    });

    describe('#refreshed', () => {
      it('should be emitted after a refresh', async () => {
        let called = false;
        model.refreshed.connect((sender, arg) => {
          expect(sender).toBe(model);
          expect(arg).toBeUndefined();
          called = true;
        });
        await model.cd();
        expect(called).toBe(true);
      });

      it('should be emitted when the path changes', async () => {
        let called = false;
        model.refreshed.connect((sender, arg) => {
          expect(sender).toBe(model);
          expect(arg).toBeUndefined();
          called = true;
        });
        await model.cd(subDir);
        expect(called).toBe(true);
      });
    });

    describe('#fileChanged', () => {
      it('should be emitted when a file is created', async () => {
        let called = false;
        model.fileChanged.connect((sender, args) => {
          expect(sender).toBe(model);
          expect(args.type).toBe('new');
          expect(args.oldValue).toBeNull();
          expect(args.newValue!.type).toBe('file');
          called = true;
        });
        await manager.newUntitled({ type: 'file' });
        expect(called).toBe(true);
      });

      it('should be emitted when a file is created in a drive with a name', async () => {
        await state.clear();
        const driveName = 'RTC';
        const modelWithName = new FileBrowserModel({
          manager,
          state,
          driveName
        });

        let called = false;
        modelWithName.fileChanged.connect((sender, args) => {
          expect(sender).toBe(modelWithName);
          expect(args.type).toBe('new');
          expect(args.oldValue).toBeNull();
          expect(args.newValue!.type).toBe('file');
          called = true;
        });
        await manager.newUntitled({ type: 'file' });
        expect(called).toBe(true);
        modelWithName.dispose();
      });

      it('should be emitted when a file is renamed', async () => {
        let called = false;
        model.fileChanged.connect((sender, args) => {
          expect(sender).toBe(model);
          expect(args.type).toBe('rename');
          expect(args.oldValue!.path).toBe(name);
          expect(args.newValue!.path).toBe(name + '.bak');
          called = true;
        });
        await manager.rename(name, name + '.bak');
        expect(called).toBe(true);
      });

      it('should be emitted when a file is deleted', async () => {
        let called = false;
        model.fileChanged.connect((sender, args) => {
          expect(sender).toBe(model);
          expect(args.type).toBe('delete');
          expect(args.oldValue!.path).toBe(name);
          expect(args.newValue).toBeNull();
          called = true;
        });
        await manager.deleteFile(name);
        expect(called).toBe(true);
      });
    });

    describe('#path', () => {
      it('should be the current path of the model', async () => {
        expect(model.path).toBe('');
        await model.cd(subDir);
        expect(model.path).toBe(subDir);
      });
    });

    describe('#rootPath', () => {
      it('should be and remain the root path of the model', async () => {
        expect(model.rootPath).toBe('');
        await model.cd('src/');
        expect(model.rootPath).toBe('');
      });
    });

    describe('#items()', () => {
      it('should get an iterator of items in the current path', () => {
        const items = model.items();
        expect(!items.next().done).toBe(true);
      });
    });

    describe('#isDisposed', () => {
      it('should test whether the model is disposed', () => {
        expect(model.isDisposed).toBe(false);
        model.dispose();
        expect(model.isDisposed).toBe(true);
      });
    });

    describe('#sessions()', () => {
      it('should be the session models for the active notebooks', async () => {
        const contents = await manager.newUntitled({ type: 'notebook' });
        const session = await serviceManager.sessions.startNew({
          name: '',
          path: contents.path,
          type: 'test'
        });
        await model.cd();
        expect(!model.sessions().next().done).toBe(true);
        await session.shutdown();
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the model', () => {
        model.dispose();
        expect(model.isDisposed).toBe(true);
      });

      it('should be safe to call more than once', () => {
        model.dispose();
        model.dispose();
        expect(model.isDisposed).toBe(true);
      });
    });

    describe('#refresh()', () => {
      it('should refresh the contents', async () => {
        await expect(model.refresh()).resolves.not.toThrow();
      });
    });

    describe('#cd()', () => {
      it('should change directory', async () => {
        await model.cd(subDir);
        expect(model.path).toBe(subDir);
      });

      it('should change to a nested directory', async () => {
        await model.cd(subSubDir);
        expect(model.path).toBe(subSubDir);
      });

      it('should accept a relative path', async () => {
        await model.cd(subDir);
        expect(model.path).toBe(subDir);
      });

      it('should accept a parent directory', async () => {
        await model.cd(subDir);
        await model.cd('..');
        expect(model.path).toBe('');
      });

      it('should be resilient to a slow initial fetch', async () => {
        const delayedServiceManager = new ServiceManagerMock();
        (delayedServiceManager as any).contents = new DelayedContentsManager();
        const contents = await delayedServiceManager.contents.newUntitled({
          type: 'directory'
        });
        subDir = contents.path;

        const manager = new DocumentManager({
          registry,
          opener,
          manager: delayedServiceManager
        });
        model = new FileBrowserModel({ manager, state }); // Should delay 1000ms

        // An initial refresh is called in the constructor.
        // If it is too slow, it can come in after the directory change,
        // causing a directory set by, e.g., the tree handler to be wrong.
        // This checks to make sure we are handling that case correctly.
        await model.cd(subDir); // should delay 500ms
        await sleep(2000);
        expect(model.path).toBe(subDir);

        manager.dispose();
        delayedServiceManager.contents.dispose();
        delayedServiceManager.dispose();
        model.dispose();
      });
    });

    describe('#restore()', () => {
      it('should restore based on ID', async () => {
        const id = 'foo';
        const model2 = new FileBrowserModel({ manager, state });
        await model.restore(id);
        await model.cd(subDir);
        expect(model.path).toBe(subDir);
        expect(model2.path).toBe('');
        await model2.restore(id);
        expect(model2.path).toBe(subDir);
        model2.dispose();
      });

      it('should be safe to call multiple times', async () => {
        const id = 'bar';
        const model2 = new FileBrowserModel({ manager, state });
        await model.restore(id);
        await model.cd(subDir);
        expect(model.path).toBe(subDir);
        expect(model2.path).toBe('');
        await model2.restore(id);
        await model2.restore(id);
        expect(model2.path).toBe(subDir);
        model2.dispose();
      });
    });

    describe('#download()', () => {
      it.skip('should download the file without error', () => {
        // TODO: how to test this?
      });
    });

    describe('#upload()', () => {
      it('should upload a file object', async () => {
        const fname = UUID.uuid4() + '.html';
        const file = new File(['<p>Hello world!</p>'], fname, {
          type: 'text/html'
        });
        const contents = await model.upload(file);
        expect(contents.name).toBe(fname);
      });

      it('should overwrite', async () => {
        const fname = UUID.uuid4() + '.html';
        const file = new File(['<p>Hello world!</p>'], fname, {
          type: 'text/html'
        });
        const contents = await model.upload(file);
        expect(contents.name).toBe(fname);
        const promise = model.upload(file);
        await acceptDialog();
        await promise;
        expect(contents.name).toBe(fname);
      });

      it('should not overwrite', async () => {
        const fname = UUID.uuid4() + '.html';
        const file = new File(['<p>Hello world!</p>'], fname, {
          type: 'text/html'
        });
        const contents = await model.upload(file);
        expect(contents.name).toBe(fname);
        const promise = model.upload(file);
        await dismissDialog();

        await expect(promise).rejects.toBe('File not uploaded');
      });

      it('should emit the fileChanged signal', async () => {
        const fname = UUID.uuid4() + '.html';
        let called = false;
        model.fileChanged.connect((sender, args) => {
          expect(sender).toBe(model);
          expect(args.type).toBe('save');
          expect(args.oldValue).toBeNull();
          expect(args.newValue!.path).toBe(fname);
          called = true;
        });
        const file = new File(['<p>Hello world!</p>'], fname, {
          type: 'text/html'
        });
        await model.upload(file);
        expect(called).toBe(true);
      });

      describe('older notebook version', () => {
        let prevNotebookVersion: string;

        beforeAll(() => {
          prevNotebookVersion = PageConfig.setOption(
            'notebookVersion',
            JSON.stringify([5, 0, 0])
          );
        });

        it('should not upload large file', async () => {
          const fname = UUID.uuid4() + '.html';
          const file = new File([new ArrayBuffer(LARGE_FILE_SIZE + 1)], fname);

          await expect(model.upload(file)).rejects.toBe(
            `Cannot upload file (>15 MB). ${fname}`
          );
        });

        afterAll(() => {
          PageConfig.setOption('notebookVersion', prevNotebookVersion);
        });
      });

      describe('newer notebook version', () => {
        let prevNotebookVersion: string;

        beforeAll(() => {
          prevNotebookVersion = PageConfig.setOption(
            'notebookVersion',
            JSON.stringify([5, 1, 0])
          );
        });

        for (const ending of ['.txt', '.ipynb']) {
          for (const size of [
            CHUNK_SIZE - 1,
            CHUNK_SIZE,
            CHUNK_SIZE + 1,
            2 * CHUNK_SIZE
          ]) {
            it(`should upload a large ${ending} file of size ${size}`, async () => {
              const fname = UUID.uuid4() + ending;

              // minimal valid (according to server) notebook
              let content =
                '{"nbformat": 4, "metadata": {"_": ""}, "nbformat_minor": 2, "cells": []}';
              // make metadata longer so that total document is `size` long
              content = content.replace(
                '"_": ""',
                `"_": "${' '.repeat(size - content.length)}"`
              );
              const file = new File([content], fname, { type: 'text/plain' });
              await model.upload(file);
              // Ensure we get the file back.
              const contentModel =
                await model.manager.services.contents.get(fname);
              expect(contentModel.content.length).toBeGreaterThan(0);
            });
          }
        }

        it(`should produce progress as a large file uploads`, async () => {
          const fname = UUID.uuid4() + '.txt';
          const file = new File([new ArrayBuffer(2 * CHUNK_SIZE)], fname);

          const [start, first, second, finished] = signalToPromises(
            model.uploadChanged,
            4
          );

          const uploaded = model.upload(file);
          expect(Array.from(model.uploads())).toEqual([]);
          expect(await start).toEqual([
            model,
            {
              name: 'start',
              oldValue: null,
              newValue: { path: fname, progress: 0 }
            }
          ]);
          expect(Array.from(model.uploads())).toEqual([
            { path: fname, progress: 0 }
          ]);
          expect(await first).toEqual([
            model,
            {
              name: 'update',
              oldValue: { path: fname, progress: 0 },
              newValue: { path: fname, progress: 0 }
            }
          ]);
          expect(Array.from(model.uploads())).toEqual([
            { path: fname, progress: 0 }
          ]);
          expect(await second).toEqual([
            model,
            {
              name: 'update',
              oldValue: { path: fname, progress: 0 },
              newValue: { path: fname, progress: 1 / 2 }
            }
          ]);
          expect(Array.from(model.uploads())).toEqual([
            { path: fname, progress: 1 / 2 }
          ]);
          expect(await finished).toEqual([
            model,
            {
              name: 'finish',
              oldValue: { path: fname, progress: 1 / 2 },
              newValue: null
            }
          ]);
          expect(Array.from(model.uploads())).toEqual([]);
          await uploaded;
        });

        afterAll(() => {
          PageConfig.setOption('notebookVersion', prevNotebookVersion);
        });
      });
    });
  });
});
