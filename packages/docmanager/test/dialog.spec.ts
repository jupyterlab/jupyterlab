import { DocumentRegistry } from '@jupyterlab/docregistry';
import { Contents, ServiceManager } from '@jupyterlab/services';
import { Widget } from '@lumino/widgets';
import * as Mock from '@jupyterlab/testutils/lib/mock';
import { DocumentManager, renameFile } from '../src';

function shouldOverwriteFalse(path: string): Promise<boolean> {
  return Promise.resolve(false);
}

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
    manager.rename = (oldPath, newPath) => {
      const renamePromise = new Promise(function (resolve, reject) {
        throw alreadyExistsError;
      }) as Promise<Contents.IModel>;
      return renamePromise;
    };
  });

  describe('@jupyterlab/docmanager', () => {
    describe('#renameFile()', () => {
      it('should show overwrite dialog when file is already existing', async () => {
        alreadyExistsError.response.status = 409;
        await renameFile(
          manager,
          'foo.ipynb',
          'bar.ipynb',
          shouldOverwriteFalse
        ).catch(error => {
          // error should be 'File not renamed'
          expect(error).not.toBe(alreadyExistsError);
        });
      });
      it('should throw error on no status', async () => {
        alreadyExistsError.response = {};
        await renameFile(
          manager,
          'foo.ipynb',
          'bar.ipynb',
          shouldOverwriteFalse
        ).catch(error => {
          expect(error).toBe(alreadyExistsError);
        });
      });
      it('should throw error on not 409 status', async () => {
        alreadyExistsError.response.status = 408;
        await renameFile(
          manager,
          'foo.ipynb',
          'bar.ipynb',
          shouldOverwriteFalse
        ).catch(error => {
          expect(error).toBe(alreadyExistsError);
        });
      });
    });
  });
});
