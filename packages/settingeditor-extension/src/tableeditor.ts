/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  ISettingRegistry
} from '@jupyterlab/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  h, VirtualDOM, VirtualElement
} from '@phosphor/virtualdom';

import {
  Widget
} from '@phosphor/widgets';


/**
 * The class name added to all table editors.
 */
const TABLE_EDITOR_CLASS = 'jp-TableEditor';

/**
 * The class name added to the table wrapper to handle overflow.
 */
const TABLE_EDITOR_WRAPPER_CLASS = 'jp-TableEditor-wrapper';

/**
 * The class name added to the table add button cells.
 */
const TABLE_EDITOR_ADD_CLASS = 'jp-TableEditor-add';

/**
 * The class name added to the table key cells.
 */
const TABLE_EDITOR_KEY_CLASS = 'jp-TableEditor-key';

/**
 * The class name added to the table default value cells.
 */
const TABLE_EDITOR_VALUE_CLASS = 'jp-TableEditor-value';

/**
 * The class name added to the table type cells.
 */
const TABLE_EDITOR_TYPE_CLASS = 'jp-TableEditor-type';

/**
 * The class name added to buttons.
 */
const TABLE_EDITOR_BUTTON_CLASS = 'jp-TableEditor-button';

/**
 * The class name for the add icon used to add individual preferences.
 */
const TABLE_EDITOR_ADD_ICON_CLASS = 'jp-AddIcon';

/**
 * The class name added to active items.
 */
const ACTIVE_CLASS = 'jp-mod-active';


/**
 * A tabular editor for plugin settings.
 */
export
class TableEditor extends Widget {
  /**
   * Create a new table editor for settings.
   */
  constructor(options: TableEditor.IOptions) {
    super({ node: document.createElement('fieldset') });
    this.addClass(TABLE_EDITOR_CLASS);
    this._onSaveError = options.onSaveError;
  }

  /**
   * The plugin settings.
   */
  get settings(): ISettingRegistry.ISettings | null {
    return this._settings;
  }
  set settings(settings: ISettingRegistry.ISettings | null) {
    if (this._settings) {
      this._settings.changed.disconnect(this._onSettingsChanged, this);
    }

    this._settings = settings;
    this._settings.changed.connect(this._onSettingsChanged, this);
    this.update();
  }

  /**
   * Handle the DOM events for the plugin fieldset class.
   *
   * @param event - The DOM event sent to the class.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the fieldset's DOM node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
    case 'click':
      this._evtClick(event as MouseEvent);
      break;
    default:
      return;
    }
  }

  /**
   * Handle `'after-attach'` messages.
   */
  protected onAfterAttach(msg: Message): void {
    this.node.addEventListener('click', this);
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('click', this);
  }

  /**
   * Handle `'update-request'` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    const settings = this._settings;

    // Empty the node.
    this.node.textContent = '';

    // Populate if possible.
    if (settings) {
      Private.populateTable(this.node, settings);
    }
  }

  /**
   * Handle the `'click'` event for the plugin fieldset.
   *
   * @param event - The DOM event sent to the widget
   */
  private _evtClick(event: MouseEvent): void {
    const attribute = 'data-property';
    const root = this.node;
    let target = event.target as HTMLElement;

    while (target && target.parentElement !== root) {
      const active = target.classList.contains(ACTIVE_CLASS);

      if (active && target.hasAttribute(attribute)) {
        event.preventDefault();
        this._onPropertyAdded(target.getAttribute(attribute));
        target.classList.remove(ACTIVE_CLASS);
        return;
      }
      target = target.parentElement;
    }
  }

  /**
   * Handle a property addition.
   */
  private _onPropertyAdded(property: string): void {
    const settings = this._settings;

    settings.save({ ...settings.user, [property]: settings.default(property) })
      .catch(this._onSaveError);
  }

  /**
   * Handle setting changes.
   */
  private _onSettingsChanged(): void {
    this.update();
  }

  private _onSaveError: (reason: any) => void;
  private _settings: ISettingRegistry.ISettings | null = null;
}


/**
 * A namespace for `TableEditor` statics.
 */
export
namespace TableEditor {
  /**
   * The instantiation options for a table editor.
   */
  export
  interface IOptions {
    /**
     * A function the table editor calls on save errors.
     */
    onSaveError: (reason: any) => void;
  }
}


/**
 * A namespace for private module data.
 */
namespace Private {

  /**
   * Populate the fieldset with a specific plugin's metadata.
   */
  export
  function populateTable(node: HTMLElement, settings: ISettingRegistry.ISettings): void {
    const { plugin, schema, user } = settings;
    const fields: { [property: string]: VirtualElement } = Object.create(null);
    const properties = schema.properties || { };
    const title = `(${plugin}) ${schema.description}`;
    const label = `Fields - ${schema.title || plugin}`;
    const headers = h.tr(
      h.th({ className: TABLE_EDITOR_ADD_CLASS }, ''),
      h.th({ className: TABLE_EDITOR_KEY_CLASS }, 'Key'),
      h.th({ className: TABLE_EDITOR_VALUE_CLASS }, 'Default'),
      h.th({ className: TABLE_EDITOR_TYPE_CLASS }, 'Type'));

    Object.keys(properties).forEach(property => {
      const field = properties[property];
      const { type } = field;
      const exists = property in user;
      const defaultValue = settings.default(property);
      const value = JSON.stringify(defaultValue) || '';
      const valueTitle = JSON.stringify(defaultValue, null, 4);
      const addButton = TABLE_EDITOR_BUTTON_CLASS + ' ' +
        TABLE_EDITOR_ADD_ICON_CLASS;
      const buttonCell = exists ? h.td({ className: TABLE_EDITOR_ADD_CLASS })
        : h.td({
            className: `${TABLE_EDITOR_ADD_CLASS} ${ACTIVE_CLASS}`,
            dataset: { property }
          }, h.div({
            className: addButton
          }));

      fields[property] = h.tr(
        buttonCell,
        h.td({
          className: TABLE_EDITOR_KEY_CLASS,
          title: field.title || property
        },
        h.code({ title: field.title || property }, property)),
        h.td({ className: TABLE_EDITOR_VALUE_CLASS, title: valueTitle },
          h.code({ title: valueTitle }, value)),
        h.td({ className: TABLE_EDITOR_TYPE_CLASS }, type));
    });

    const rows: VirtualElement[] = Object.keys(fields)
      .sort((a, b) => a.localeCompare(b)).map(property => fields[property]);
    const wrapper = h.div({ className: TABLE_EDITOR_WRAPPER_CLASS },
      h.table(headers, rows.length ? rows : undefined));

    node.appendChild(VirtualDOM.realize(h.legend({ title }, label)));
    node.appendChild(VirtualDOM.realize(wrapper));
  }
}

