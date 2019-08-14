import { SplitPanel, Widget } from '@phosphor/widgets';
import { IVariablesModel } from '../model';
import React, { useState } from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import useTbody from './useTbody';

const ROW_CLASS = 'jp-DebuggerSidebarVariables-table-row';
const HEAD_CLASS = 'jp-DebuggerSidebarVariables-table-head';

const TableHead = () => {
  var styleElement_1 = {
    width: '25%'
  };
  var styleElement_2 = {
    width: '75%'
  };
  const element = (
    <thead>
      <tr>
        <th style={styleElement_1} className={HEAD_CLASS}>
          Name
        </th>
        <th style={styleElement_2} className={HEAD_CLASS}>
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

  model.changeVariables.connect((model: any, new_variables: any) => {
    if (new_variables === variables) {
      return;
    }
    setVariables(new_variables);
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
