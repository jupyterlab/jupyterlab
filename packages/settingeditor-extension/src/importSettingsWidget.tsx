/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { ReactWidget } from '@jupyterlab/ui-components';
import React, { useState } from 'react';

const Settings = (props: {
  settings: string[];
  handleImport: (settings: string[]) => void;
  trans: TranslationBundle;
}): JSX.Element => {
  const [checkedStates, setCheckedStates] = useState<Record<string, boolean>>(
    props.settings.reduce(
      (acc, key) => {
        acc[key] = true;
        return acc;
      },
      {} as Record<string, boolean>
    )
  );

  const handleCheckboxChange = (key: string, isChecked: boolean) => {
    const updatedStates = { ...checkedStates, [key]: isChecked };
    setCheckedStates(updatedStates);
  };

  return (
    <div className="jp-SettingsImport-container">
      <div className="jp-SettingsImport-header">
        <span className="jp-SettingsImport-title">
          {props.trans.__('The following settings will be affected')}
        </span>
        <button
          className="jp-mod-styled jp-mod-reject jp-ArrayOperationsButton"
          onClick={() => {
            props.handleImport(
              Object.keys(checkedStates).filter(key => !checkedStates[key])
            );
          }}
        >
          {props.trans.__('Import')}
        </button>
      </div>
      <div className="jp-SettingsImport-list">
        {props.settings.map(key => (
          <div key={key} className="jp-SettingsImport-item">
            <span className="jp-SettingsImport-itemKey">{key}</span>
            <input
              type="checkbox"
              checked={checkedStates[key]}
              onChange={e => handleCheckboxChange(key, e.target.checked)}
              className="jp-SettingsImport-checkbox"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * A widget for importing settings with checkboxes.
 */
export class ImportSettingsWidget extends ReactWidget {
  /**
   * Constructs a new ImportSettingsWidget.
   *
   * @param importedSettings - The settings to display.
   * @param handleImport - A callback for handling imports.
   */
  constructor(
    importedSettings: string[],
    handleImport: (settings: string[]) => void,
    translator: ITranslator
  ) {
    super();
    this.importedSettings = importedSettings;
    this.handleImport = handleImport;
    this.addClass('jp-SettingsImport-widget');
    this.trans = translator.load('jupyterlab');
  }

  render(): JSX.Element {
    return (
      <Settings
        settings={this.importedSettings}
        handleImport={this.handleImport}
        trans={this.trans}
      />
    );
  }

  private importedSettings: string[];
  private handleImport: (settings: string[]) => void;
  private trans: TranslationBundle;
}
