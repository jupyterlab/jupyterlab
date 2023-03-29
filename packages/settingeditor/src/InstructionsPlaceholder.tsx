import React from 'react';

import { jupyterIcon } from '@jupyterlab/ui-components';
import { ITranslator } from '@jupyterlab/translation';

type IInstructionPlaceholderProps = {
  translator: ITranslator;
};

export const InstructionsPlaceholder = ({
  translator
}: IInstructionPlaceholderProps) => {
  const trans = translator.load('jupyterlab');
  return (
    <>
      <h2>
        <jupyterIcon.react
          className="jp-SettingEditorInstructions-icon"
          tag="span"
          elementPosition="center"
          height="auto"
          width="60px"
        />
        <span className="jp-SettingEditorInstructions-title">
          {trans.__('Settings')}
        </span>
      </h2>
      <span className="jp-SettingEditorInstructions-text">
        {trans.__(
          'Select a plugin from the list to view and edit its preferences.'
        )}
      </span>
    </>
  );
};
