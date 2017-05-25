// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
    VirtualElement, h
} from '@phosphor/virtualdom';


/**
 * CSS class added to all buttons.
 */
const
BUTTON_CLASS = 'jp-button';

/**
 * CSS class added to the icon span.
 */
const
BUTTON_ICON_CLASS = 'jp-button-icon';

/**
 * CSS class added to the button label span. 
 */
const
BUTTON_LABEL_CLASS = 'jp-button-label';

/**
 * Create a button `VirtualElement` given options. 
 */
export
function button(options: button.IOptions): VirtualElement {
    let buttonClass = BUTTON_CLASS;
    if (options.className) {
        buttonClass += ` ${options.className}`
    }
    let iconClass = BUTTON_ICON_CLASS;
    if (options.iconClass) {
        iconClass += ` ${options.iconClass}`;
    }
    return (
        h.button({ className: buttonClass, title: options.tooltip, onclick: options.onClick, type: "button" },
          h.span({ className: iconClass }),
          h.span({ className: BUTTON_LABEL_CLASS}, options.label)
        )
    );
}


/**
 * A namespace for `button` statics.
 */
export
namespace button {
  /**
   * The options used to construct a button.
   */
  export
  interface IOptions {

    /**
     * A function that is called on click.
     */
    onClick: () => void;

    /**
     * Space separated additional CSS classes added to the button node.
     */
    className?: string;

    /**
     * The tooltip string added as the title. 
     */
    tooltip?: string;

    /**
     * CSS class added to the icon span. 
     */
    iconClass?: string;

    /**
     * The text of the button.
     */
    label?: string;
  }
}


