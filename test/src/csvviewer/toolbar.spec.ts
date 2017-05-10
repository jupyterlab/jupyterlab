// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Widget
} from '@phosphor/widgets';

import {
  simulate
} from 'simulate-event';

import {
  CSVToolbar, DELIMITERS
} from '@jupyterlab/csvwidget';


describe('csvwidget/toolbar', () => {

  describe('CSVToolbar', () => {

    describe('#constructor()', () => {

      it('should instantiate a `CSVToolbar`', () => {
        let toolbar = new CSVToolbar();
        expect(toolbar).to.be.a(CSVToolbar);
        expect(toolbar.node.classList).to.contain('jp-CSVToolbar');
        toolbar.dispose();
      });

      it('should allow pre-selecting the delimiter', () => {
        let wanted = DELIMITERS[DELIMITERS.length - 1];
        let toolbar = new CSVToolbar({ selected: wanted });
        expect(toolbar.selectNode.value).to.be(wanted);
        toolbar.dispose();
      });

    });

    describe('#delimiterChanged', () => {

      it('should emit a value when the dropdown value changes', () => {
        let toolbar = new CSVToolbar();
        let delimiter = '';
        let index = DELIMITERS.length - 1;
        let wanted = DELIMITERS[index];
        toolbar.delimiterChanged.connect((s, value) => { delimiter = value; });
        Widget.attach(toolbar, document.body);
        toolbar.selectNode.selectedIndex = index;
        simulate(toolbar.selectNode, 'change');
        expect(delimiter).to.be(wanted);
        toolbar.dispose();
      });

    });

    describe('#selectNode', () => {

      it('should return the delimiter dropdown select tag', () => {
        let toolbar = new CSVToolbar();
        expect(toolbar.selectNode.tagName.toLowerCase()).to.be('select');
        toolbar.dispose();
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the widget', () => {
        let toolbar = new CSVToolbar();
        expect(toolbar.isDisposed).to.be(false);
        toolbar.dispose();
        expect(toolbar.isDisposed).to.be(true);
      });

      it('should be safe to call multiple times', () => {
        let toolbar = new CSVToolbar();
        expect(toolbar.isDisposed).to.be(false);
        toolbar.dispose();
        toolbar.dispose();
        expect(toolbar.isDisposed).to.be(true);
      });

    });

  });

});
