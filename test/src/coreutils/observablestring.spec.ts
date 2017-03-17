// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ObservableString 
} from '@jupyterlab/coreutils';


describe('common/ObservableString', () => {

  describe('ObservableString', () => {

    describe('#constructor()', () => {

      it('should accept no arguments', () => {
        let value = new ObservableString();
        expect(value instanceof ObservableString).to.be(true);
      });

      it('should accept a string argument', () => {
        let value = new ObservableString("hello");
        expect(value instanceof ObservableString).to.be(true);
      });

      it('should initialize the string value', () => {
        let value = new ObservableString("hello");
        expect(value.text).to.eql("hello");
      });

    });

    describe('#changed', () => {

      it('should be emitted when the string changes', () => {
        let called = false;
        let value = new ObservableString();
        value.changed.connect(() => { called = true; });
        value.text = "change";
        expect(called).to.be(true);
      });

      it('should have value changed args', () => {
        let called = false;
        let value = new ObservableString();
        value.changed.connect((sender, args) => {
          expect(sender).to.be(value);
          expect(args.type).to.be('set');
          expect(args.start).to.be(0);
          expect(args.end).to.be(3);
          expect(args.value).to.be('new');
          called = true;
        });
        value.text = 'new';
        expect(called).to.be(true);
      });

    });

    describe('#isDisposed', () => {

      it('should test whether the string is disposed', () => {
        let value = new ObservableString();
        expect(value.isDisposed).to.be(false);
        value.dispose();
        expect(value.isDisposed).to.be(true);
      });

    });

    describe('#setter()', () => {

      it('should set the item at a specific index', () => {
        let value = new ObservableString('old');
        value.text = 'new';
        expect(value.text).to.eql('new');
      });

      it('should trigger a changed signal', () => {
        let called = false;
        let value = new ObservableString('old');
        value.changed.connect((sender, args) => {
          expect(sender).to.be(value);
          expect(args.type).to.be('set');
          expect(args.start).to.be(0);
          expect(args.end).to.be(3);
          expect(args.value).to.be('new');
          called = true;
        });
        value.text = 'new';
        expect(called).to.be(true);
      });

    });

    describe('#insert()', () => {

      it('should insert an substring into the string at a specific index', () => {
        let value = new ObservableString('one three');
        value.insert(4, 'two ');
        expect(value.text).to.eql('one two three');
      });

      it('should trigger a changed signal', () => {
        let called = false;
        let value = new ObservableString('one three');
        value.changed.connect((sender, args) => {
          expect(sender).to.be(value);
          expect(args.type).to.be('insert');
          expect(args.start).to.be(4);
          expect(args.end).to.be(8);
          expect(args.value).to.be('two ');
          called = true;
        });
        value.insert(4, 'two ');
        expect(called).to.be(true);
      });

    });

    describe('#remove()', () => {

      it('should remove a substring from the string', () => {
        let value = new ObservableString('one two two three');
        value.remove(4,8);
        expect(value.text).to.eql('one two three');
      });

      it('should trigger a changed signal', () => {
        let called = false;
        let value = new ObservableString('one two two three');
        value.changed.connect((sender, args) => {
          expect(sender).to.be(value);
          expect(args.type).to.be('remove');
          expect(args.start).to.be(4);
          expect(args.end).to.be(8);
          expect(args.value).to.be('two ');
          called = true;
        });
        value.remove(4,8);
        expect(called).to.be(true);
      });

    });

    describe('#clear()', () => {

      it('should empty the string', () => {
        let value = new ObservableString('full');
        value.clear();
        expect(value.text.length).to.be(0);
        expect(value.text).to.be('');
      });

      it('should trigger a changed signal', () => {
        let called = false;
        let value = new ObservableString('full');
        value.changed.connect((sender, args) => {
          expect(sender).to.be(value);
          expect(args.type).to.be('set');
          expect(args.start).to.be(0);
          expect(args.end).to.be(0);
          expect(args.value).to.be('');
          called = true;
        });
        value.clear();
        expect(called).to.be(true);
      });

    });

  });

});
