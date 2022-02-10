import { LabIcon } from '@jupyterlab/ui-components';
import { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import { ICellMenuItem } from './tokens';

/**
 * Constructor options for PositionedButton
 */
export interface IPositionedButton extends Omit<ICellMenuItem, 'command'> {
  /**
   * Button callback
   */
  callback: () => void;
  /**
   * Custom class name
   */
  className?: string;
}

/**
 * Positioned helper button
 */
export class PositionedButton extends Widget {
  constructor(item: IPositionedButton) {
    super({ node: Private.createNode(item) });
    this.addClass('jp-enh-cell-button');
    this._callback = item.callback;
  }

  /**
   * Handle the DOM events for the tab bar.
   *
   * @param event - The DOM event sent to the tab bar.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the tab bar's DOM node.
   *
   * This should not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'mousedown':
        this._evtMouseDown(event as MouseEvent);
        break;
    }
  }

  /**
   * A message handler invoked on a `'before-attach'` message.
   */
  protected onBeforeAttach(msg: Message): void {
    this.node.addEventListener('mousedown', this);
  }

  /**
   * A message handler invoked on an `'after-detach'` message.
   */
  protected onAfterDetach(msg: Message): void {
    this.node.removeEventListener('mousedown', this);
  }

  /**
   * Handle the `'mousedown'` event for the tab bar.
   */
  private _evtMouseDown(event: MouseEvent): void {
    // Do nothing if it's not a left or middle mouse press.
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this._callback();
  }

  private _callback: () => void;
}

namespace Private {
  // eslint-disable-next-line no-inner-declarations
  export function createNode(item: IPositionedButton): HTMLElement {
    const button = document.createElement('button');
    if (item.tooltip) {
      button.title = item.tooltip;
    }
    if (item.className) {
      button.classList.add(item.className);
    }
    button.appendChild(
      LabIcon.resolve({ icon: item.icon }).element({
        elementPosition: 'center',
        elementSize: 'normal',
        tag: 'span'
      })
    );
    return button;
  }
}
