import { DocumentManager, renameFile } from '@jupyterlab/docmanager';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { ServiceManager } from '@jupyterlab/services';
import { dismissDialog } from '@jupyterlab/testutils';
import * as Mock from '@jupyterlab/testutils/lib/mock';
import { Widget } from '@lumino/widgets';

describe('docregistry/dialog', () => {
  let manager: DocumentManager;
  let services: ServiceManager.IManager;
  let alreadyExistsError: any = {};

  beforeAll(() => {
    const registry = new DocumentRegistry({});
    services = new Mock.ServiceManagerMock();
    manager = new DocumentManager({
      registry,
      manager: services,
      opener: {
        open: (widget: Widget) => {
          // no-op
        }
      }
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
