// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PageConfig, URLExt } from '@jupyterlab/coreutils';
(window as any).__webpack_public_path__ = URLExt.join(
  PageConfig.getBaseUrl(),
  'example/'
);

import '@jupyterlab/application/style/index.css';
import '@jupyterlab/theme-light-extension/style/theme.css';
import '../index.css';

import { WindowedPanel } from '@jupyterlab/ui-components';

import { Widget } from '@lumino/widgets';
import { Message } from '@lumino/messaging';

function getRandomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

class ContentWidget extends Widget {
  static createNode(): HTMLElement {
    let node = document.createElement('div');
    node.style.minHeight = `${getRandomInt(100)}px`;
    let content = document.createElement('div');
    content.appendChild(document.createElement('label'));
    let input = document.createElement('input');
    input.placeholder = 'Placeholder...';
    content.appendChild(input);
    node.appendChild(content);
    return node;
  }

  constructor(name: string) {
    super({ node: ContentWidget.createNode() });
    this.setFlag(Widget.Flag.DisallowLayout);
    this.addClass('content');
    this.id = name.toLowerCase();
    this.title.label = name;
    this.title.closable = true;
    this.title.caption = `Long description for: ${name}`;

    this.node.getElementsByTagName('label')[0].textContent = name;
  }

  get inputNode(): HTMLInputElement {
    return this.node.getElementsByTagName('input')[0] as HTMLInputElement;
  }

  protected onActivateRequest(msg: Message): void {
    if (this.isAttached) {
      this.inputNode.focus();
    }
  }
}

function main(): void {
  // Lay out the widgets.
  const widgetRenderer = (i: number) => new ContentWidget(`item-${i}`);
  const panel = new WindowedPanel({
    widgetCount: 1000,
    widgetRenderer,
    // Best set to the minimal height if no clue
    widgetSize: (i: number) => 40,
    estimatedWidgetSize: 50
  });
  panel.id = 'main';

  // Attach the panel to the DOM.
  Widget.attach(panel, document.body);
  // Handle widget state.
  window.addEventListener('resize', () => {
    panel.update();
  });
}

window.addEventListener('load', main);
