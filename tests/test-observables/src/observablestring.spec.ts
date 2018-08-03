// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { ObservableString } from '@jupyterlab/observables';

describe('@jupyterlab/observables', () => {
  describe('ObservableString', () => {
    describe('#constructor()', () => {
      it('should accept no arguments', () => {
        const value = new ObservableString();
        expect(value instanceof ObservableString).to.equal(true);
      });

      it('should accept a string argument', () => {
        const value = new ObservableString('hello');
        expect(value instanceof ObservableString).to.equal(true);
      });

      it('should initialize the string value', () => {
        const value = new ObservableString('hello');
        expect(value.text).to.deep.equal('hello');
      });
    });

    describe('#type', () => {
      it('should return `String`', () => {
        const value = new ObservableString();
        expect(value.type).to.equal('String');
      });
    });

    describe('#changed', () => {
      it('should be emitted when the string changes', () => {
        let called = false;
        const value = new ObservableString();
        value.changed.connect(() => {
          called = true;
        });
        value.text = 'change';
        expect(called).to.equal(true);
      });

      it('should have value changed args', () => {
        let called = false;
        const value = new ObservableString();
        value.changed.connect((sender, args) => {
          expect(sender).to.equal(value);
          expect(args.type).to.equal('set');
          expect(args.start).to.equal(0);
          expect(args.end).to.equal(3);
          expect(args.value).to.equal('new');
          called = true;
        });
        value.text = 'new';
        expect(called).to.equal(true);
      });
    });

    describe('#isDisposed', () => {
      it('should test whether the string is disposed', () => {
        const value = new ObservableString();
        expect(value.isDisposed).to.equal(false);
        value.dispose();
        expect(value.isDisposed).to.equal(true);
      });
    });

    describe('#setter()', () => {
      it('should set the item at a specific index', () => {
        const value = new ObservableString('old');
        value.text = 'new';
        expect(value.text).to.deep.equal('new');
      });

      it('should trigger a changed signal', () => {
        let called = false;
        const value = new ObservableString('old');
        value.changed.connect((sender, args) => {
          expect(sender).to.equal(value);
          expect(args.type).to.equal('set');
          expect(args.start).to.equal(0);
          expect(args.end).to.equal(3);
          expect(args.value).to.equal('new');
          called = true;
        });
        value.text = 'new';
        expect(called).to.equal(true);
      });
    });

    describe('#insert()', () => {
      it('should insert an substring into the string at a specific index', () => {
        const value = new ObservableString('one three');
        value.insert(4, 'two ');
        expect(value.text).to.deep.equal('one two three');
      });

      it('should trigger a changed signal', () => {
        let called = false;
        const value = new ObservableString('one three');
        value.changed.connect((sender, args) => {
          expect(sender).to.equal(value);
          expect(args.type).to.equal('insert');
          expect(args.start).to.equal(4);
          expect(args.end).to.equal(8);
          expect(args.value).to.equal('two ');
          called = true;
        });
        value.insert(4, 'two ');
        expect(called).to.equal(true);
      });
    });

    describe('#remove()', () => {
      it('should remove a substring from the string', () => {
        const value = new ObservableString('one two two three');
        value.remove(4, 8);
        expect(value.text).to.deep.equal('one two three');
      });

      it('should trigger a changed signal', () => {
        let called = false;
        const value = new ObservableString('one two two three');
        value.changed.connect((sender, args) => {
          expect(sender).to.equal(value);
          expect(args.type).to.equal('remove');
          expect(args.start).to.equal(4);
          expect(args.end).to.equal(8);
          expect(args.value).to.equal('two ');
          called = true;
        });
        value.remove(4, 8);
        expect(called).to.equal(true);
      });
    });

    describe('#clear()', () => {
      it('should empty the string', () => {
        const value = new ObservableString('full');
        value.clear();
        expect(value.text.length).to.equal(0);
        expect(value.text).to.equal('');
      });

      it('should trigger a changed signal', () => {
        let called = false;
        const value = new ObservableString('full');
        value.changed.connect((sender, args) => {
          expect(sender).to.equal(value);
          expect(args.type).to.equal('set');
          expect(args.start).to.equal(0);
          expect(args.end).to.equal(0);
          expect(args.value).to.equal('');
          called = true;
        });
        value.clear();
        expect(called).to.equal(true);
      });
    });
  });
});
