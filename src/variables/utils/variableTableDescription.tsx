// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReactWidget } from '@jupyterlab/apputils';

import { SplitPanel, Widget } from '@phosphor/widgets';

import React, { useState } from 'react';

import { IVariablesModel } from '../model';

import useTbody from './useTbody';

const ROW_CLASS = 'jp-DebuggerSidebarVariables-table-row';
const HEAD_CLASS = 'jp-DebuggerSidebarVariables-table-head';

const TableHead = () => {
  const leftStyle = { width: '25%' };
  const rightStyle = { width: '75%' };
  const element = (
    <thead>
      <tr>
        <th style={leftStyle} className={HEAD_CLASS}>
          Name
        </th>
        <th style={rightStyle} className={HEAD_CLASS}>
          Value
        </th>
      </tr>
    </thead>
  );

  return element;
};

const Table = ({ model }: any) => {
  const [variables, setVariables] = useState(model.variables);
  const [variable, TableBody] = useTbody(variables, model.variable, ROW_CLASS);

  model.changeVariables.connect((model: any, updates: any) => {
    if (updates !== variables) {
      setVariables(updates);
    }
  });

  model.variable = variable;
  return (
    <table>
      <TableHead />
      <TableBody />
    </table>
  );
};

class TableVariableWidget extends ReactWidget {
  state: IVariablesModel;

  constructor(props: any) {
    super(props);
    this.state = props;
  }

  render() {
    return <Table model={this.state} />;
  }
}

export class VariableTableDescription extends SplitPanel {
  private _model: IVariablesModel;

  constructor(model: IVariablesModel) {
    super();
    this._model = model;
    const myWidget: Widget = new TableVariableWidget(this._model);
    this.addWidget(myWidget);
  }
}
