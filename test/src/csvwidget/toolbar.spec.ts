// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  simulate
} from 'simulate-event';

import {
  CSVToolbar, DELIMITERS
} from '../../../lib/csvwidget/toolbar';


describe('csvwidget/table', () => {

  describe('CSVToolbar', () => {

    describe('#constructor()', () => {

      it('should instantiate a `CSVToolbar`', () => {
        let toolbar = new CSVToolbar();
        expect(toolbar).to.be.a(CSVToolbar);
        expect(toolbar.node.classList).to.contain('jp-CSVToolbar');
      });

      it('should allow pre-selecting the delimiter', () => {
        let wanted = DELIMITERS[DELIMITERS.length - 1];
        let toolbar = new CSVToolbar({ selected: wanted });
        expect(toolbar.selectNode.value).to.be(wanted);
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

  });

});
