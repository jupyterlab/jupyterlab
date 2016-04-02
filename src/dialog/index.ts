// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

/**
 * The class name added to dialog instances.
 */
const DIALOG_CLASS = 'jp-Dialog';

/**
 * The class name added to dialog content node.
 */
const CONTENT_CLASS = 'jp-Dialog-content';

/**
 * The class name added to dialog header node.
 */
const HEADER_CLASS = 'jp-Dialog-header';

/**
 * The class name added to dialog title node.
 */
const TITLE_CLASS = 'jp-Dialog-title';

/**
 * The class name added to dialog body node.
 */
const BODY_CLASS = 'jp-Dialog-body';

/**
 * The class name added to a dialog body content node.
 */
const BODY_CONTENT_CLASS = 'jp-Dialog-bodyContent';

/**
 * The class name added to a dialog content node.
 */
const FOOTER_CLASS = 'jp-Dialog-footer';

/**
 * The class name added to a dialog button node.
 */
const BUTTON_CLASS = 'jp-Dialog-button';

/**
 * The class name added to a dialog button icon node.
 */
const BUTTON_ICON_CLASS = 'jp-Dialog-buttonIcon';

/**
 * The class name added to a dialog button text node.
 */
const BUTTON_TEXT_CLASS = 'jp-Dialog-buttonText';

/*
 * The class name added to dialog Confirm buttons.
 */
const OK_BUTTON_CLASS = 'jp-Dialog-okButton';

/**
 * The class name added to dialog Cancel buttons.
 */
const CANCEL_BUTTON_CLASS = 'jp-Dialog-cancelButton';

/**
 * The class name added to dialog input field wrappers.
 */
const INPUT_WRAPPER_CLASS = 'jp-Dialog-inputWrapper';

/**
 * The class name added to dialog input fields.
 */
const INPUT_CLASS = 'jp-Dialog-input';

/**
 * The class name added to dialog select wrappers.
 */
const SELECT_WRAPPER_CLASS = 'jp-Dialog-selectWrapper';

/**
 * The class anem added to dialog select nodes.
 */
const SELECT_CLASS = 'jp-Dialog-select';


/**
 * A button applied to a dialog.
 */
export
interface IButtonItem {
  /**
   * The text for the button.
   */
  text: string;

  /**
   * The icon class for the button.
   */
  icon?: string;

  /**
   * The extra class name to associate with the button.
   */
  className?: string;

  /**
   * The handler for the button.
   */
  handler?: (args: any) => void;

  /**
   * The arguments to pass to the handler.
   */
  args?: any;
}


/**
 * A default confirmation button.
 */
export
const okButton: IButtonItem = {
  text: 'OK',
  className: OK_BUTTON_CLASS
};


/**
 * A default cancel button.
 */
export
const cancelButton: IButtonItem = {
  text: 'CANCEL',
  className: CANCEL_BUTTON_CLASS
};


/**
 * The options used to create a dialog.
 */
export
interface IDialogOptions {
  /**
   * The tope level text for the dialog (defaults to an empty string).
   */
  title?: string;

  /**
   * The main body element for the dialog or a message to display.
   *
   * #### Notes
   * If a `string` is provided, it will be used as the `HTMLContent` of
   * a `<span>`.  If an `<input>` or `<select>` element is provided,
   * they will be styled.
   */
  body?: HTMLElement | string;

  /**
   * The host element for the dialog (defaults to `document.body`).
   */
  host?: HTMLElement;

  /**
   * A list of button times to display (defaults to [[okButton]] and
   *   [[cancelButton]]).
   */
  buttons?: IButtonItem[];

  /**
   * The confirmation text for the button (defaults to 'OK').
   */
  okText?: string;
}


/**
 * Create a dialog and show it.
 *
 * @param options - The dialog setup options.
 *
 * @returns The button item that was selected.
 */
