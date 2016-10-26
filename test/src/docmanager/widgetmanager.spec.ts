// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  DocumentRegistry
} from '../../../lib/docregistry';

import {
  DocumentWidgetManager
} from '../../../lib/docmanager';


describe('docmanager/widgetmanager', () => {

  let manager: DocumentWidgetManager;

  beforeEach(() => {
    manager = new DocumentWidgetManager({ registry: new DocumentRegistry() });
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('DocumentWidgetManager', () => {

    describe('#constructor()', () => {

      it('should create a new document widget manager', () => {
        expect(manager).to.be.a(DocumentWidgetManager);
      });

    });

    describe('#isDisposed', () => {

    });

    describe('#dispose()', () => {

    });

    describe('#createWidget()', () => {

    });

    describe('#adoptWidget()', () => {

    });

    describe('#findWidget()', () => {

    });

    describe('#contextForWidget()', () => {

    });

    describe('#cloneWidget()', () => {

    });

    describe('#closeWidgets()', () => {

    });

    describe('#filterMessage()', () => {

    });

    describe('#setCaption()', () => {

    });

    describe('#onClose()', () => {

    });

  });

});
