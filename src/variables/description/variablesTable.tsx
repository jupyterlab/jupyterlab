// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReactWidget } from '@jupyterlab/apputils';

import { ArrayExt } from '@phosphor/algorithm';

import { Widget, Panel } from '@phosphor/widgets';

import React, { useState } from 'react';

import { Variables } from '../index';

import { VariablesSearch } from '../toggle';

import useTbody from './useTbody';

const ROW_CLASS = 'jp-DebuggerVariables-table-row';

const HEAD_CLASS = 'jp-DebuggerVariables-table-head';

export class VariablesTable extends Panel {
  constructor(model: Variables.IModel) {
    super();
    this._model = model;
    this.searchParams = new VariablesSearch(this._model);
    this.addWidget(this.searchParams);
    this.myWidget = new TableVariableWidget(this._model);
    this.addWidget(this.myWidget);
  }

  private _model: Variables.IModel;
  private searchParams: Widget;
  private myWidget: Widget;

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

const TableComponent = ({ model }: { model: Variables.IModel }) => {
  const [variables, setVariables] = useState(model.variables);
  const [variable, TableBody] = useTbody(variables, model.current, ROW_CLASS);

  model.variablesChanged.connect((_: any, updates) => {
    if (ArrayExt.shallowEqual(variables, updates)) {
      return;
    }
    setVariables(updates);
  });

  model.current = variable;
  return (
    <div>
      <table>
        <thead>
          <tr>
            <th style={{ width: '25%' }} className={HEAD_CLASS}>
              Name
            </th>
            <th style={{ width: '75%' }} className={HEAD_CLASS}>
              Value
            </th>
          </tr>
        </thead>
      </table>
      <TableBody />
    </div>
  );
};

class TableVariableWidget extends ReactWidget {
  state: Variables.IModel;

  constructor(props: any) {
    super(props);
    this.state = props;
  }

  render() {
    return <TableComponent model={this.state} />;
  }
}
