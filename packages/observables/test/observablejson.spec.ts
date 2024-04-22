// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IObservableJSON, ObservableJSON } from '@jupyterlab/observables';

describe('@jupyterlab/observables', () => {
  describe('ObservableJSON', () => {
    describe('#constructor()', () => {
      it('should create an observable JSON object', () => {
        const item = new ObservableJSON();
        expect(item).toBeInstanceOf(ObservableJSON);
      });

      it('should accept initial values', () => {
        const item = new ObservableJSON({
          values: { foo: 1, bar: 'baz' }
        });
        expect(item).toBeInstanceOf(ObservableJSON);
      });
    });

    describe('#toJSON()', () => {
      it('should serialize the model to JSON', () => {
        const item = new ObservableJSON();
        item.set('foo', 1);
        expect(item.toJSON()['foo']).toBe(1);
      });

      it('should return a copy of the data', () => {
        const item = new ObservableJSON();
        item.set('foo', { bar: 1 });
        const value = item.toJSON();
        value['bar'] = 2;
        expect((item.get('foo') as any)['bar']).toBe(1);
      });
    });
  });

  describe('ObservableJSON.ChangeMessage', () => {
    describe('#constructor()', () => {
      it('should create a new message', () => {
        const message = new ObservableJSON.ChangeMessage('jsonvalue-changed', {
          key: 'foo',
          type: 'add',
          oldValue: 1,
          newValue: 2
        });
        expect(message).toBeInstanceOf(ObservableJSON.ChangeMessage);
      });
    });

    describe('#args', () => {
      it('should be the args of the message', () => {
        const args: IObservableJSON.IChangedArgs = {
          key: 'foo',
          type: 'add',
          oldValue: 'ho',
          newValue: 'hi'
        };
        const message = new ObservableJSON.ChangeMessage(
          'jsonvalue-changed',
          args
        );
        expect(message.args).toBe(args);
      });
    });
  });
});