export
function showDialog(options: IDialogOptions): Promise<IButtonItem>{
  let host = options.host || document.body;
  okButton.text = options.okText ? options.okText : 'OK';
  let buttons = options.buttons || [cancelButton, okButton];
  let buttonNodes = buttons.map(createButton);
  let dialog = createDialog(options, buttonNodes);
  host.appendChild(dialog);
  // Focus the ok button if given.
  let index = buttons.indexOf(okButton);
  if (index !== -1) buttonNodes[index].focus();

  return new Promise<IButtonItem>((resolve, reject) => {
    buttonNodes.map(node => {
      node.addEventListener('click', evt => {
        if (node.contains(evt.target as HTMLElement)) {
          host.removeChild(dialog);
          let button = buttons[buttonNodes.indexOf(node)];
          if (button.handler) button.handler(button.args);
          resolve(button);
        }
      });
    });
    dialog.addEventListener('keydown', evt => {
      // Check for escape key
      if (evt.keyCode === 27) {
        host.removeChild(dialog);
        resolve(null);
      }
    });
    dialog.addEventListener('contextmenu', evt => {
      evt.preventDefault();
      evt.stopPropagation();
    });
  });
}


/**
 * Create the dialog node.
 */
function createDialog(options: IDialogOptions, buttonNodes: HTMLElement[]): HTMLElement {
  // Create the dialog nodes (except for the buttons).
  let node = document.createElement('div');
  let content = document.createElement('div');
  let header = document.createElement('div');
  let body = document.createElement('div');
  let footer = document.createElement('div');
  let title = document.createElement('span');
  node.className = DIALOG_CLASS;
  content.className = CONTENT_CLASS;
  header.className = HEADER_CLASS;
  body.className = BODY_CLASS;
  footer.className = FOOTER_CLASS;
  title.className = TITLE_CLASS;
  node.appendChild(content);
  content.appendChild(header);
  content.appendChild(body);
  content.appendChild(footer);
  header.appendChild(title);

  // Populate the nodes.
  title.textContent = options.title || '';
  let child: HTMLElement;
  if (options.body && typeof options.body === 'string') {
    child = document.createElement('span');
    child.innerHTML = options.body as string;
  } else if (options.body) {
    child = options.body as HTMLElement;
    switch (child.tagName) {
    case 'INPUT':
      child = wrapInput(child as HTMLInputElement);
      break;
    case 'SELECT':
      child = wrapSelect(child as HTMLSelectElement);
      break;
    default:
      child = styleElements(child);
      break;
    }
  }
  child.classList.add(BODY_CONTENT_CLASS);
  body.appendChild(child);
  buttonNodes.map(buttonNode => { footer.appendChild(buttonNode); });
  return node;
}


/**
 * Style the child elements of a parent element.
 */
function styleElements(element: HTMLElement): HTMLElement {
  for (let i = 0; i < element.children.length; i++) {
    let child = element.children[i];
    let next = child.nextSibling;
    switch (child.tagName) {
    case 'INPUT':
      child = wrapInput(child as HTMLInputElement);
      element.insertBefore(child, next);
      break;
    case 'SELECT':
      child = wrapSelect(child as HTMLSelectElement);
      element.insertBefore(child, next);
      break;
    }
  }
  return element;
}


/**
 * Create a node for a button item.
 */
function createButton(item: IButtonItem): HTMLElement {
  let button = document.createElement('button');
  button.className = BUTTON_CLASS;
  if (item.className) button.classList.add(item.className);
  let icon = document.createElement('span');
  icon.className = BUTTON_ICON_CLASS;
  if (item.icon) icon.classList.add(item.icon);
  let text = document.createElement('span');
  text.className = BUTTON_TEXT_CLASS;
  text.textContent = item.text;
  button.appendChild(icon);
  button.appendChild(text);
  return button;
}


/**
 * Wrap and style an input node.
 */
function wrapInput(input: HTMLInputElement): HTMLElement {
  let wrapper = document.createElement('div');
  wrapper.className = INPUT_WRAPPER_CLASS;
  wrapper.appendChild(input);
  input.classList.add(INPUT_CLASS);
  return wrapper;
}


/**
 * Wrap and style a select node.
 */
function wrapSelect(select: HTMLSelectElement): HTMLElement {
  let wrapper = document.createElement('div');
  wrapper.className = SELECT_WRAPPER_CLASS;
  wrapper.appendChild(select);
  select.classList.add(SELECT_CLASS);
  return wrapper;
}
