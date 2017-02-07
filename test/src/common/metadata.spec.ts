// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  JSONValue
} from 'phosphor/lib/algorithm/json';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  simulate
} from 'simulate-event';

import {
  Metadata
} from '../../../lib/common/metadata';


describe('common/metadata', () => {

  describe('Metadata.Cursor', () => {

    let cursor: Metadata.ICursor;
    let value: JSONValue;

    beforeEach(() => {
      value = 'hi';
      cursor = new Metadata.Cursor({
        name: 'foo',
        read: name => {
          return value;
        },
        write: (name, newValue) => {
          value = newValue;
        }
      });
    });

    afterEach(() => {
      cursor.dispose();
    });

    describe('#constructor', () => {

      it('should create a metadata cursor', () => {
        expect(cursor).to.be.a(Metadata.Cursor);
      });

    });

    describe('#name', () => {

      it('should be the name of the metadata key', () => {
        expect(cursor.name).to.be('foo');
      });

    });

    describe('#isDisposed', () => {

      it('should test whether the cursor is disposed', () => {
        expect(cursor.isDisposed).to.be(false);
        cursor.dispose();
        expect(cursor.isDisposed).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources used by the cursor', () => {
        cursor.dispose();
        expect(cursor.isDisposed).to.be(true);
        cursor.dispose();
        expect(cursor.isDisposed).to.be(true);
      });

    });

    describe('#getValue()', () => {

      it('should get the value of the cursor data', () => {
        expect(cursor.getValue()).to.be('hi');
      });

    });

    describe('#setValue()', () => {

      it('should set the value of the cursor data', () => {
        cursor.setValue(1);
        expect(cursor.getValue()).to.be(1);
      });

    });

  });

  describe('Metadata.ChangeMessage', () => {

    describe('#constructor()', () => {

      it('should create a new message', () => {
        let message = new Metadata.ChangeMessage({
          name: 'foo',
          oldValue: 1,
          newValue: 2
        });
        expect(message).to.be.a(Metadata.ChangeMessage);
      });

    });

    describe('#args', () => {

      it('should be the args of the message', () => {
        let args: Metadata.ChangedArgs = {
          name: 'foo',
          oldValue: void 0,
          newValue: 'hi'
        };
        let message = new Metadata.ChangeMessage(args);
        expect(message.args).to.be(args);
      });

    });

  });

  describe('Metadata.Editor', () => {

    describe('#constructor', () => {

    });

    describe('#textAreaNode', () => {

    });

    describe('#revertButtonNode', () => {

    });

    describe('#commitButtonNode', () => {

    });

    describe('#owner', () => {

    });

    describe('#isDirty', () => {

    });

    describe('#processMessage()', () => {

    });

    describe('#handleEvent()', () => {

      context('input', () => {

      });

      context('blur', () => {

      });

      context('click', () => {

      });

    });

    describe('#onAfterAttach()', () => {

    });

    describe('#onBeforeDetach()', () => {

    });

    describe('#onMetadataChanged', () => {

    });

  });

});
