// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ITranslator } from '@jupyterlab/translation';
import { ReactWidget, UseSignal } from '@jupyterlab/ui-components';
import React from 'react';
import { IDebugger } from '../../tokens';
import { PanelHeader } from '../header';

/**
 * The header for a Source Panel.
 */
export class SourcesHeader extends PanelHeader {
  /**
   * Instantiate a new SourcesHeader.
   *
   * @param model The model for the Sources.
   */
  constructor(model: IDebugger.Model.ISources, translator?: ITranslator) {
    super(translator);
    this.titleWidget.node.textContent = this._trans.__('Source');

    const sourcePath = ReactWidget.create(
      <SourcePathComponent model={model} />
    );

    this.layout.insertWidget(3, sourcePath);
    this.addClass('jp-DebuggerSources-header');
  }

}

/**
 * A React component to display the path to a source.
 *
 * @param {object} props The component props.
 * @param props.model The model for the sources.
 */
const SourcePathComponent = ({
  model
}: {
  model: IDebugger.Model.ISources;
}): JSX.Element => {
  return (
    <UseSignal signal={model.currentSourceChanged} initialSender={model}>
      {(model): JSX.Element => (
        <span onClick={(): void => model?.open()}>
          {model?.currentSource?.path ?? ''}
        </span>
      )}
    </UseSignal>
  );
};
