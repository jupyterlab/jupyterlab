// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { UseSignal } from '@jupyterlab/ui-components';
import { TranslationBundle } from '@jupyterlab/translation';
import React from 'react';
import { IDebugger } from '../../tokens';

/**
 * A React component to display the path to a source.
 *
 * @param {object} props The component props.
 * @param props.model The model for the sources.
 */
export const SourcePathComponent = ({
  model,
  trans
}: {
  model: IDebugger.Model.ISources;
  trans: TranslationBundle;
}): JSX.Element => {
  return (
    <UseSignal signal={model.currentSourceChanged} initialSender={model}>
      {(model): JSX.Element => (
        <span
          onClick={(event): void => {
            if (event.ctrlKey) {
              model?.open();
            }
          }}
          title={trans.__('Ctrl + click to open in the Main Area')}
          className="jp-DebuggerSources-header-path"
        >
          {model?.currentSource?.path ?? ''}
        </span>
      )}
    </UseSignal>
  );
};
