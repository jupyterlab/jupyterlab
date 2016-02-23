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
 * The class name added to dialog close icon node.
 */
const CLOSE_ICON_CLASS = 'jp-Dialog-close';

/**
 * The class name added to dialog body node.
 */
const BODY_CLASS = 'jp-Dialog-body';

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
 * The class name added to dialog OK buttons.
 */
const OK_BUTTON_CLASS = 'jp-Dialog-okButton';

/**
 * The class name added to dialog Cancel buttons.
 */
const CANCEL_BUTTON_CLASS = 'jp-Dialog-cancelButton';


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
 * A default "OK" button.
 */
export
const okButton: IButtonItem = {
  text: 'OK',
  className: OK_BUTTON_CLASS
}


/**
 * A default "Cancel" button.
 */
export
const cancelButton: IButtonItem = {
  text: 'Cancel',
  className: CANCEL_BUTTON_CLASS
}


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
   * The main body element for the dialog or a message to display,
   * which is wrapped in a <p> tag.
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
  let buttons = options.buttons || [okButton, cancelButton];
  let buttonNodes = buttons.map(createButton);
  let dialog = createDialog(options, buttonNodes);
  host.appendChild(dialog);
  buttonNodes[0].focus();

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
    let close = dialog.getElementsByClassName(CLOSE_ICON_CLASS)[0];
    close.addEventListener('click', () => {
      host.removeChild(dialog);
      resolve(null);
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
  let close = document.createElement('span');
  node.className = DIALOG_CLASS;
  content.className = CONTENT_CLASS;
  header.className = HEADER_CLASS;
  body.className = BODY_CLASS;
  footer.className = FOOTER_CLASS;
  title.className = TITLE_CLASS;
  close.className = CLOSE_ICON_CLASS;
  node.appendChild(content);
  content.appendChild(header);
  content.appendChild(body);
  content.appendChild(footer);
  header.appendChild(title);
  header.appendChild(close);

  // Populate the nodes.
  title.textContent = options.title || '';
  if (options.body && typeof options.body === 'string') {
    let span = document.createElement('span');
    span.innerHTML = options.body as string;
    body.appendChild(span);
  } else if (options.body) {
    body.appendChild(options.body as HTMLElement);
  }
  buttonNodes.map(buttonNode => { footer.appendChild(buttonNode); });
  return node;
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
