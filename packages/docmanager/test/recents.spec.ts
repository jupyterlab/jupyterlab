/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { PromiseDelegate } from '@lumino/coreutils';
import { StateDB } from '@jupyterlab/statedb';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import { ServiceManager } from '@jupyterlab/services';
import { RecentsManager } from '../src';
import { PageConfig } from '@jupyterlab/coreutils';

describe('@jupyterlab/docmanager', () => {
  let manager: TestRecentsManager;
  let services: ServiceManager.IManager;

  class TestRecentsManager extends RecentsManager {
    public updateRootDir() {
      return super.updateRootDir();
    }
  }

  beforeAll(() => {
    services = new ServiceManagerMock();
  });

  beforeEach(() => {
    const stateDB = new StateDB();
    manager = new TestRecentsManager({
      stateDB,
      contents: services.contents
    });
  });

  afterEach(() => {
    manager.dispose();
  });

  const setRootDir = (dir: string) => {
    PageConfig.setOption('serverRoot', dir);
    manager.updateRootDir();
  };

  describe('RecentsManager', () => {
    describe('#constructor()', () => {
      it('should create a new recents manager', () => {
        expect(manager).toBeInstanceOf(RecentsManager);
      });

      it('should emit `changed` signal after loading', async () => {
        const stateDB = new StateDB();
        const done = new PromiseDelegate<boolean>();
        manager = new TestRecentsManager({
          stateDB,
          contents: services.contents
        });
        manager.changed.connect(() => {
          done.resolve(true);
        });
        expect(await done.promise).toBe(true);
      });
    });

    describe('#isDisposed', () => {
      it('should test whether the manager is disposed', () => {
        expect(manager.isDisposed).toBe(false);
        manager.dispose();
        expect(manager.isDisposed).toBe(true);
      });
    });

    describe('#addRecent()', () => {
      it('should add a document to recently opened list', () => {
        expect(manager.recentlyOpened.length).toBe(0);
        manager.addRecent(
          { path: 'test.py', contentType: 'text/x-python' },
          'opened'
        );
        expect(manager.recentlyOpened.length).toBe(1);
        expect(manager.recentlyClosed.length).toBe(0);
        expect(manager.recentlyOpened[0].path).toBe('test.py');
        manager.addRecent({ path: 'test', contentType: 'directory' }, 'opened');
        expect(manager.recentlyOpened.length).toBe(2);
      });

      it('should add a document to recently closed list', () => {
        expect(manager.recentlyClosed.length).toBe(0);
        manager.addRecent(
          { path: 'test.py', contentType: 'text/x-python' },
          'closed'
        );
        expect(manager.recentlyClosed.length).toBe(1);
        expect(manager.recentlyOpened.length).toBe(0);
        expect(manager.recentlyClosed[0].path).toBe('test.py');
        manager.addRecent({ path: 'test', contentType: 'directory' }, 'closed');
        expect(manager.recentlyClosed.length).toBe(2);
      });

      it('should auto-populate root dir', () => {
        manager.addRecent({ path: 'test', contentType: 'directory' }, 'opened');
        expect(manager.recentlyOpened[0].root).toBe(
          PageConfig.getOption('serverRoot')
        );
      });
    });

    describe('#removeRecent()', () => {
      it('should remove a document by path from correct list', () => {
        const document = { path: 'test.py', contentType: 'text/x-python' };
        manager.addRecent(document, 'opened');
        manager.addRecent(document, 'closed');
        expect(manager.recentlyOpened.length).toBe(1);
        expect(manager.recentlyClosed.length).toBe(1);
        manager.removeRecent(manager.recentlyOpened[0], 'closed');
        expect(manager.recentlyOpened.length).toBe(1);
        expect(manager.recentlyClosed.length).toBe(0);
      });
    });

    describe('#recentlyOpened()', () => {
      it('should filter out items from other root directories', () => {
        setRootDir('root_a');
        manager.addRecent({ path: 'a', contentType: 'directory' }, 'opened');
        setRootDir('root_b');
        manager.addRecent({ path: 'b', contentType: 'directory' }, 'opened');
        // Check for `root_b` (most recent)
        expect(manager.recentlyOpened.length).toBe(1);
        expect(manager.recentlyOpened[0].root).toBe('root_b');
        // Switch back to `root_a`
        setRootDir('root_a');
        expect(manager.recentlyOpened.length).toBe(1);
        expect(manager.recentlyOpened[0].root).toBe('root_a');
      });
    });

    describe('#recentlyClosed()', () => {
      it('should filter out items from other root directories', () => {
        setRootDir('root_a');
        manager.updateRootDir();
        manager.addRecent({ path: 'a', contentType: 'directory' }, 'closed');
        setRootDir('root_b');
        manager.addRecent({ path: 'b', contentType: 'directory' }, 'closed');
        // Check for `root_b` (most recent)
        expect(manager.recentlyClosed.length).toBe(1);
        expect(manager.recentlyClosed[0].root).toBe('root_b');
        // Switch back to `root_a`
        setRootDir('root_a');
        expect(manager.recentlyClosed.length).toBe(1);
        expect(manager.recentlyClosed[0].root).toBe('root_a');
      });
    });

    describe('#maximalRecentsLength', () => {
      it('should limit the number of items', () => {
        manager.maximalRecentsLength = 3;
        for (let i = 0; i < 10; i++) {
          const item = { path: `item${i}`, contentType: 'text/x-python' };
          manager.addRecent(item, 'opened');
          manager.addRecent(item, 'closed');
        }
        expect(manager.recentlyClosed.length).toBe(3);
        expect(manager.recentlyOpened.length).toBe(3);
        manager.maximalRecentsLength = 2;
        expect(manager.recentlyClosed.length).toBe(2);
        expect(manager.recentlyOpened.length).toBe(2);
      });
      it('should report current limit', () => {
        manager.maximalRecentsLength = 5;
        expect(manager.maximalRecentsLength).toBe(5);
      });
      it('should default to a non-negative number', () => {
        expect(manager.maximalRecentsLength).toBeGreaterThanOrEqual(0);
      });
    });

    describe('#changed()', () => {
      it('should emit when new item is added', async () => {
        const done = new PromiseDelegate<boolean>();
        manager.changed.connect(() => {
          done.resolve(true);
        });
        const item = { path: `test.py`, contentType: 'text/x-python' };
        manager.addRecent(item, 'opened');
        expect(await done.promise).toBe(true);
      });
      it('should emit when an item is removed', async () => {
        const done = new PromiseDelegate<boolean>();
        const item = { path: `test.py`, contentType: 'text/x-python' };
        manager.addRecent(item, 'opened');
        manager.changed.connect(() => {
          done.resolve(true);
        });
        manager.removeRecent(manager.recentlyOpened[0], 'opened');
        expect(await done.promise).toBe(true);
      });
    });
  });
});
