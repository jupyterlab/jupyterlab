// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  IObservableJSON, ObservableJSON
} from '@jupyterlab/coreutils';


describe('coreutils', () => {

  describe('ObservableJSON', () => {

    describe('#constructor()', () => {

      it('should create an observable JSON object', () => {
        let item = new ObservableJSON();
        expect(item).to.be.an(ObservableJSON);
      });

      it('should accept initial values', () => {
        let item = new ObservableJSON({
          values: { 'foo': 1, 'bar': 'baz'}
        });
        expect(item).to.be.an(ObservableJSON);
      });

    });

    describe('#toJSON()', () => {

      it('should serialize the model to JSON', () => {
        let item = new ObservableJSON();
        item.set('foo', 1);
        expect(item.toJSON()['foo']).to.be(1);
      });

      it('should return a copy of the data', () => {
        let item = new ObservableJSON();
        item.set('foo', { 'bar': 1 });
        let value = item.toJSON();
        value['bar'] = 2;
        expect((item.get('foo') as any)['bar']).to.be(1);
      });

    });

  });

  describe('ObservableJSON.ChangeMessage', () => {

    describe('#constructor()', () => {

      it('should create a new message', () => {
        let message = new ObservableJSON.ChangeMessage({
          key: 'foo',
          type: 'add',
          oldValue: 1,
          newValue: 2
        });
        expect(message).to.be.a(ObservableJSON.ChangeMessage);
      });

    });

    describe('#args', () => {

      it('should be the args of the message', () => {
        let args: IObservableJSON.IChangedArgs = {
          key: 'foo',
          type: 'add',
          oldValue: 'ho',
          newValue: 'hi'
        };
        let message = new ObservableJSON.ChangeMessage(args);
        expect(message.args).to.be(args);
      });

    });

  });

});
