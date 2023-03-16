/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { ellipsesIcon } from '@jupyterlab/ui-components';
import { Widget } from '@lumino/widgets';
import { Message } from '@lumino/messaging';

/**
 * The CSS class added to placeholders.
 */
const PLACEHOLDER_CLASS = 'jp-Placeholder';

/**
 * The CSS classes added to input placeholder prompts.
 */
const INPUT_PROMPT_CLASS = 'jp-Placeholder-prompt jp-InputPrompt';

/**
 * The CSS classes added to output placeholder prompts.
 */
const OUTPUT_PROMPT_CLASS = 'jp-Placeholder-prompt jp-OutputPrompt';

/**
 * The CSS class added to placeholder content.
 */
const CONTENT_CLASS = 'jp-Placeholder-content';

/**
 * The CSS class added to input placeholders.
 */
const INPUT_PLACEHOLDER_CLASS = 'jp-InputPlaceholder';

/**
 * The CSS class added to output placeholders.
 */
const OUTPUT_PLACEHOLDER_CLASS = 'jp-OutputPlaceholder';

/**
 * Placeholder widget options
 */
export interface IPlaceholderOptions {
  /**
   * Prompt element CSS class
   */
  promptClass: string;
  /**
   * Ellipsis button callback
   */
  callback: (e: MouseEvent) => void;
}

/**
 * An base class for placeholders
 *
 * ### Notes
 * A placeholder is the element that is shown when input/output
 * is hidden.
 */
export class Placeholder extends Widget {
  /**
   * Construct a new placeholder.
   */
  constructor(options: IPlaceholderOptions) {
    const node = document.createElement('div');

    super({ node });
    const innerNode = document.createElement('div');
    innerNode.className = options.promptClass;
    node.insertAdjacentHTML('afterbegin', innerNode.outerHTML);
    this._button = document.createElement('div');
    this._button.classList.add(CONTENT_CLASS);
    node.appendChild(this._button);
    ellipsesIcon.element({
      container: this._button.appendChild(document.createElement('div')),
      className: 'jp-MoreHorizIcon',
      elementPosition: 'center',
      height: 'auto',
      width: '32px'
    });

    this.addClass(PLACEHOLDER_CLASS);
    this._callback = options.callback;
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this._button.addEventListener('click', this._callback);
  }

  protected onBeforeDetach(msg: Message): void {
    this._button.removeEventListener('click', this._callback);
    super.onBeforeDetach(msg);
  }

  private _callback: (e: MouseEvent) => void;
  private _button: HTMLElement;
}

/**
 * The input placeholder class.
 */
export class InputPlaceholder extends Placeholder {
  /**
   * Construct a new input placeholder.
   */
  constructor(callback: (e: MouseEvent) => void) {
    super({ callback, promptClass: INPUT_PROMPT_CLASS });
    this.addClass(INPUT_PLACEHOLDER_CLASS);
  }
}

/**
 * The output placeholder class.
 */
export class OutputPlaceholder extends Placeholder {
  /**
   * Construct a new output placeholder.
   */
  constructor(callback: (e: MouseEvent) => void) {
    super({ callback, promptClass: OUTPUT_PROMPT_CLASS });
    this.addClass(OUTPUT_PLACEHOLDER_CLASS);
  }
}
