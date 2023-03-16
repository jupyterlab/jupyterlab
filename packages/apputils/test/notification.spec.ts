// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Notification } from '@jupyterlab/apputils';
import { PromiseDelegate, ReadonlyJSONValue } from '@lumino/coreutils';

describe('@jupyterlab/apputils', () => {
  describe('Notification', () => {
    beforeEach(() => {
      Notification.manager.dismiss();
    });

    describe('#dismiss', () => {
      it('should dismiss an given notification', () => {
        const id1 = Notification.info('dummy 1');
        const id2 = Notification.info('dummy 2');

        Notification.dismiss(id1);

        expect(Notification.manager.count).toEqual(1);
        expect(Notification.manager.notifications[0].id).toEqual(id2);
      });

      it('should dismiss all notifications', () => {
        Notification.info('dummy 1');
        Notification.info('dummy 2');

        Notification.dismiss();

        expect(Notification.manager.count).toEqual(0);
        expect(Notification.manager.notifications).toHaveLength(0);
      });
    });

    describe('#emit', () => {
      it.each([
        'default',
        'error',
        'info',
        'in-progress',
        'success',
        'warning'
      ])('should emit a notification of the type %s', type => {
        const id = Notification.emit('dummy message', type as any);

        expect(Notification.manager.count).toEqual(1);
        expect(Notification.manager.notifications[0].id).toEqual(id);
        expect(Notification.manager.notifications[0].message).toEqual(
          'dummy message'
        );
        expect(Notification.manager.notifications[0].type).toEqual(type);
      });

      it('should emit a default notification by default', () => {
        Notification.emit('dummy 1');

        expect(Notification.manager.notifications[0].type).toEqual('default');
      });

      it('should emit a notification with the provided options', () => {
        const options: Notification.IOptions<ReadonlyJSONValue> = {
          actions: [
            {
              label: 'my action',
              callback: () => {
                console.log('my action was triggered');
              },
              caption: 'my action description'
            }
          ],
          autoClose: 2000,
          data: {
            a: 1,
            b: 'data'
          },
          progress: 0.2
        };
        Notification.emit('dummy 1', 'default', options);

        expect(Notification.manager.notifications[0].options).toEqual(options);
      });
    });

    it.each([
      [-1, 0],
      [0, 0],
      [0.2, 0.2],
      [1, 1],
      [2, 1]
    ])('should bound the progress %s', (progress, expected) => {
      Notification.emit('dummy message', 'in-progress', { progress });

      expect(Notification.manager.notifications[0].options.progress).toEqual(
        expected
      );
    });

    describe('#error', () => {
      it('should emit an error notification', () => {
        const id = Notification.error('dummy message');

        expect(Notification.manager.count).toEqual(1);
        expect(Notification.manager.notifications[0].id).toEqual(id);
        expect(Notification.manager.notifications[0].message).toEqual(
          'dummy message'
        );
        expect(Notification.manager.notifications[0].type).toEqual('error');
      });
    });

    describe('#info', () => {
      it('should emit an info notification', () => {
        const id = Notification.info('dummy message');

        expect(Notification.manager.count).toEqual(1);
        expect(Notification.manager.notifications[0].id).toEqual(id);
        expect(Notification.manager.notifications[0].message).toEqual(
          'dummy message'
        );
        expect(Notification.manager.notifications[0].type).toEqual('info');
      });
    });

    describe('#promise', () => {
      it('should emit a notification that turn into success when resolved', async () => {
        const promise = new PromiseDelegate<string>();
        Notification.promise(promise.promise, {
          error: {
            message: reason => `Promise got rejected: ${reason}`
          },
          pending: { message: 'Waiting for promise resolution' },
          success: {
            message: result => `Promise was resolved: ${result}`
          }
        });

        expect(Notification.manager.notifications[0].type).toEqual(
          'in-progress'
        );
        expect(Notification.manager.notifications[0].message).toEqual(
          'Waiting for promise resolution'
        );

        promise.resolve('Done');

        const done = new PromiseDelegate<void>();
        // Wait for promise to allow notification update to occurs
        setTimeout(() => {
          expect(Notification.manager.notifications[0].type).toEqual('success');
          expect(Notification.manager.notifications[0].message).toEqual(
            'Promise was resolved: Done'
          );
          done.resolve();
        }, 0);

        await done.promise;
      });

      it('should emit a notification that turn into error when rejected', async () => {
        const promise = new PromiseDelegate<string>();
        Notification.promise(promise.promise, {
          error: {
            message: reason => `Promise got rejected: ${reason}`
          },
          pending: { message: 'Waiting for promise resolution' },
          success: {
            message: result => `Promise was resolved ${result}`
          }
        });

        expect(Notification.manager.notifications[0].type).toEqual(
          'in-progress'
        );
        expect(Notification.manager.notifications[0].message).toEqual(
          'Waiting for promise resolution'
        );

        promise.reject('Failed');

        const done = new PromiseDelegate<void>();
        // Wait for promise to allow notification update to occurs
        setTimeout(() => {
          expect(Notification.manager.notifications[0].type).toEqual('error');
          expect(Notification.manager.notifications[0].message).toEqual(
            'Promise got rejected: Failed'
          );
          done.resolve();
        }, 0);

        await done.promise;
      });
    });

    describe('#success', () => {
      it('should emit a success notification', () => {
        const id = Notification.success('dummy message');

        expect(Notification.manager.count).toEqual(1);
        expect(Notification.manager.notifications[0].id).toEqual(id);
        expect(Notification.manager.notifications[0].message).toEqual(
          'dummy message'
        );
        expect(Notification.manager.notifications[0].type).toEqual('success');
      });
    });

    describe('#update', () => {
      it('should update a notification', () => {
        const id = Notification.emit('dummy message');

        const options: Notification.IOptions<ReadonlyJSONValue> = {
          actions: [
            {
              label: 'my action',
              callback: () => {
                console.log('my action was triggered');
              },
              caption: 'my action description'
            }
          ],
          autoClose: 2000,
          data: {
            a: 1,
            b: 'data'
          }
        };
        Notification.update({
          id,
          message: 'Updated message',
          type: 'success',
          ...options
        });

        expect(Notification.manager.notifications[0].id).toEqual(id);
        expect(Notification.manager.notifications[0].message).toEqual(
          'Updated message'
        );
        expect(Notification.manager.notifications[0].type).toEqual('success');
        expect(Notification.manager.notifications[0].options).toEqual(options);
      });

      it('should update only the progress', () => {
        const id = Notification.emit('dummy message', 'in-progress', {
          progress: 0
        });

        Notification.update({
          id,
          progress: 0.5
        });
        expect(Notification.manager.notifications[0].options.progress).toEqual(
          0.5
        );
      });
    });

    describe('#warning', () => {
      it('should emit a warning notification', () => {
        const id = Notification.warning('dummy message');

        expect(Notification.manager.count).toEqual(1);
        expect(Notification.manager.notifications[0].id).toEqual(id);
        expect(Notification.manager.notifications[0].message).toEqual(
          'dummy message'
        );
        expect(Notification.manager.notifications[0].type).toEqual('warning');
      });
    });
  });
});
