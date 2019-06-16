// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { IToaster, Toaster } from '@jupyterlab/statusbar';

describe('@jupyterlab/statusbar', () => {
  describe('Toaster', () => {
    let toaster: Toaster;

    beforeEach(() => {
      toaster = new Toaster();
    });

    describe('#constructor()', () => {
      it('should construct a new toaster', () => {
        expect(toaster).to.be.an.instanceof(Toaster);
      });
    });

    describe('#clear()', () => {
      it('should clear all toasts', () => {
        toaster.show({ message: 'message' });
        toaster.clear();
        expect(toaster.getToasts().length).to.equal(0);
      });
    });

    describe('#dismiss()', () => {
      it('should dismiss a toast', () => {
        toaster.show({ message: 'message 1' });
        const key2 = toaster.show({ message: 'message 2' });
        toaster.dismiss(key2);
        const toasts = toaster.getToasts();
        expect(toasts.length).to.equal(1);
        expect(toasts[0].message).to.equal('message 1');
      });

      it('should do nothing if the toast does not exist', () => {
        toaster.show({ message: 'message 1' });
        toaster.dismiss('dummy_key');
        const toasts = toaster.getToasts();
        expect(toasts.length).to.equal(1);
        expect(toasts[0].message).to.equal('message 1');
      });
    });

    describe('#error()', () => {
      it('should add a toast of type error', () => {
        toaster.error({
          message: 'error',
          timeout: 5000
        });
        const toasts = toaster.getToasts();
        expect(toasts.length).to.equal(1);
        expect(toasts[0].message).to.equal('error');
        expect(toasts[0].icon).to.equal('error');
        expect(toasts[0].type).to.equal('danger');
        expect(toasts[0].timeout).to.equal(5000);
      });

      it('should add a toast of type error with no timeout', () => {
        toaster.error({
          message: 'error'
        });
        const toasts = toaster.getToasts();
        expect(toasts.length).to.equal(1);
        expect(toasts[0].timeout).to.equal(0);
      });
    });

    describe('#getToasts()', () => {
      it('should return an array with all toasts', () => {
        const model1: IToaster.IModel = {
          icon: 'home',
          message: 'message 1',
          timeout: 10000,
          type: 'danger'
        };
        const model2: IToaster.IModel = {
          message: 'message 2',
          action: {
            label: 'action 1',
            onClick: () => {
              console.log('I got clicked');
            }
          },
          onDismiss: diTimeoutExpire => {
            console.log('I got dismissed');
          }
        };
        toaster.show(model1);
        toaster.show(model2);
        const toasts = toaster.getToasts();
        expect(toasts.length).to.equal(2);
        expect(toasts[1]).to.have.property('message', model1.message);
        expect(toasts[1]).to.have.property('icon', model1.icon);
        expect(toasts[1]).to.have.property('timeout', model1.timeout);
        expect(toasts[1]).to.have.property('type', model1.type);

        expect(toasts[0]).to.have.property('message', model2.message);
        expect(toasts[0]).to.have.property('action');
        expect(toasts[0]).to.have.property('onDismiss');
      });
    });

    describe('#info()', () => {
      it('should add a toast of type info', () => {
        toaster.info({
          message: 'info'
        });
        const toasts = toaster.getToasts();
        expect(toasts.length).to.equal(1);
        expect(toasts[0].message).to.equal('info');
        expect(toasts[0].icon).to.equal('info-sign');
        expect(toasts[0].type).to.equal('primary');
      });
    });

    describe('#show()', () => {
      it('should create a toast respecting the model', () => {
        const model: IToaster.IModel = {
          icon: 'home',
          key: 'this_is_my_unique_key',
          message: 'message 1',
          timeout: 10000,
          type: 'danger',
          action: {
            label: 'action 1',
            onClick: () => {
              console.log('I got clicked');
            }
          },
          onDismiss: diTimeoutExpire => {
            console.log('I got dismissed');
          }
        };
        toaster.show(model);
        const toasts = toaster.getToasts();

        expect(toasts.length).to.equal(1);
        expect(toasts[0]).to.have.property('message', model.message);
        expect(toasts[0]).to.have.property('icon', model.icon);
        expect(toasts[0]).to.have.property('timeout', model.timeout);
        expect(toasts[0]).to.have.property('type', model.type);
        expect(toasts[0]).to.have.property('action');
        expect(toasts[0]).to.have.property('onDismiss');
      });

      it('should update a toast if the key already exists', () => {
        const key = toaster.show({ message: 'You got a message.' });
        let toasts = toaster.getToasts();

        expect(toasts.length).to.equal(1);
        expect(toasts[0]).to.have.property('message', 'You got a message.');
        expect(toasts[0]).to.have.property('icon', undefined);
        expect(toasts[0]).to.have.property('type', 'none');
        expect(toasts[0]).to.have.property('action', undefined);
        expect(toasts[0]).to.have.property('onDismiss', undefined);

        const model: IToaster.IModel = {
          icon: 'home',
          key,
          message: 'message 1',
          timeout: 10000,
          type: 'danger',
          action: {
            label: 'action 1',
            onClick: () => {
              console.log('I got clicked');
            }
          },
          onDismiss: diTimeoutExpire => {
            console.log('I got dismissed');
          }
        };
        toaster.show(model);
        toasts = toaster.getToasts();

        expect(toasts.length).to.equal(1);
        expect(toasts[0]).to.have.property('message', model.message);
        expect(toasts[0]).to.have.property('icon', model.icon);
        expect(toasts[0]).to.have.property('timeout', model.timeout);
        expect(toasts[0]).to.have.property('type', model.type);
        expect(toasts[0]).to.have.property('action');
        expect(toasts[0]).to.have.property('onDismiss');
      });
    });

    describe('#success()', () => {
      it('should add a toast of type success', () => {
        toaster.success({
          message: 'success'
        });
        const toasts = toaster.getToasts();
        expect(toasts.length).to.equal(1);
        expect(toasts[0].message).to.equal('success');
        expect(toasts[0].icon).to.equal('tick');
        expect(toasts[0].type).to.equal('success');
      });
    });

    describe('#warning()', () => {
      it('should add a toast of type warning', () => {
        toaster.warning({
          message: 'warning',
          timeout: 5000
        });
        const toasts = toaster.getToasts();
        expect(toasts.length).to.equal(1);
        expect(toasts[0].message).to.equal('warning');
        expect(toasts[0].icon).to.equal('warning-sign');
        expect(toasts[0].type).to.equal('warning');
        expect(toasts[0].timeout).to.equal(5000);
      });

      it('should add a toast of type warning with no timeout', () => {
        toaster.warning({
          message: 'warning'
        });
        const toasts = toaster.getToasts();
        expect(toasts.length).to.equal(1);
        expect(toasts[0].timeout).to.equal(0);
      });
    });
  });
});
