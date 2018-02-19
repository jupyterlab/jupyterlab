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
  Widget
} from '@phosphor/widgets';

import * as React from 'react';

import * as ReactDOM from 'react-dom';


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
    const fields: { [property: string]: React.ReactElement<any> } = { };
    const properties = schema.properties || { };
    const title = `(${plugin}) ${schema.description}`;
    const label = `Fields - ${schema.title || plugin}`;

    Object.keys(properties).forEach(property => {
      const field = properties[property];
      const { type } = field;
      const defaultValue = settings.default(property);
      const title = field.title || property;
      const value = JSON.stringify(defaultValue) || '';
      const valueTitle = JSON.stringify(defaultValue, null, 4);

      fields[property] = (
        <tr key={property}>
          <td className={TABLE_EDITOR_KEY_CLASS} title={title}>
            <code title={title}>{property}</code>
          </td>
          <td className={TABLE_EDITOR_VALUE_CLASS} title={valueTitle}>
            <code title={valueTitle}>{value}</code>
          </td>
          <td className={TABLE_EDITOR_TYPE_CLASS}>{type}</td>
        </tr>
      );
    });

    const rows = Object.keys(fields)
      .sort((a, b) => a.localeCompare(b)).map(property => fields[property]);
    const fragment = (
      <React.Fragment>
        <legend title={title}>{label}</legend>
        <div className={TABLE_EDITOR_WRAPPER_CLASS}>
          <table>
            <thead>
              <tr>
                <th className={TABLE_EDITOR_KEY_CLASS}>Key</th>
                <th className={TABLE_EDITOR_VALUE_CLASS}>Default</th>
                <th className={TABLE_EDITOR_TYPE_CLASS}>Type</th>
              </tr>
            </thead>
            {rows.length ? (<tbody>{rows}</tbody>) : (<></>)}
          </table>
        </div>
      </React.Fragment>
    );

    ReactDOM.unmountComponentAtNode(node);
    ReactDOM.render(fragment, node);
  }
}

