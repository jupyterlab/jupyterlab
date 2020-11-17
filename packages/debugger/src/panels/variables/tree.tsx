// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReactWidget } from '@jupyterlab/apputils';

import { caretDownEmptyIcon } from '@jupyterlab/ui-components';

import { ArrayExt } from '@lumino/algorithm';

import React, { useEffect, useState } from 'react';

import { DebugProtocol } from 'vscode-debugprotocol';

import { IDebugger } from '../../tokens';

import { convertType } from '.';

import { VariablesModel } from './model';

/**
 * The body for tree of variables.
 */
export class VariablesBodyTree extends ReactWidget {
  /**
   * Instantiate a new Body for the tree of variables.
   *
   * @param options The instantiation options for a VariablesBodyTree.
   */
  constructor(options: VariablesBodyTree.IOptions) {
    super();
    this._service = options.service;

    const model = options.model;
    model.changed.connect(this._updateScopes, this);

    this.addClass('jp-DebuggerVariables-body');
  }

  /**
   * Render the VariablesBodyTree.
   */
  render(): JSX.Element {
    const scope =
      this._scopes.find(scope => scope.name === this._scope) ?? this._scopes[0];

    if (!scope) {
      return <div></div>;
    }

    return (
      <VariablesComponent
        key={scope.name}
        service={this._service}
        data={scope.variables}
        filter={this._filter}
      />
    );
  }

  /**
   * Set the variable filter list.
   */
  set filter(filter: Set<string>) {
    this._filter = filter;
    this.update();
  }

  /**
   * Set the current scope
   */
  set scope(scope: string) {
    this._scope = scope;
    this.update();
  }

  /**
   * Update the scopes and the tree of variables.
   *
   * @param model The variables model.
   */
  private _updateScopes(model: VariablesModel): void {
    if (ArrayExt.shallowEqual(this._scopes, model.scopes)) {
      return;
    }
    this._scopes = model.scopes;
    this.update();
  }

  private _scope: string | null;
  private _scopes: IDebugger.IScope[] = [];
  private _filter = new Set<string>();
  private _service: IDebugger;
}

/**
 * A React component to display a list of variables.
 *
 * @param {object} props The component props.
 * @param props.data An array of variables.
 * @param props.service The debugger service.
 * @param props.filter Optional variable filter list.
 */
const VariablesComponent = ({
  scope,
  data,
  service,
  filter
}: {
  data: IDebugger.IVariable[];
  service: IDebugger;
  filter?: Set<string>;
  scope?: string;
}): JSX.Element => {
  const [variables, setVariables] = useState(data);

  useEffect(() => {
    setVariables(data);
  }, [data]);

  return (
    <>
      {scope && <span className="jp-DebuggerVariables-marker">{scope}:</span>}
      <ul>
        {variables
          ?.filter(
            variable => !(filter || new Set()).has(variable.evaluateName || '')
          )
          .map(variable => {
            const key = `${variable.name}-${variable.evaluateName}-${variable.type}-${variable.value}`;
            return (
              <VariableComponent
                key={key}
                data={variable}
                service={service}
                filter={filter}
              />
            );
          })}
      </ul>
    </>
  );
};

/**
 * A React component to display one node variable in tree.
 *
 * @param {object} props The component props.
 * @param props.data An array of variables.
 * @param props.service The debugger service.
 * @param props.filter Optional variable filter list.
 */
const VariableComponent = ({
  data,
  service,
  filter
}: {
  data: IDebugger.IVariable;
  service: IDebugger;
  filter?: Set<string>;
}): JSX.Element => {
  const [variable] = useState(data);
  const [expanded, setExpanded] = useState<boolean>();
  const [variables, setVariables] = useState<DebugProtocol.Variable[]>();
  const styleName = {
    color: 'var(--jp-mirror-editor-attribute-color)'
  };

  const styleType = {
    color: 'var(--jp-mirror-editor-string-color)'
  };

  const expandable =
    variable.variablesReference !== 0 || variable.type === 'function';

  const onVariableClicked = async (e: React.MouseEvent): Promise<void> => {
    if (!expandable) {
      return;
    }
    e.stopPropagation();
    const variables = await service.inspectVariable(
      variable.variablesReference
    );
    setExpanded(!expanded);
    setVariables(variables);
  };

  return (
    <li onClick={(e): Promise<void> => onVariableClicked(e)}>
      <caretDownEmptyIcon.react
        visibility={expandable ? 'visible' : 'hidden'}
        stylesheet="menuItem"
        tag="span"
        transform={expanded ? 'rotate(0deg)' : 'rotate(-90deg)'}
      />
      <span style={styleName}>{variable.name}</span>
      <span>: </span>
      <span style={styleType}>{convertType(variable)}</span>
      {expanded && variables && (
        <VariablesComponent
          key={variable.name}
          data={variables}
          service={service}
          filter={filter}
        />
      )}
    </li>
  );
};

/**
 * A namespace for VariablesBodyTree `statics`.
 */
namespace VariablesBodyTree {
  /**
   * Instantiation options for `VariablesBodyTree`.
   */
  export interface IOptions {
    /**
     * The variables model.
     */
    model: IDebugger.Model.IVariables;
    /**
     * The debugger service.
     */
    service: IDebugger;
  }
}
