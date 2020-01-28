// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ArrayExt } from '@lumino/algorithm';

import { ReactWidget } from '@jupyterlab/apputils';

import React, { useEffect, useState } from 'react';

import { IDebugger } from '../tokens';

import { VariablesModel } from './model';

/**
 * The body for a Variables Panel.
 */
export class VariablesBodyTree extends ReactWidget {
  /**
   * Instantiate a new Body for the Variables Panel.
   * @param model The model for the variables.
   */
  constructor(options: VariablesBodyTree.IOptions) {
    super();
    this._model = options.model;
    this._service = options.service;
    this.addClass('jp-DebuggerVariables-body');
    this._model.changed.connect(this.updateScopes, this);
  }

  private updateScopes(self: VariablesModel) {
    if (ArrayExt.shallowEqual(this._scopes, self.scopes)) {
      return;
    }
    this._scopes = self.scopes;
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
 * @param model The model for the variables.
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

  // const styleValue = {
  //   color: THEME[variable.type] ?? 'var(--jp-mirror-editor-number-color)'
  // };

  const styleName = {
    color: 'var(--jp-mirror-editor-attribute-color)'
  };

  const styleType = {
    color: 'var(--jp-mirror-editor-string-color)'
  };

  const nonExpanded = variable.variablesReference === 0;

  const onClickVariable = async (e: React.MouseEvent) => {
    if (nonExpanded) {
      return;
    }
    e.stopPropagation();
    const variableDetials = await service.getVariableDetails(
      variable.variablesReference
    );
    console.log({ variableDetials });
    setExpanded(!expanded);
    setDetails(variableDetials);
  };

  return (
    <li onClick={e => onClickVariable(e)}>
      {!nonExpanded && (
        <span className="caret" style={expanded ? stylesCaret : {}}>
          ▶
        </span>
      )}
      <span style={styleName}>{variable.evaluateName}</span>
      <span>: </span>
      <span style={styleType}>{convertType(variable)}</span>
      {expanded && (
        <ul>
          {/* <li>
            value: <span style={styleValue}>{variable.value}</span>
          </li> */}
          {details && <VariablesComponent data={details} service={service} />}
        </ul>
      )}
    </li>
  );
};

/**
 * Convert a variable to a primitive type.
 * @param variable The variable.
 */
const convertType = (variable: VariablesModel.IVariable) => {
  const { type, value } = variable;
  switch (type) {
    case 'int':
      return parseInt(value, 10);
    case 'float':
      return parseFloat(value);
    case 'bool':
      return value;
    case 'str':
      return value.slice(1, value.length - 1);
    case 'list':
      return 'List';
    case 'dict':
      return 'Dict';
    case 'function':
      return 'Function';
    default:
      return value;
  }
};

namespace VariablesBodyTree {
  export interface IOptions {
    model: VariablesModel;
    service: IDebugger;
  }
}

/**
 * Default theme for the variable tree view.
 */
// const THEME: { [index: string]: string } = {
//   dict: 'var(--jp-mirror-editor-attribute-color)',
//   null: 'var(--jp-mirror-editor-builtin-color)',
//   regexp: 'var(--jp-mirror-editor-string-color)',
//   str: 'var(--jp-mirror-editor-string-color)',
//   symbol: 'var(--jp-mirror-editor-operator-color)',
//   number: 'var(--jp-mirror-editor-number-color)',
//   bool: 'var(--jp-mirror-editor-builtin-color))',
//   function: 'var(--jp-mirror-editor-def-color))'
// };
