// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  JSONExt
} from '@phosphor/coreutils';

import {
  ModelDB, ObservableString, ObservableValue,
  ObservableUndoableList, ObservableJSON
} from '@jupyterlab/coreutils';


describe('@jupyterlab/coreutils', () => {

  describe('ObservableValue', () => {

    describe('#constructor', () => {

      it('should accept no arguments', () => {
        let value = new ObservableValue();
        expect(value instanceof ObservableValue).to.be(true);
        expect(value.get()).to.be(null);
      });

      it('should accept an initial JSON value', () => {
        let value = new ObservableValue('value');
        expect(value instanceof ObservableValue).to.be(true);
        let value2 = new ObservableValue({ one: 'one', two: 2 });
        expect(value2 instanceof ObservableValue).to.be(true);
      });

    });

    describe('#type', () => {

      it('should return `Value`', () => {
        let value = new ObservableValue();
        expect(value.type).to.be('Value');
      });
    });

    describe('#isDisposed', () => {

      it('should test whether the value is disposed', () => {
        let value = new ObservableValue();
        expect(value.isDisposed).to.be(false);
        value.dispose();
        expect(value.isDisposed).to.be(true);
      });

    });

    describe('#changed', () => {

      it('should be emitted when the map changes state', () => {
        let called = false;
        let value = new ObservableValue();
        value.changed.connect(() => { called = true; });
        value.set('set');
        expect(called).to.be(true);
      });

      it('should have value changed args', () => {
        let called = false;
        let value = new ObservableValue();
        value.changed.connect((sender, args) => {
          expect(sender).to.be(value);
          expect(args.newValue).to.be('set');
          expect(args.oldValue).to.be(null);
          called = true;
        });
        value.set('set');
        expect(called).to.be(true);
      });

    });

    describe('#get', () => {

      it('should get the value of the object', () => {
        let value = new ObservableValue('value');
        expect(value.get()).to.be('value');
        let value2 = new ObservableValue({ one: 'one', two: 2 });
        expect(JSONExt.deepEqual(value2.get(), { one: 'one', two: 2 })).to.be(true);
      });

    });

    describe('#set', () => {

      it('should set the value of the object', () => {
        let value = new ObservableValue();
        value.set('value');
        expect(value.get()).to.be('value');
      });

    });

  });


  describe('ModelDB', () => {

    describe('#constructor()', () => {

      it('should accept no arguments', () => {
        let db = new ModelDB();
        expect(db instanceof ModelDB).to.be(true);
      });

      it('should accept a basePath', () => {
        let db = new ModelDB({ basePath: 'base' });
        expect(db instanceof ModelDB).to.be(true);
      });

      it('should accept a baseDB', () => {
        let base = new ModelDB();
        let db = new ModelDB({ baseDB: base });
        expect(db instanceof ModelDB).to.be(true);
      });

    });

    describe('#isDisposed', () => {

      it('should test whether it is disposed', () => {
        let db = new ModelDB();
        expect(db.isDisposed).to.be(false);
        db.dispose();
        expect(db.isDisposed).to.be(true);
      });

    });

    describe('#basePath', () => {

      it('should return an empty string for a model without a baseDB', () => {
        let db = new ModelDB();
        expect(db.basePath).to.be('');
      });

      it('should return the base path', () => {
        let db = new ModelDB({ basePath: 'base' });
        expect(db.basePath).to.be('base');
      });

    });

    describe('#isPrepopulated', () => {

      it('should return false for an in-memory database', () => {
        let db = new ModelDB();
        expect(db.isPrepopulated).to.be(false);
      });

    });

    describe('#isCollaborative', () => {

      it('should return false for an in-memory database', () => {
        let db = new ModelDB();
        expect(db.isCollaborative).to.be(false);
      });

    });

    describe('#connected', () => {

      it('should resolve immediately for an in-memory database', (done) => {
        let db = new ModelDB();
        db.connected.then(done);
      });

    });

    describe('#get', () => {

      it('should get a value that exists at a path', () => {
        let db = new ModelDB();
        let value = db.createValue('value');
        let value2 = db.get('value');
        expect(value2).to.be(value);
      });

      it('should return undefined for a value that does not exist', () => {
        let db = new ModelDB();
        expect(db.get('value')).to.be(undefined);
      });

    });

    describe('#has', () => {

      it('should return true if a value exists at a path', () => {
        let db = new ModelDB();
        let value = db.createValue('value');
        expect(db.has('value')).to.be(true);
      });

      it('should return false for a value that does not exist', () => {
        let db = new ModelDB();
        expect(db.has('value')).to.be(false);
      });

    });

    describe('#createString', () => {

      it('should create an ObservableString`', () => {
        let db = new ModelDB();
        let str = db.createString('str');
        expect(str instanceof ObservableString).to.be(true);
      });

      it('should be able to retrieve that string using `get`', () => {
        let db = new ModelDB();
        let str = db.createString('str');
        expect(db.get('str')).to.be(str);
      });

    });

    describe('#createList', () => {

      it('should create an ObservableUndoableList`', () => {
        let db = new ModelDB();
        let str = db.createList('vec');
        expect(str instanceof ObservableUndoableList).to.be(true);
      });

      it('should be able to retrieve that vector using `get`', () => {
        let db = new ModelDB();
        let vec = db.createList('vec');
        expect(db.get('vec')).to.be(vec);
      });

    });

    describe('#createMap', () => {

      it('should create an ObservableMap`', () => {
        let db = new ModelDB();
        let map = db.createMap('map');
        expect(map instanceof ObservableJSON).to.be(true);
      });

      it('should be able to retrieve that map using `get`', () => {
        let db = new ModelDB();
        let map = db.createMap('map');
        expect(db.get('map')).to.be(map);
      });

    });

    describe('#createValue', () => {

      it('should create an ObservableValue`', () => {
        let db = new ModelDB();
        let value = db.createValue('value');
        expect(value instanceof ObservableValue).to.be(true);
      });

      it('should be able to retrieve that value using `get`', () => {
        let db = new ModelDB();
        let value = db.createString('value');
        expect(db.get('value')).to.be(value);
      });

    });

    describe('#setValue', () => {

      it('should set a value at a path', () => {
        let db = new ModelDB();
        let value = db.createValue('value');
        db.setValue('value', 'set');
        expect(value.get()).to.be('set');
      });

    });

    describe('#getValue', () => {

      it('should get a value at a path', () => {
        let db = new ModelDB();
        let value = db.createValue('value');
        value.set('set');
        expect(db.getValue('value')).to.be('set');
      });

    });

    describe('#view', () => {

      it('should should return a ModelDB', () => {
        let db = new ModelDB();
        let view = db.view('');
        expect(view instanceof ModelDB).to.be(true);
        expect(view === db).to.be(false);
      });

      it('should set the baseDB path on the view', () => {
        let db = new ModelDB();
        let view = db.view('base');
        expect(view.basePath).to.be('base');
      });

      it('should return a view onto the base ModelDB', () => {
        let db = new ModelDB();
        let view = db.view('base');

        db.createString('base.str1');
        expect(db.get('base.str1')).to.be(view.get('str1'));

        view.createString('str2');
        expect(db.get('base.str2')).to.be(view.get('str2'));
      });

      it('should be stackable', () => {
        let db = new ModelDB();
        let view = db.view('one');
        let viewView = view.view('two');

        expect(view.basePath).to.be('one');
        expect(viewView.basePath).to.be('two');

        viewView.createString('str');
        expect(viewView.get('str')).to.be(view.get('two.str'));
        expect(viewView.get('str')).to.be(db.get('one.two.str'));
      });

    });

    describe('#dispose', () => {

      it('should dispose of the resources used by the model', () => {
        let db = new ModelDB();
        let str = db.createString('str');
        let view = db.view('base');
        let str2 = view.createString('str');
        expect(db.isDisposed).to.be(false);
        expect(str.isDisposed).to.be(false);
        expect(view.isDisposed).to.be(false);
        expect(str2.isDisposed).to.be(false);
        db.dispose();
        expect(db.isDisposed).to.be(true);
        expect(str.isDisposed).to.be(true);
        expect(view.isDisposed).to.be(true);
        expect(str2.isDisposed).to.be(true);
      });

      it('should not dispose of resources in base databases', () => {
        let db = new ModelDB();
        let view = db.view('base');
        let str = db.createString('str');
        let str2 = view.createString('str');
        expect(db.isDisposed).to.be(false);
        expect(str.isDisposed).to.be(false);
        expect(view.isDisposed).to.be(false);
        expect(str2.isDisposed).to.be(false);
        view.dispose();
        expect(view.isDisposed).to.be(true);
        expect(str2.isDisposed).to.be(true);
        expect(db.isDisposed).to.be(false);
        expect(str.isDisposed).to.be(false);
      });

      it('should be safe to call more than once', () => {
        let db = new ModelDB();
        expect(db.isDisposed).to.be(false);
        db.dispose();
        expect(db.isDisposed).to.be(true);
      });

    });

  });

});
