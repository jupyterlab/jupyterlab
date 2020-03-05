// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ArrayExt } from '@lumino/algorithm';

import { convertType } from '.';

import { ReactWidget } from '@jupyterlab/apputils';

import React, { useEffect, useState } from 'react';

import { IDebugger } from '../tokens';

import { VariablesModel } from './model';

/**
 * The body for tree of variables.
 */
export class VariablesBodyTree extends ReactWidget {
  /**
   * Instantiate a new Body for the tree of variables.
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
  render() {
    return (
      <>
        {this._scopes.map(scope => (
          <VariablesComponent
            key={scope.name}
            service={this._service}
            data={scope.variables}
          />
        ))}
      </>
    );
  }

  /**
   * Update the scopes and the tree of variables.
   * @param model The variables model.
   */
  private _updateScopes(model: VariablesModel) {
    if (ArrayExt.shallowEqual(this._scopes, model.scopes)) {
      return;
    }
    this._scopes = model.scopes;
    this.update();
  }

  private _scopes: VariablesModel.IScope[] = [];
  private _service: IDebugger;
}

/**
 * A React component to display a list of variables.
 * @param data An array of variables.
 * @param service The debugger service.
 */
const VariablesComponent = ({
  data,
  service
}: {
  data: VariablesModel.IVariable[];
  service: IDebugger;
}) => {
  const [variables, setVariables] = useState(data);

  useEffect(() => {
    setVariables(data);
  }, [data]);

  return (
    <>
      <ul>
        {variables.map(variable => {
          const key = `${variable.evaluateName}-${variable.type}-${variable.value}`;
          return (
            <VariableComponent key={key} data={variable} service={service} />
          );
        })}
      </ul>
    </>
  );
};

/**
 * A React component to display one node variable in tree.
 * @param data An array of variables.
 * @param service The debugger service.
 */
const VariableComponent = ({
  data,
  service
}: {
  data: VariablesModel.IVariable;
  service: IDebugger;
}) => {
  const [variable] = useState(data);
  const [expanded, setExpanded] = useState(null);
  const [details, setDetails] = useState(null);
  const stylesCaret = {
    transform: `rotate(90deg)`
  };

  const styleName = {
    color: 'var(--jp-mirror-editor-attribute-color)'
  };

  const styleType = {
    color: 'var(--jp-mirror-editor-string-color)'
  };

  const expandable =
    variable.variablesReference !== 0 || variable.type === 'function';

  const onVariableClicked = async (e: React.MouseEvent) => {
    if (!expandable) {
      return;
    }
    e.stopPropagation();
    const variableDetails = await service.getVariableDetails(
      variable.variablesReference
    );
    setExpanded(!expanded);
    setDetails(variableDetails);
  };

  return (
    <li onClick={e => onVariableClicked(e)}>
      {expandable && (
        <span className="caret" style={expanded ? stylesCaret : {}}>
          ▶
        </span>
      )}
      <span style={styleName}>{variable.name}</span>
      <span>: </span>
      <span style={styleType}>{convertType(variable)}</span>
      {expanded && details && (
        <VariablesComponent
          key={variable.name}
          data={details}
          service={service}
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
    model: VariablesModel;
    /**
     * The debugger service.
     */
    service: IDebugger;
  }
}
