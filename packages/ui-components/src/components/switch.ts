// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IChangedArgs } from '@jupyterlab/coreutils';
import { ISignal, Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';

/**
 * A Switch widget
 */
export class Switch extends Widget {
  constructor() {
    super();

    // switch accessibility refs:
    // https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/Switch_role
    // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#Accessibility_concerns

    this._button.className = 'jp-switch';
    this._button.setAttribute('role', 'switch');
    this._button.setAttribute(
      'aria-checked',
      this._value ? this._value.toString() : 'false'
    );

    this._label.className = 'jp-switch-label';

    const track = document.createElement('div');
    track.className = 'jp-switch-track';
    track.setAttribute('aria-hidden', 'true');

    this._button.appendChild(this._label);
    this._button.appendChild(track);
    this.node.appendChild(this._button);
  }

  /**
   * The value of the switch.
   */
  get value(): boolean {
    return this._value;
  }
  set value(newValue: boolean) {
    const oldValue = this._value;
    if (oldValue === newValue) {
      return;
    }
    this._button.setAttribute('aria-checked', newValue.toString());
    this._value = newValue;
    this._valueChanged.emit({ name: 'value', oldValue, newValue });
  }

  /**
   * A signal emitted when the value changes.
   */
  get valueChanged(): ISignal<this, IChangedArgs<boolean, boolean, 'value'>> {
    return this._valueChanged;
  }

  /**
   * The visible label of the switch.
   */
  get label(): string {
    return this._label.textContent ?? '';
  }
  set label(x: string) {
    this._label.textContent = x;
  }

  /**
   * The caption (title) of the switch.
   */
  get caption(): string {
    return this._button.title;
  }
  set caption(x: string) {
    this._button.title = x;
    this._label.title = x;
  }

  handleEvent(event: Event): void {
    switch (event.type) {
      case 'click':
        this.value = !this.value;
        break;
      default:
        break;
    }
  }

  protected onAfterAttach(): void {
    this._button.addEventListener('click', this);
  }

  protected onBeforeDetach(): void {
    this._button.removeEventListener('click', this);
  }

  private _button = document.createElement('button');
  private _label = document.createElement('label');

  private _value: boolean;
  private _valueChanged = new Signal<
    this,
    IChangedArgs<boolean, boolean, 'value'>
  >(this);
}
