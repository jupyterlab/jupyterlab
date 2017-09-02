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
const TABLE_EDITOR_CLASS = 'jp-SettingsTableEditor';

/**
 * The class name added to the table wrapper to handle overflow.
 */
const TABLE_EDITOR_WRAPPER_CLASS = 'jp-SettingsTableEditor-wrapper';

/**
 * The class name added to the table key cells.
 */
const TABLE_EDITOR_KEY_CLASS = 'jp-SettingsTableEditor-key';

/**
 * The class name added to the table default value cells.
 */
const TABLE_EDITOR_VALUE_CLASS = 'jp-SettingsTableEditor-value';

/**
 * The class name added to the table type cells.
 */
const TABLE_EDITOR_TYPE_CLASS = 'jp-SettingsTableEditor-type';


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
   * Tests whether the settings have been modified and need saving.
   */
  get isDirty(): boolean {
    return false; // TODO: remove placeholder.
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
    if (this._settings) {
      this._settings.changed.connect(this._onSettingsChanged, this);
    }
    this.update();
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
    const { plugin, schema } = settings;
    const fields: { [property: string]: VirtualElement } = Object.create(null);
    const properties = schema.properties || { };
    const title = `(${plugin}) ${schema.description}`;
    const label = `Fields - ${schema.title || plugin}`;
    const headers = h.tr(
      h.th({ className: TABLE_EDITOR_KEY_CLASS }, 'Key'),
      h.th({ className: TABLE_EDITOR_VALUE_CLASS }, 'Default'),
      h.th({ className: TABLE_EDITOR_TYPE_CLASS }, 'Type'));

    Object.keys(properties).forEach(property => {
      const field = properties[property];
      const { type } = field;
      const defaultValue = settings.default(property);
      const value = JSON.stringify(defaultValue) || '';
      const valueTitle = JSON.stringify(defaultValue, null, 4);

      fields[property] = h.tr(
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

