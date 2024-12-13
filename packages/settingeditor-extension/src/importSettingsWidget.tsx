/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ITranslator } from '@jupyterlab/translation';
import { ReactWidget } from '@jupyterlab/ui-components';
import React, { useState } from 'react';

/**
 * A namespace for ImportSettings.
 */
namespace ImportSettings {
  /**
   * The props for the ImportSettings component.
   */
  export interface IOptions {
    importedSettings: string[];
    handleImport: (settings: string[]) => void;
    translator: ITranslator;
  }
  /**
   * The props for the ImportSettings DialogBox body.
   */
  export interface IDialogBodyBodyOptions {
    successMessage: string;
    failureMessage?: string;
    failedSettings?: string[];
  }
}

const SettingsImport = (props: ImportSettings.IOptions): JSX.Element => {
  const trans = props.translator.load('jupyterlab');
  const [checkedStates, setCheckedStates] = useState<Record<string, boolean>>(
    props.importedSettings.reduce(
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
          {trans.__('Select settings sections to import')}
        </span>
        <button
          className="jp-Button jp-mod-styled jp-mod-accept"
          onClick={() => {
            props.handleImport(
              Object.keys(checkedStates).filter(key => !checkedStates[key])
            );
          }}
        >
          {trans.__('Import')}
        </button>
      </div>
      <div className="jp-SettingsImport-list">
        {props.importedSettings.map(key => (
          <label key={key} className="jp-SettingsImport-item">
            <span className="jp-SettingsImport-itemKey">{key}</span>
            <input
              type="checkbox"
              checked={checkedStates[key]}
              onChange={e => handleCheckboxChange(key, e.target.checked)}
              className="jp-SettingsImport-checkbox"
            />
          </label>
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
  constructor(options: ImportSettings.IOptions) {
    const { importedSettings, handleImport, translator } = options;
    super();
    this.importedSettings = importedSettings;
    this.handleImport = handleImport;
    this.addClass('jp-SettingsImport-widget');
    this.translator = translator;
  }

  render(): JSX.Element {
    return (
      <SettingsImport
        importedSettings={this.importedSettings}
        handleImport={this.handleImport}
        translator={this.translator}
      />
    );
  }

  private importedSettings: string[];
  private handleImport: (settings: string[]) => void;
  private translator: ITranslator;
}

const ImportSettingsDialogBody = (
  props: ImportSettings.IDialogBodyBodyOptions
): JSX.Element => {
  return (
    <div>
      <div>{props.successMessage}</div>
      {props.failureMessage && (
        <div>
          <br />
          <div>{props.failureMessage}</div>
          {props.failedSettings &&
            props.failedSettings.map((setting, index) => (
              <div key={index}>{setting}</div>
            ))}
        </div>
      )}
    </div>
  );
};

export class ImportSettingsDialogBodyWidget extends ReactWidget {
  constructor(private _props: ImportSettings.IDialogBodyBodyOptions) {
    super();
  }

  render(): JSX.Element {
    return <ImportSettingsDialogBody {...this._props} />;
  }
}
