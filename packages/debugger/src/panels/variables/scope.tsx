/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { HTMLSelect, ReactWidget, UseSignal } from '@jupyterlab/ui-components';
import React, { useState } from 'react';
import { IDebugger } from '../../tokens';
import { VariablesBodyGrid } from './grid';
import { VariablesBodyTree } from './tree';

/**
 * A React component to handle scope changes.
 *
 * @param {object} props The component props.
 * @param props.model The variables model.
 * @param props.tree The variables tree widget.
 * @param props.grid The variables grid widget.
 * @param props.trans The translation bundle.
 */
const ScopeSwitcherComponent = ({
  model,
  tree,
  grid,
  trans
}: {
  model: IDebugger.Model.IVariables;
  tree: VariablesBodyTree;
  grid: VariablesBodyGrid;
  trans: TranslationBundle;
}): JSX.Element => {
  const [value, setValue] = useState('-');
  const scopes = model.scopes;

  const onChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setValue(value);
    tree.scope = value;
    grid.scope = value;
  };

  return (
    <HTMLSelect
      onChange={onChange}
      value={value}
      aria-label={trans.__('Scope')}
    >
      {scopes.map(scope => (
        <option key={scope.name} value={scope.name}>
          {trans.__(scope.name)}
        </option>
      ))}
    </HTMLSelect>
  );
};

/**
 * A widget to switch between scopes.
 */
export class ScopeSwitcher extends ReactWidget {
  /**
   * Instantiate a new scope switcher.
   *
   * @param options The instantiation options for a ScopeSwitcher
   */
  constructor(options: ScopeSwitcher.IOptions) {
    super();
    const { translator, model, tree, grid } = options;
    this._model = model;
    this._tree = tree;
    this._grid = grid;
    this._trans = (translator || nullTranslator).load('jupyterlab');
  }

  /**
   * Render the scope switcher.
   */
  render(): JSX.Element {
    return (
      <UseSignal signal={this._model.changed} initialSender={this._model}>
        {(): JSX.Element => (
          <ScopeSwitcherComponent
            model={this._model}
            trans={this._trans}
            tree={this._tree}
            grid={this._grid}
          />
        )}
      </UseSignal>
    );
  }

  private _model: IDebugger.Model.IVariables;
  private _tree: VariablesBodyTree;
  private _grid: VariablesBodyGrid;
  private _trans: TranslationBundle;
}

/**
 * A namespace for ScopeSwitcher statics
 */
export namespace ScopeSwitcher {
  /**
   * The ScopeSwitcher instantiation options.
   */
  export interface IOptions {
    /**
     * The variables model.
     */
    model: IDebugger.Model.IVariables;

    /**
     * The variables tree viewer.
     */
    tree: VariablesBodyTree;

    /**
     * The variables table viewer.
     */
    grid: VariablesBodyGrid;

    /**
     * An optional translator.
     */
    translator?: ITranslator;
  }
}
