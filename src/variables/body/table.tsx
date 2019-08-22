// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReactWidget } from '@jupyterlab/apputils';

import { ArrayExt } from '@phosphor/algorithm';

import { Widget, PanelLayout } from '@phosphor/widgets';

import React, { useState } from 'react';

import { Variables } from '../index';

export class Table extends ReactWidget {
  constructor(model: Variables.IModel) {
    super();
    this.model = model;
    this.addClass('jp-DebuggerVariables-table');
    const layout = new PanelLayout();
    this.layout = layout;
  }

  render() {
    return <TableComponent model={this.model} />;
  }

  private model: Variables.IModel;

  protected onResize(msg: Widget.ResizeMessage): void {
    super.onResize(msg);
    this.resizeBody(msg);
  }

  private getBody() {
    if (this.node.childNodes) {
      return (this.node.children[0].children[1] as HTMLElement) || null;
    }
  }

  private getHead() {
    if (this.node.childNodes) {
      return (this.node.children[0].children[0] as HTMLElement) || null;
    }
  }

  protected resizeBody(msg: Widget.ResizeMessage): void {
    const head = this.getHead();
    const body = this.getBody();
    if (body && head) {
      const totalHeight =
        msg.height === -1 ? this.node.clientHeight : msg.height;
      const headHeight = head.offsetHeight;
      const bodyHeight = totalHeight - headHeight;
      body.style.height = `${bodyHeight}px`;
    }
  }
}

const TableComponent = ({ model }: { model: Variables.IModel }) => {
  const [variables, setVariables] = useState(model.variables);
  const [variable, TableBody] = useTbody(variables, model.current);

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
            <th style={{ width: '25%' }}>Name</th>
            <th style={{ width: '75%' }}>Value</th>
          </tr>
        </thead>
      </table>
      <TableBody />
    </div>
  );
};

const useTbody = (items: Array<any>, defaultState: any) => {
  const [state, setState] = useState(defaultState);

  const setClassIcon = (typeOf: string) => {
    return typeOf === 'class' ? 'jp-ClassIcon' : 'jp-VariableIcon';
  };

  const List = () => (
    <div style={{ overflow: 'auto' }}>
      <table>
        <tbody>
          {items.map(item => (
            <tr
              key={item.name}
              onClick={e => setState(item)}
              className={state === item ? ' selected' : ''}
            >
              <td style={{ paddingLeft: `${12}px`, width: `${25}%` }}>
                <span
                  className={`jp-Icon jp-Icon-16 ${setClassIcon(item.value)}`}
                ></span>
                {item.name}
              </td>
              <td style={{ paddingLeft: `${12}px`, width: `${75}%` }}>
                {item.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return [state, List, setState];
};
