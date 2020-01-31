// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ArrayExt } from '@lumino/algorithm';

import { convertType } from '.';

import { ReactWidget } from '@jupyterlab/apputils';

import React, { useEffect, useState } from 'react';

import { IDebugger } from '../tokens';

import { VariablesModel } from './model';

/**
 * The body for tree of Variables .
 */
export class VariablesBodyTree extends ReactWidget {
  /**
   * Instantiate a new Body for the tree of Variables.
   * @param model The model for the variables.
   */
  constructor(options: VariablesBodyTree.IOptions) {
    super();
    this._model = options.model;
    this._service = options.service;
    this.addClass('jp-DebuggerVariables-body');
    this._model.changed.connect(this.updateScopes, this);
  }

  private updateScopes(model: VariablesModel) {
    if (ArrayExt.shallowEqual(this._scopes, model.scopes)) {
      return;
    }
    this._scopes = model.scopes;
    this.update();
  }

  /**
   * Render the VariablesComponent.
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

  private _model: VariablesModel;
  private _scopes: VariablesModel.IScope[] = [];
  private _service: IDebugger;
}

/**
 * A React component to display a list of variables.
 * @param data array of variables.
 * @param service service of Debugger
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
          return (
            <VariableComponent
              key={variable.evaluateName}
              data={variable}
              service={service}
            />
          );
        })}
      </ul>
    </>
  );
};

/**
 * A React component to display one node variable in tree.
 * @param data array of variables.
 * @param service service of Debugger
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
     * The model of Variables.
     */
    model: VariablesModel;
    /**
     * The debug service.
     */
    service: IDebugger;
  }
}
