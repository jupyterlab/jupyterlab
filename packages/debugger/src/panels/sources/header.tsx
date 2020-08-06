// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReactWidget, Toolbar, UseSignal } from '@jupyterlab/apputils';

import { nullTranslator, ITranslator } from '@jupyterlab/translation';

import { PanelLayout, Widget } from '@lumino/widgets';

import { IDebugger } from '../../tokens';

import React from 'react';

/**
 * The header for a Source Panel.
 */
export class SourcesHeader extends Widget {
  /**
   * Instantiate a new SourcesHeader.
   *
   * @param model The model for the Sources.
   */
  constructor(model: IDebugger.Model.ISources, translator?: ITranslator) {
    super({ node: document.createElement('header') });
    translator = translator || nullTranslator;
    const trans = translator.load('jupyterlab');

    const layout = new PanelLayout();
    this.layout = layout;

    const title = new Widget({ node: document.createElement('h2') });
    title.node.textContent = trans.__('Source');

    const sourcePath = ReactWidget.create(
      <SourcePathComponent model={model} />
    );

    layout.addWidget(title);
    layout.addWidget(this.toolbar);
    layout.addWidget(sourcePath);

    this.addClass('jp-DebuggerSources-header');
  }

  /**
   * The toolbar for the sources header.
   */
  readonly toolbar = new Toolbar();
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
