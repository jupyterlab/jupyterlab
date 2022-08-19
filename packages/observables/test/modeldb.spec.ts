// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ModelDB,
  ObservableJSON,
  ObservableString,
  ObservableUndoableList,
  ObservableValue
} from '@jupyterlab/observables';
import { JSONExt } from '@lumino/coreutils';

describe('@jupyterlab/observables', () => {
  describe('ObservableValue', () => {
    describe('#constructor', () => {
      it('should accept no arguments', () => {
        const value = new ObservableValue();
        expect(value instanceof ObservableValue).toBe(true);
        expect(value.get()).toBeNull();
      });

      it('should accept an initial JSON value', () => {
        const value = new ObservableValue('value');
        expect(value instanceof ObservableValue).toBe(true);
        const value2 = new ObservableValue({ one: 'one', two: 2 });
        expect(value2 instanceof ObservableValue).toBe(true);
      });
    });

    describe('#type', () => {
      it('should return `Value`', () => {
        const value = new ObservableValue();
        expect(value.type).toBe('Value');
      });
    });

    describe('#isDisposed', () => {
      it('should test whether the value is disposed', () => {
        const value = new ObservableValue();
        expect(value.isDisposed).toBe(false);
        value.dispose();
        expect(value.isDisposed).toBe(true);
      });
    });

    describe('#changed', () => {
      it('should be emitted when the map changes state', () => {
        let called = false;
        const value = new ObservableValue();
        value.changed.connect(() => {
          called = true;
        });
        value.set('set');
        expect(called).toBe(true);
      });

      it('should have value changed args', () => {
        let called = false;
        const value = new ObservableValue();
        value.changed.connect((sender, args) => {
          expect(sender).toBe(value);
          expect(args.newValue).toBe('set');
          expect(args.oldValue).toBeNull();
          called = true;
        });
        value.set('set');
        expect(called).toBe(true);
      });
    });

    describe('#get', () => {
      it('should get the value of the object', () => {
        const value = new ObservableValue('value');
        expect(value.get()).toBe('value');
        const value2 = new ObservableValue({ one: 'one', two: 2 });
        expect(JSONExt.deepEqual(value2.get(), { one: 'one', two: 2 })).toBe(
          true
        );
      });
    });

    describe('#set', () => {
      it('should set the value of the object', () => {
        const value = new ObservableValue();
        value.set('value');
        expect(value.get()).toBe('value');
      });
    });
  });

  describe('ModelDB', () => {
    describe('#constructor()', () => {
      it('should accept no arguments', () => {
        const db = new ModelDB();
        expect(db instanceof ModelDB).toBe(true);
      });

      it('should accept a basePath', () => {
        const db = new ModelDB({ basePath: 'base' });
        expect(db instanceof ModelDB).toBe(true);
      });

      it('should accept a baseDB', () => {
        const base = new ModelDB();
        const db = new ModelDB({ baseDB: base });
        expect(db instanceof ModelDB).toBe(true);
      });
    });

    describe('#isDisposed', () => {
      it('should test whether it is disposed', () => {
        const db = new ModelDB();
        expect(db.isDisposed).toBe(false);
        db.dispose();
        expect(db.isDisposed).toBe(true);
      });
    });

    describe('#basePath', () => {
      it('should return an empty string for a model without a baseDB', () => {
        const db = new ModelDB();
        expect(db.basePath).toBe('');
      });

      it('should return the base path', () => {
        const db = new ModelDB({ basePath: 'base' });
        expect(db.basePath).toBe('base');
      });
    });

    describe('#isPrepopulated', () => {
      it('should return false for an in-memory database', () => {
        const db = new ModelDB();
        expect(db.isPrepopulated).toBe(false);
      });
    });

    describe('#isCollaborative', () => {
      it('should return false for an in-memory database', () => {
        const db = new ModelDB();
        expect(db.isCollaborative).toBe(false);
      });
    });

    describe('#connected', () => {
      it('should resolve immediately for an in-memory database', async () => {
        const db = new ModelDB();
        await expect(db.connected).resolves.not.toThrow();
      });
    });

    describe('#get', () => {
      it('should get a value that exists at a path', () => {
        const db = new ModelDB();
        const value = db.createValue('value');
        const value2 = db.get('value');
        expect(value2).toBe(value);
      });

      it('should return undefined for a value that does not exist', () => {
        const db = new ModelDB();
        expect(db.get('value')).toBeUndefined();
      });
    });

    describe('#has', () => {
      it('should return true if a value exists at a path', () => {
        const db = new ModelDB();
        db.createValue('value');
        expect(db.has('value')).toBe(true);
      });

      it('should return false for a value that does not exist', () => {
        const db = new ModelDB();
        expect(db.has('value')).toBe(false);
      });
    });

    describe('#createString', () => {
      it('should create an ObservableString`', () => {
        const db = new ModelDB();
        const str = db.createString('str');
        expect(str instanceof ObservableString).toBe(true);
      });

      it('should be able to retrieve that string using `get`', () => {
        const db = new ModelDB();
        const str = db.createString('str');
        expect(db.get('str')).toBe(str);
      });
    });

    describe('#createList', () => {
      it('should create an ObservableUndoableList`', () => {
        const db = new ModelDB();
        const str = db.createList('vec');
        expect(str instanceof ObservableUndoableList).toBe(true);
      });

      it('should be able to retrieve that vector using `get`', () => {
        const db = new ModelDB();
        const vec = db.createList('vec');
        expect(db.get('vec')).toBe(vec);
      });
    });

    describe('#createMap', () => {
      it('should create an ObservableMap`', () => {
        const db = new ModelDB();
        const map = db.createMap('map');
        expect(map instanceof ObservableJSON).toBe(true);
      });

      it('should be able to retrieve that map using `get`', () => {
        const db = new ModelDB();
        const map = db.createMap('map');
        expect(db.get('map')).toBe(map);
      });
    });

    describe('#createValue', () => {
      it('should create an ObservableValue`', () => {
        const db = new ModelDB();
        const value = db.createValue('value');
        expect(value instanceof ObservableValue).toBe(true);
      });

      it('should be able to retrieve that value using `get`', () => {
        const db = new ModelDB();
        const value = db.createString('value');
        expect(db.get('value')).toBe(value);
      });
    });

    describe('#setValue', () => {
      it('should set a value at a path', () => {
        const db = new ModelDB();
        const value = db.createValue('value');
        db.setValue('value', 'set');
        expect(value.get()).toBe('set');
      });
    });

    describe('#getValue', () => {
      it('should get a value at a path', () => {
        const db = new ModelDB();
        const value = db.createValue('value');
        value.set('set');
        expect(db.getValue('value')).toBe('set');
      });
    });

    describe('#view', () => {
      it('should should return a ModelDB', () => {
        const db = new ModelDB();
        const view = db.view('');
        expect(view instanceof ModelDB).toBe(true);
        expect(view === db).toBe(false);
      });

      it('should set the baseDB path on the view', () => {
        const db = new ModelDB();
        const view = db.view('base');
        expect(view.basePath).toBe('base');
      });

      it('should return a view onto the base ModelDB', () => {
        const db = new ModelDB();
        const view = db.view('base');

        db.createString('base.str1');
        expect(db.get('base.str1')).toBe(view.get('str1'));

        view.createString('str2');
        expect(db.get('base.str2')).toBe(view.get('str2'));
      });

      it('should be stackable', () => {
        const db = new ModelDB();
        const view = db.view('one');
        const viewView = view.view('two');

        expect(view.basePath).toBe('one');
        expect(viewView.basePath).toBe('two');

        viewView.createString('str');
        expect(viewView.get('str')).toBe(view.get('two.str'));
        expect(viewView.get('str')).toBe(db.get('one.two.str'));
      });
    });

    describe('#dispose', () => {
      it('should dispose of the resources used by the model', () => {
        const db = new ModelDB();
        const str = db.createString('str');
        const view = db.view('base');
        const str2 = view.createString('str');
        expect(db.isDisposed).toBe(false);
        expect(str.isDisposed).toBe(false);
        expect(view.isDisposed).toBe(false);
        expect(str2.isDisposed).toBe(false);
        db.dispose();
        expect(db.isDisposed).toBe(true);
        expect(str.isDisposed).toBe(true);
        expect(view.isDisposed).toBe(true);
        expect(str2.isDisposed).toBe(true);
      });

      it('should not dispose of resources in base databases', () => {
        const db = new ModelDB();
        const view = db.view('base');
        const str = db.createString('str');
        const str2 = view.createString('str');
        expect(db.isDisposed).toBe(false);
        expect(str.isDisposed).toBe(false);
        expect(view.isDisposed).toBe(false);
        expect(str2.isDisposed).toBe(false);
        view.dispose();
        expect(view.isDisposed).toBe(true);
        expect(str2.isDisposed).toBe(true);
        expect(db.isDisposed).toBe(false);
        expect(str.isDisposed).toBe(false);
      });

      it('should be safe to call more than once', () => {
        const db = new ModelDB();
        expect(db.isDisposed).toBe(false);
        db.dispose();
        expect(db.isDisposed).toBe(true);
      });
    });
  });
});
