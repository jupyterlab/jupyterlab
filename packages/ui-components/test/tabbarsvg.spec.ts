// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { TabBarSvg } from '@jupyterlab/ui-components';
import { Title, Widget } from '@lumino/widgets';
import { VirtualDOM } from '@lumino/virtualdom';

describe('.Renderer', () => {
  let title: Title<Widget>;
  let renderer: TabBarSvg.Renderer;

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
    renderer = new TabBarSvg.Renderer();
  });

  describe('#renderCloseIcon()', () => {
    it('should render the close icon and check the title element matches the title', () => {
      let vNode = renderer.renderCloseIcon({
        title,
        current: true,
        zIndex: 1
      });
      let icon = VirtualDOM.realize(vNode);
      expect(icon.className).toContain('lm-TabBar-tabCloseIcon');
      expect(icon.title).toEqual('Close ' + title.label);
    });

    it('should use the tab label fallback stored in the title dataset', () => {
      title.label = '';
      title.dataset = { jpTabLabel: 'Fallback Label' };

      const vNode = renderer.renderCloseIcon({
        title,
        current: true,
        zIndex: 1
      });
      const icon = VirtualDOM.realize(vNode);

      expect(icon.title).toEqual('Close Fallback Label');
    });
  });

  describe('#renderLabel()', () => {
    it('should render the tab label fallback stored in the title dataset', () => {
      title.label = '';
      title.dataset = { jpTabLabel: 'Fallback Label' };

      const vNode = renderer.renderLabel({
        title,
        current: true,
        zIndex: 1
      });
      const label = VirtualDOM.realize(vNode);

      expect(label.textContent).toBe('Fallback Label');
    });
  });
});
