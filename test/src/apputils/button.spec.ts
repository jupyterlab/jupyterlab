// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect
} from 'chai';

import {
  h, VirtualNode, VirtualText, VirtualElement
} from '@phosphor/virtualdom';

import {
  button
} from '@jupyterlab/apputils';


describe('@jupyterlab/apputils', () => {

  describe('#button', () => {

    it('should have the base classes', () => {
        let b = button({ onClick: () => {}});
        expect(b).to.have.property('attrs').to.have.property('className').to.equal('jp-button');
        expect(b.children[0]).to.have.property('attrs').to.have.property('className').to.equal('jp-button-icon');
        expect(b.children[1]).to.have.property('attrs').to.have.property('className').to.equal('jp-button-label');
    });

    it('should have the extra classes', () => {
        let b = button({
          onClick: () => {},
          className: 'jp-button-fancy',
          iconClass: 'jp-button-closeIcon'
        });
        expect(b).to.have.property('attrs').to.have.property('className').to.equal('jp-button jp-button-fancy');
        expect(b.children[0]).to.have.property('attrs').to.have.property('className').to.equal('jp-button-icon jp-button-closeIcon');
    });

    it('should have the title and label', () => {
        let b = button({ onClick: () => {}, tooltip: 'ButtonTooltip', label: 'MyButton'});
        expect(b).to.have.property('attrs').to.have.property('title').to.equal('ButtonTooltip');
        let vtext = ((b.children[1] as VirtualElement).children[0] as VirtualText);
        expect(vtext.content).to.equal('MyButton');
    });

  });

});
