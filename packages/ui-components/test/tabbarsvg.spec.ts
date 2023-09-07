// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { TabBarSvg } from '@jupyterlab/ui-components';
import { Title, Widget } from '@lumino/widgets';
import { VirtualDOM } from '@lumino/virtualdom';

describe('.Renderer', () => {
  let title: Title<Widget>;

  beforeEach(() => {
    let owner = new Widget();
    title = new Title({
      owner,
      label: 'foo',
      closable: true,
      iconClass: 'bar',
      className: 'fizz',
      caption: 'this is a caption'
    });
  });

  describe('#renderLabel()', () => {
    it('should render the label element for a tab', () => {
      let renderer = new TabBarSvg.Renderer();
      let vNode = renderer.renderLabel({ title, current: true, zIndex: 1 });
      let label = VirtualDOM.realize(vNode);
      expect(label.className).toContain('lm-TabBar-tabLabel');
      expect(label.title).toEqual(title.label);
    });
  });
});
