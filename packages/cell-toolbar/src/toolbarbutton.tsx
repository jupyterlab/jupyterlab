import {
  addToolbarButtonClass,
  ReactWidget,
  ToolbarButtonComponent
} from '@jupyterlab/apputils';
import { LabIcon } from '@jupyterlab/ui-components';
import React from 'react';

/**
 * Toggle button properties
 */
export interface IToggleButtonprops {
  /**
   * Button class name
   */
  className?: (state: boolean) => string;
  /**
   * Button label
   */
  label?: (state: boolean) => string;
  /**
   * Button icon
   */
  icon?: (state: boolean) => LabIcon;
  /**
   * Button tooltip
   */
  tooltip?: (state: boolean) => string;
  /**
   * Button callback
   */
  onClick?: (state: boolean) => void;
  /**
   * Button enabled status
   */
  enabled?: (state: boolean) => boolean;
  /**
   * Trigger the button on the actual onClick event rather than onMouseDown.
   *
   * See note in ToolbarButtonComponent below as to why the default is to
   * trigger on onMouseDown.
   */
  actualOnClick?: boolean;
}

export class ToggleButton extends ReactWidget {
  /**
   * Creates a toolbar toggle button
   *
   * Initial state is false
   *
   * @param props props for underlying `ToolbarButton` component
   */
  constructor(protected props: IToggleButtonprops = {}) {
    super();
    addToolbarButtonClass(this);
  }

  /**
   * Toggled button state
   */
  get toggled(): boolean {
    return this._toggled;
  }

  set toggled(value: boolean) {
    if (value !== this._toggled) {
      this._toggled = value;
      this.update();
    }
  }

  render(): JSX.Element {
    const p = {
      className: this.props.className
        ? this.props.className(this.toggled)
        : undefined,
      label: this.props.label ? this.props.label(this.toggled) : undefined,
      icon: this.props.icon ? this.props.icon(this.toggled) : undefined,
      tooltip: this.props.tooltip
        ? this.props.tooltip(this.toggled)
        : undefined,
      onClick: this.props.onClick
        ? (): void => {
            this.toggled = !this.toggled;
            (this.props.onClick as (s: boolean) => void)(this.toggled);
          }
        : undefined,
      enabled: this.props.enabled ? this.props.enabled(this.toggled) : undefined
    };
    return <ToolbarButtonComponent {...p} />;
  }

  protected _toggled = false;
}
