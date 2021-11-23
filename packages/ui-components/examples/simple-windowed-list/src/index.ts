// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module example-simple-list
 */

import { PageConfig, URLExt } from '@jupyterlab/coreutils';
(window as any).__webpack_public_path__ = URLExt.join(
  PageConfig.getBaseUrl(),
  'example/'
);

import '@jupyterlab/application/style/index.css';
import '@jupyterlab/theme-light-extension/style/theme.css';
import '../index.css';

import { WindowedList, WindowedListModel } from '@jupyterlab/ui-components';

import { Widget } from '@lumino/widgets';
import { Message } from '@lumino/messaging';

function getRandomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

class ContentWidget extends Widget {
  static createNode(): HTMLElement {
    let node = document.createElement('div');
    node.style.minHeight = `${90 + getRandomInt(100)}px`;
    node.insertAdjacentHTML(
      'afterbegin',
      '<div><label></label><textarea placeholder="Placeholder..."></textarea><div><button>+</button><button>-</button></div></div>'
    );
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
    this.addButton = this.node.getElementsByTagName('button')[0];
    this.removeButton = this.node.getElementsByTagName('button')[1];
    this.textarea = this.node.getElementsByTagName('textarea')[0];
  }

  handleEvent(event: Event): void {
    switch (event.type) {
      case 'click':
        this.onClick(event as MouseEvent);
        break;

      case 'input':
        this.onInput(event);
        break;

      default:
        break;
    }
  }

  protected onAfterAttach(msg: Message): void {
    this.addButton.addEventListener('click', this);
    this.removeButton.addEventListener('click', this);
    this.textarea.addEventListener('input', this);
    super.onAfterAttach(msg);
  }

  protected onBeforeAttach(msg: Message): void {
    this.addButton.removeEventListener('click', this);
    this.removeButton.removeEventListener('click', this);
    this.textarea.removeEventListener('input', this);
    super.onBeforeAttach(msg);
  }

  protected onClick(event: MouseEvent): void {
    if (event.currentTarget === this.addButton) {
      this.node.insertAdjacentHTML(
        'beforeend',
        `<div class="output" style="min-height:${getRandomInt(
          200
        )}px;">Dummy output</div>`
      );
    } else {
      this.node.getElementsByClassName('output')[0].remove();
    }

    event.stopPropagation();
  }

  protected onInput(event: Event): void {
    this.textarea.style.height = `${Math.max(
      this.textarea.getBoundingClientRect().height,
      this.textarea.scrollHeight
    )}px`;

    event.stopPropagation();
  }

  // get inputNode(): HTMLInputElement {
  //   return this.node.getElementsByTagName('input')[0] as HTMLInputElement;
  // }

  // protected onActivateRequest(msg: Message): void {
  //   if (this.isAttached) {
  //     this.inputNode.focus();
  //   }
  // }

  protected addButton: HTMLButtonElement;
  protected removeButton: HTMLButtonElement;
  protected textarea: HTMLTextAreaElement;
}

class MyList extends WindowedListModel {
  constructor(nItems: number) {
    super({ count: nItems });
    this.models = [];
  }

  widgetRenderer = (i: number): Widget => {
    let widget = this.widgetsCache.get(this.models[i]);
    if (!widget) {
      widget = new ContentWidget(`item-${i}`);
      this.widgetsCache.set(this.models[i], widget);
    }
    return widget;
  };

  estimateWidgetHeight = (index: number | null): number => {
    return 90;
  };

  models: Array<{ index: number }>;
  private widgetsCache = new WeakMap<{ index: number }, Widget>();
}

function main(): void {
  const nItems = 1000;
  const model = new MyList(nItems);
  setModels(nItems);

  const panel = new WindowedList({
    model
  });
  panel.id = 'main';

  const inputs = document.createElement('div');
  inputs.insertAdjacentHTML(
    'afterbegin',
    `<label>Number of items:</label><input type="number"></input><br/><label>Overscan items:<input type="number"></input><br/><label>Windowing:</label><input type="checkbox"></input><br/>`
  );
  const [count, overscan, windowing] = Array.from(
    inputs.querySelectorAll('input')
  );
  count.value = `${nItems}`;
  count.addEventListener('change', ev => {
    const count = parseInt((ev.target! as HTMLInputElement).value, 10);
    model.widgetCount = count;
    console.log(`Set count to ${model.widgetCount}`);

    setModels(count);
  });
  overscan.addEventListener('change', ev => {
    model.overscanCount = parseInt((ev.target! as HTMLInputElement).value, 10);
    console.log(`Set overscan count to ${model.overscanCount}`);
  });
  overscan.value = '1';
  overscan.addEventListener('change', ev => {
    model.overscanCount = parseInt((ev.target! as HTMLInputElement).value, 10);
    console.log(`Set overscan count to ${model.overscanCount}`);
  });
  windowing.addEventListener('change', ev => {
    model.windowingActive = (ev.target! as HTMLInputElement).checked;
  });
  windowing.checked = true;
  document.body.insertAdjacentElement('afterbegin', inputs);

  // Attach the panel to the DOM.
  Widget.attach(panel, document.body);

  // Handle widget state.
  window.addEventListener('resize', () => {
    panel.update();
  });
  panel.update();

  function setModels(count: number) {
    if (count > model.models?.length ?? 0) {
      model.models = new Array<{ index: number }>(count);
      for (let i = 0; i < count; i++) {
        model.models[i] = { index: i };
      }
    }
  }
}

window.addEventListener('load', main);
