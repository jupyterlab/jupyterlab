/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';

import { ITranslator } from '@jupyterlab/translation';

type IInstructionPlaceholderProps = {
  translator: ITranslator;
};

export const InstructionsPlaceholder = ({
  translator
}: IInstructionPlaceholderProps) => {
  const trans = translator.load('jupyterlab');
  return (
    <div className="jp-TableOfContents-placeholder">
      <div className="jp-TableOfContents-placeholderContent">
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
