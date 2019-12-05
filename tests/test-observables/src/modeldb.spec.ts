// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { JSONExt } from '@lumino/coreutils';

import {
  ModelDB,
  ObservableString,
  ObservableValue,
  ObservableUndoableList,
  ObservableJSON
} from '@jupyterlab/observables';

describe('@jupyterlab/observables', () => {
  describe('ObservableValue', () => {
    describe('#constructor', () => {
      it('should accept no arguments', () => {
        const value = new ObservableValue();
        expect(value instanceof ObservableValue).to.equal(true);
        expect(value.get()).to.be.null;
      });

      it('should accept an initial JSON value', () => {
        const value = new ObservableValue('value');
        expect(value instanceof ObservableValue).to.equal(true);
        const value2 = new ObservableValue({ one: 'one', two: 2 });
        expect(value2 instanceof ObservableValue).to.equal(true);
      });
    });

    describe('#type', () => {
      it('should return `Value`', () => {
        const value = new ObservableValue();
        expect(value.type).to.equal('Value');
      });
    });

    describe('#isDisposed', () => {
      it('should test whether the value is disposed', () => {
        const value = new ObservableValue();
        expect(value.isDisposed).to.equal(false);
        value.dispose();
        expect(value.isDisposed).to.equal(true);
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
        expect(called).to.equal(true);
      });

      it('should have value changed args', () => {
        let called = false;
        const value = new ObservableValue();
        value.changed.connect((sender, args) => {
          expect(sender).to.equal(value);
          expect(args.newValue).to.equal('set');
          expect(args.oldValue).to.be.null;
          called = true;
        });
        value.set('set');
        expect(called).to.equal(true);
      });
    });

    describe('#get', () => {
      it('should get the value of the object', () => {
        const value = new ObservableValue('value');
        expect(value.get()).to.equal('value');
        const value2 = new ObservableValue({ one: 'one', two: 2 });
        expect(
          JSONExt.deepEqual(value2.get(), { one: 'one', two: 2 })
        ).to.equal(true);
      });
    });

    describe('#set', () => {
      it('should set the value of the object', () => {
        const value = new ObservableValue();
        value.set('value');
        expect(value.get()).to.equal('value');
      });
    });
  });

  describe('ModelDB', () => {
    describe('#constructor()', () => {
      it('should accept no arguments', () => {
        const db = new ModelDB();
        expect(db instanceof ModelDB).to.equal(true);
      });

      it('should accept a basePath', () => {
        const db = new ModelDB({ basePath: 'base' });
        expect(db instanceof ModelDB).to.equal(true);
      });

      it('should accept a baseDB', () => {
        const base = new ModelDB();
        const db = new ModelDB({ baseDB: base });
        expect(db instanceof ModelDB).to.equal(true);
      });
    });

    describe('#isDisposed', () => {
      it('should test whether it is disposed', () => {
        const db = new ModelDB();
        expect(db.isDisposed).to.equal(false);
        db.dispose();
        expect(db.isDisposed).to.equal(true);
      });
    });

    describe('#basePath', () => {
      it('should return an empty string for a model without a baseDB', () => {
        const db = new ModelDB();
        expect(db.basePath).to.equal('');
      });

      it('should return the base path', () => {
        const db = new ModelDB({ basePath: 'base' });
        expect(db.basePath).to.equal('base');
      });
    });

    describe('#isPrepopulated', () => {
      it('should return false for an in-memory database', () => {
        const db = new ModelDB();
        expect(db.isPrepopulated).to.equal(false);
      });
    });

    describe('#isCollaborative', () => {
      it('should return false for an in-memory database', () => {
        const db = new ModelDB();
        expect(db.isCollaborative).to.equal(false);
      });
    });

    describe('#connected', () => {
      it('should resolve immediately for an in-memory database', () => {
        const db = new ModelDB();
        return db.connected;
      });
    });

    describe('#get', () => {
      it('should get a value that exists at a path', () => {
        const db = new ModelDB();
        const value = db.createValue('value');
        const value2 = db.get('value');
        expect(value2).to.equal(value);
      });

      it('should return undefined for a value that does not exist', () => {
        const db = new ModelDB();
        expect(db.get('value')).to.be.undefined;
      });
    });

    describe('#has', () => {
      it('should return true if a value exists at a path', () => {
        const db = new ModelDB();
        db.createValue('value');
        expect(db.has('value')).to.equal(true);
      });

      it('should return false for a value that does not exist', () => {
        const db = new ModelDB();
        expect(db.has('value')).to.equal(false);
      });
    });

    describe('#createString', () => {
      it('should create an ObservableString`', () => {
        const db = new ModelDB();
        const str = db.createString('str');
        expect(str instanceof ObservableString).to.equal(true);
      });

      it('should be able to retrieve that string using `get`', () => {
        const db = new ModelDB();
        const str = db.createString('str');
        expect(db.get('str')).to.equal(str);
      });
    });

    describe('#createList', () => {
      it('should create an ObservableUndoableList`', () => {
        const db = new ModelDB();
        const str = db.createList('vec');
        expect(str instanceof ObservableUndoableList).to.equal(true);
      });

      it('should be able to retrieve that vector using `get`', () => {
        const db = new ModelDB();
        const vec = db.createList('vec');
        expect(db.get('vec')).to.equal(vec);
      });
    });

    describe('#createMap', () => {
      it('should create an ObservableMap`', () => {
        const db = new ModelDB();
        const map = db.createMap('map');
        expect(map instanceof ObservableJSON).to.equal(true);
      });

      it('should be able to retrieve that map using `get`', () => {
        const db = new ModelDB();
        const map = db.createMap('map');
        expect(db.get('map')).to.equal(map);
      });
    });

    describe('#createValue', () => {
      it('should create an ObservableValue`', () => {
        const db = new ModelDB();
        const value = db.createValue('value');
        expect(value instanceof ObservableValue).to.equal(true);
      });

      it('should be able to retrieve that value using `get`', () => {
        const db = new ModelDB();
        const value = db.createString('value');
        expect(db.get('value')).to.equal(value);
      });
    });

    describe('#setValue', () => {
      it('should set a value at a path', () => {
        const db = new ModelDB();
        const value = db.createValue('value');
        db.setValue('value', 'set');
        expect(value.get()).to.equal('set');
      });
    });

    describe('#getValue', () => {
      it('should get a value at a path', () => {
        const db = new ModelDB();
        const value = db.createValue('value');
        value.set('set');
        expect(db.getValue('value')).to.equal('set');
      });
    });

    describe('#view', () => {
      it('should should return a ModelDB', () => {
        const db = new ModelDB();
        const view = db.view('');
        expect(view instanceof ModelDB).to.equal(true);
        expect(view === db).to.equal(false);
      });

      it('should set the baseDB path on the view', () => {
        const db = new ModelDB();
        const view = db.view('base');
        expect(view.basePath).to.equal('base');
      });

      it('should return a view onto the base ModelDB', () => {
        const db = new ModelDB();
        const view = db.view('base');

        db.createString('base.str1');
        expect(db.get('base.str1')).to.equal(view.get('str1'));

        view.createString('str2');
        expect(db.get('base.str2')).to.equal(view.get('str2'));
      });

      it('should be stackable', () => {
        const db = new ModelDB();
        const view = db.view('one');
        const viewView = view.view('two');

        expect(view.basePath).to.equal('one');
        expect(viewView.basePath).to.equal('two');

        viewView.createString('str');
        expect(viewView.get('str')).to.equal(view.get('two.str'));
        expect(viewView.get('str')).to.equal(db.get('one.two.str'));
      });
    });

    describe('#dispose', () => {
      it('should dispose of the resources used by the model', () => {
        const db = new ModelDB();
        const str = db.createString('str');
        const view = db.view('base');
        const str2 = view.createString('str');
        expect(db.isDisposed).to.equal(false);
        expect(str.isDisposed).to.equal(false);
        expect(view.isDisposed).to.equal(false);
        expect(str2.isDisposed).to.equal(false);
        db.dispose();
        expect(db.isDisposed).to.equal(true);
        expect(str.isDisposed).to.equal(true);
        expect(view.isDisposed).to.equal(true);
        expect(str2.isDisposed).to.equal(true);
      });

      it('should not dispose of resources in base databases', () => {
        const db = new ModelDB();
        const view = db.view('base');
        const str = db.createString('str');
        const str2 = view.createString('str');
        expect(db.isDisposed).to.equal(false);
        expect(str.isDisposed).to.equal(false);
        expect(view.isDisposed).to.equal(false);
        expect(str2.isDisposed).to.equal(false);
        view.dispose();
        expect(view.isDisposed).to.equal(true);
        expect(str2.isDisposed).to.equal(true);
        expect(db.isDisposed).to.equal(false);
        expect(str.isDisposed).to.equal(false);
      });

      it('should be safe to call more than once', () => {
        const db = new ModelDB();
        expect(db.isDisposed).to.equal(false);
        db.dispose();
        expect(db.isDisposed).to.equal(true);
      });
    });
  });
});
