/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { ellipsesIcon } from '@jupyterlab/ui-components';
import { Widget } from '@lumino/widgets';
import { Message } from '@lumino/messaging';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';

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
  promptClass?: string;
  /**
   * Ellipsis button callback
   */
  callback: (e: MouseEvent) => void;
  /**
   * Text to include with the placeholder
   */
  text?: string;

  /**
   * Translator object
   */
  translator?: ITranslator;
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
    const trans = (options.translator ?? nullTranslator).load('jupyterlab');
    const innerNode = document.createElement('div');
    innerNode.className = options.promptClass ?? '';
    node.insertAdjacentHTML('afterbegin', innerNode.outerHTML);
    this._cell = document.createElement('div');
    this._cell.classList.add(CONTENT_CLASS);
    this._cell.title = trans.__('Click to expand');
    const container = this._cell.appendChild(document.createElement('div'));
    container.classList.add('jp-Placeholder-contentContainer');
    this._textContent = container.appendChild(document.createElement('span'));
    this._textContent.className = 'jp-PlaceholderText';
    this._textContent.innerText = options.text ?? '';
    node.appendChild(this._cell);
    ellipsesIcon.element({
      container: container.appendChild(document.createElement('span')),
      className: 'jp-MoreHorizIcon',
      elementPosition: 'center',
      height: 'auto',
      width: '32px'
    });

    this.addClass(PLACEHOLDER_CLASS);
    this._callback = options.callback;
  }

  /**
   * The text displayed in the placeholder.
   */
  set text(t: string) {
    this._textContent.innerText = t;
  }
  get text(): string {
    return this._textContent.innerText;
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('click', this._callback);
  }

  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('click', this._callback);
    super.onBeforeDetach(msg);
  }

  private _callback: (e: MouseEvent) => void;
  private _cell: HTMLElement;
  private _textContent: HTMLSpanElement;
}

/**
 * The input placeholder class.
 */
export class InputPlaceholder extends Placeholder {
  /**
   * Construct a new input placeholder.
   */
  constructor(options: IPlaceholderOptions) {
    super({ ...options, promptClass: INPUT_PROMPT_CLASS });
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
  constructor(options: IPlaceholderOptions) {
    super({ ...options, promptClass: OUTPUT_PROMPT_CLASS });
    this.addClass(OUTPUT_PLACEHOLDER_CLASS);
  }
}
