// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ArrayExt } from '@lumino/algorithm';

import { IDebugger } from '../tokens';

import { ReactWidget } from '@jupyterlab/apputils';

import React, { useEffect, useState } from 'react';

import { VariablesModel } from './model';

/**VariablesComponent
 * The body for a Va    console.log({ self });riables Panel.
 */
export class VariablesBodyTable extends ReactWidget {
  /**
   * Instantiate a new Body for the Variables Panel.
   * @param model The model for the variables.
   */
  constructor(options: VariablesBodyTable.IOptions) {
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
            data={scope.variables}
            model={this._model}
            service={this._service}
          />
        ))}
      </>
    );
  }

  private _model: VariablesModel;
  private _service: IDebugger;
  private _scopes: VariablesModel.IScope[] = [];
}

const VariablesComponent = ({
  data,
  model,
  service
}: {
  data: VariablesModel.IVariable[];
  model: VariablesModel;
  service: IDebugger;
}) => {
  const [variables, setVariables] = useState(data);
  const [details, setDetials] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setVariables(data);
  }, [data]);

  const onClickVariable = async (variable: VariablesModel.IVariable) => {
    if (selected === variable) {
      setSelected(null);
      setDetials(null);
      return;
    }
    const variableDetials = await service.getVariableDetails(variable);
    setSelected(variable);
    setDetials(variableDetials);
  };

  const Tbody = (variables: VariablesModel.IVariable[]) => (
    <tbody>
      {variables?.map(variable => (
        <tr
          onClick={() => onClickVariable(variable)}
          key={variable.evaluateName}
        >
          <td>{variable.name}</td>
          <td>{convertType(variable)}</td>
          <td className={selected === variable ? 'selected' : ''}>
            {variable.value}
          </td>
        </tr>
      ))}
    </tbody>
  );

  const onClose = () => {
    setDetials(null);
    setSelected(null);
  };

  return (
    <>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Value</th>
          </tr>
        </thead>
        {Tbody(variables)}
      </table>
      {details && (
        <VariablesComponentDetails
          selected={selected}
          data={details}
          onClose={onClose}
          service={service}
          model={model}
        />
      )}
    </>
  );
};

const VariablesComponentDetails = (props: any) => {
  console.log({ props });
  useEffect(() => {
    dragElement(document.getElementById(`test-${props.selected.evaluateName}`));
  }, []);

  return (
    <div
      id={`test-${props.selected.evaluateName}`}
      className={'jp-detailsVariable-box'}
    >
      <div id={'header'}>
        <span>{`${props.selected.evaluateName}-${convertType(
          props.selected as VariablesModel.IVariable
        )}`}</span>
      </div>
      <div>
        <VariablesComponent
          data={props.data}
          model={props.model}
          service={props.service}
        />
      </div>
      <button onClick={props.onClose}>Close</button>
    </div>
  );
};

function dragElement(elmnt: HTMLElement) {
  if (!elmnt) {
    return;
  }
  let pos1 = 0;
  let pos2 = 0;
  let pos3 = 0;
  let pos4 = 0;
  if (document.getElementById(elmnt.id)) {
    document.getElementById(elmnt.id).onmousedown = dragMouseDown;
  } else {
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = elmnt.offsetTop - pos2 + 'px';
    elmnt.style.left = elmnt.offsetLeft - pos1 + 'px';
  }

  function closeDragElement() {
    /* stop moving when mouse button is released:*/
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

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
      return value === 'False' ? false : true;
    case 'str':
      return value.slice(1, value.length - 1);
    default:
      return type;
  }
};

namespace VariablesBodyTable {
  export interface IOptions {
    model: VariablesModel;
    service: IDebugger;
  }
}
