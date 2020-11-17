import { ReactWidget, UseSignal } from '@jupyterlab/apputils';

import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';

import { HTMLSelect } from '@jupyterlab/ui-components';

import React, { useState } from 'react';

import { IDebugger } from '../../tokens';
import { VariablesBodyGrid } from './grid';
import { VariablesBodyTree } from './tree';

/**
 * A React component to handle scope changes.
 *
 * @param {object} props The component props.
 * @param props.model The variables model.
 * @param props.trans The translation bundle.
 */
const ScopeSwitcherComponent = ({
  model,
  trans,
  tree,
  grid
}: {
  model: IDebugger.Model.IVariables;
  trans: TranslationBundle;
  tree: VariablesBodyTree;
  grid: VariablesBodyGrid;
}): JSX.Element => {
  const [value, setValue] = useState('-');
  const scopes = model.scopes;

  const onChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setValue(value);
    tree.scope = value;
  };

  return (
    <HTMLSelect
      className={''}
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

  private _tree: VariablesBodyTree;
  private _grid: VariablesBodyGrid;
  private _model: IDebugger.Model.IVariables;
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
     * The translator.
     */
    translator: ITranslator;
  }
}
