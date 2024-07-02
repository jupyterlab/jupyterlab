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
import { ObservableList } from '@jupyterlab/observables';

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

  protected addButton: HTMLButtonElement;
  protected removeButton: HTMLButtonElement;
  protected textarea: HTMLTextAreaElement;
}

class MyList extends WindowedListModel {
  constructor(itemsList: ObservableList<{ index: number }>) {
    super({ itemsList });
  }

  widgetRenderer = (i: number): Widget => {
    let widget = this.widgetsCache.get(
      (this.itemsList as ObservableList<{ index: number }>).get(i)
    );
    if (!widget) {
      widget = new ContentWidget(
        `item-${
          (this.itemsList as ObservableList<{ index: number }>).get(i).index
        }`
      );
      this.widgetsCache.set(
        (this.itemsList as ObservableList<{ index: number }>).get(i),
        widget
      );
    }
    return widget;
  };

  estimateWidgetSize = (index: number): number => {
    return 90;
  };

  private widgetsCache = new WeakMap<{ index: number }, Widget>();
}

function main(): void {
  const nItems = 1000;
  let list = createList(nItems);
  const model = new MyList(list);

  const panel = new WindowedList({
    model
  });
  panel.id = 'main';

  const inputs = document.createElement('div');
  inputs.insertAdjacentHTML(
    'afterbegin',
    `<label>Number of items:
      <input type="number"></input>
    </label>
    <br/>
    <label>Overscan items:
      <input type="number"></input>
    </label>
    <br/>
    <label>Windowing:
      <input type="checkbox"></input>
    </label>
    <br/>
    <button title="Add widget">+</button>
    <button title="Remove widget">-</button>
    <label>Widget index:
      <input type="number" minimum="0" value="0"></input>
    </label>
    <br/>
    <label>Scroll to index:
      <input type="number" minimum="0" value="0"></input>
    </label>
    <br/>
    <label>Scroll to offset:
      <input type="number" minimum="0" value="0"></input>
    </label>
    <br/>`
  );
  const [
    count,
    overscan,
    windowing,
    widgetIndexInput,
    scrollToIndex,
    scrollToOffset
  ] = Array.from(inputs.querySelectorAll('input'));
  const [addWidget, rmWidget] = Array.from(inputs.querySelectorAll('button'));

  count.value = `${nItems}`;
  count.addEventListener('change', ev => {
    const count = parseInt((ev.target! as HTMLInputElement).value, 10);
    list = createList(count);
    model.itemsList = list;
  });
  overscan.addEventListener('change', ev => {
    model.overscanCount = parseInt((ev.target! as HTMLInputElement).value, 10);
  });
  overscan.value = '1';
  overscan.addEventListener('change', ev => {
    model.overscanCount = parseInt((ev.target! as HTMLInputElement).value, 10);
  });
  windowing.addEventListener('change', ev => {
    model.windowingActive = (ev.target! as HTMLInputElement).checked;
  });
  windowing.checked = true;
  document.body.insertAdjacentElement('afterbegin', inputs);

  let widgetIndex = widgetIndexInput.valueAsNumber;
  widgetIndexInput.addEventListener('change', ev => {
    widgetIndex = widgetIndexInput.valueAsNumber;
  });

  addWidget.addEventListener('click', () => {
    list.insert(widgetIndex, { index: list.length });
  });

  rmWidget.addEventListener('click', () => {
    list.remove(widgetIndex);
  });

  scrollToIndex.addEventListener('change', () => {
    void panel.scrollToItem(scrollToIndex.valueAsNumber);
  });

  scrollToOffset.addEventListener('change', () => {
    panel.scrollTo(scrollToOffset.valueAsNumber);
  });

  // Ensure Jupyter styling
  panel.addClass('jp-ThemedContainer');

  // Attach the panel to the DOM.
  Widget.attach(panel, document.body);

  // Handle widget state.
  window.addEventListener('resize', () => {
    panel.update();
  });
  panel.update();

  function createList(nItems: number) {
    const values = new Array<{ index: number }>(nItems);
    for (let i = 0; i < nItems; i++) {
      values[i] = { index: i };
    }
    return new ObservableList<{ index: number }>({ values });
  }
}

window.addEventListener('load', main);
