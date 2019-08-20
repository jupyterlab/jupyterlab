import { Widget, Panel } from '@phosphor/widgets';
import { IVariablesModel } from '../model';
import React, { useState } from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import useTbody from './useTbody';
import { VariablesSearch } from './toogle';

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
    <table>
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
    </table>
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
    <div>
      <TableHead />
      <TableBody />
    </div>
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

export class VariableTableDescription extends Panel {
  private _model: IVariablesModel;
  private searchParams: Widget;
  private myWidget: Widget;
  constructor(model: IVariablesModel) {
    super();
    this._model = model;
    this.searchParams = new VariablesSearch(this._model);
    this.addWidget(this.searchParams);
    this.myWidget = new TableVariableWidget(this._model);
    this.addWidget(this.myWidget);
  }

  protected onResize(msg: Widget.ResizeMessage): void {
    super.onResize(msg);
    this.resizeBody(msg);
  }

  protected getBody() {
    if (this.myWidget && this.myWidget.node && this.myWidget.node.childNodes) {
      return (
        (this.myWidget.node.children[0].children[1] as HTMLElement) || null
      );
    }
  }

  protected getHead() {
    if (this.myWidget && this.myWidget.node && this.myWidget.node.childNodes) {
      return (
        (this.myWidget.node.children[0].children[0] as HTMLElement) || null
      );
    }
  }

  protected resizeBody(msg: Widget.ResizeMessage): void {
    const head = this.getHead();
    const body = this.getBody();
    if (body && head) {
      const totalHeight = msg.height;
      const headHeight = head.offsetHeight;
      const bodyHeight = totalHeight - headHeight - 20;
      body.style.height = `${bodyHeight}px`;
    }
  }
}
