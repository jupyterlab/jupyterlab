// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ObservableString } from '@jupyterlab/observables';

describe('@jupyterlab/observables', () => {
  describe('ObservableString', () => {
    describe('#constructor()', () => {
      it('should accept no arguments', () => {
        const value = new ObservableString();
        expect(value instanceof ObservableString).toBe(true);
      });

      it('should accept a string argument', () => {
        const value = new ObservableString('hello');
        expect(value instanceof ObservableString).toBe(true);
      });

      it('should initialize the string value', () => {
        const value = new ObservableString('hello');
        expect(value.text).toEqual('hello');
      });
    });

    describe('#type', () => {
      it('should return `String`', () => {
        const value = new ObservableString();
        expect(value.type).toBe('String');
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
        expect(called).toBe(true);
      });

      it('should have value changed args', () => {
        let called = false;
        const value = new ObservableString();
        value.changed.connect((sender, args) => {
          expect(sender).toBe(value);
          expect(args.type).toBe('set');
          expect(args.start).toBe(0);
          expect(args.end).toBe(3);
          expect(args.value).toBe('new');
          called = true;
        });
        value.text = 'new';
        expect(called).toBe(true);
      });
    });

    describe('#isDisposed', () => {
      it('should test whether the string is disposed', () => {
        const value = new ObservableString();
        expect(value.isDisposed).toBe(false);
        value.dispose();
        expect(value.isDisposed).toBe(true);
      });
    });

    describe('#setter()', () => {
      it('should set the item at a specific index', () => {
        const value = new ObservableString('old');
        value.text = 'new';
        expect(value.text).toEqual('new');
      });

      it('should trigger a changed signal', () => {
        let called = false;
        const value = new ObservableString('old');
        value.changed.connect((sender, args) => {
          expect(sender).toBe(value);
          expect(args.type).toBe('set');
          expect(args.start).toBe(0);
          expect(args.end).toBe(3);
          expect(args.value).toBe('new');
          called = true;
        });
        value.text = 'new';
        expect(called).toBe(true);
      });
    });

    describe('#insert()', () => {
      it('should insert an substring into the string at a specific index', () => {
        const value = new ObservableString('one three');
        value.insert(4, 'two ');
        expect(value.text).toEqual('one two three');
      });

      it('should trigger a changed signal', () => {
        let called = false;
        const value = new ObservableString('one three');
        value.changed.connect((sender, args) => {
          expect(sender).toBe(value);
          expect(args.type).toBe('insert');
          expect(args.start).toBe(4);
          expect(args.end).toBe(8);
          expect(args.value).toBe('two ');
          called = true;
        });
        value.insert(4, 'two ');
        expect(called).toBe(true);
      });
    });

    describe('#remove()', () => {
      it('should remove a substring from the string', () => {
        const value = new ObservableString('one two two three');
        value.remove(4, 8);
        expect(value.text).toEqual('one two three');
      });

      it('should trigger a changed signal', () => {
        let called = false;
        const value = new ObservableString('one two two three');
        value.changed.connect((sender, args) => {
          expect(sender).toBe(value);
          expect(args.type).toBe('remove');
          expect(args.start).toBe(4);
          expect(args.end).toBe(8);
          expect(args.value).toBe('two ');
          called = true;
        });
        value.remove(4, 8);
        expect(called).toBe(true);
      });
    });

    describe('#clear()', () => {
      it('should empty the string', () => {
        const value = new ObservableString('full');
        value.clear();
        expect(value.text.length).toBe(0);
        expect(value.text).toBe('');
      });

      it('should trigger a changed signal', () => {
        let called = false;
        const value = new ObservableString('full');
        value.changed.connect((sender, args) => {
          expect(sender).toBe(value);
          expect(args.type).toBe('set');
          expect(args.start).toBe(0);
          expect(args.end).toBe(0);
          expect(args.value).toBe('');
          called = true;
        });
        value.clear();
        expect(called).toBe(true);
      });
    });
  });
});
