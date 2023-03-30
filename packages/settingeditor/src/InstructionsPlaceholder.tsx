/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';

import { ITranslator } from '@jupyterlab/translation';

type ISettingsEditorPlaceholderProps = {
  translator: ITranslator;
};

export const SettingsEditorPlaceholder = ({
  translator
}: ISettingsEditorPlaceholderProps) => {
  const trans = translator.load('jupyterlab');
  return (
    <div className="jp-SettingsEditor-placeholder">
      <div className="jp-SettingsEditor-placeholderContent">
        <h3>{trans.__('No Plugin Selected')}</h3>
        <p>
          {trans.__(
            'Select a plugin from the list to view and edit its preferences.'
          )}
        </p>
      </div>
    </div>
  );
};
