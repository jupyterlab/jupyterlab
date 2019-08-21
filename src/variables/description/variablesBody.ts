// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Panel, SplitPanel, Widget } from '@phosphor/widgets';

import { Variables } from '../index';

import { VariablesTable } from './variablesTable';

export class VariablesBody extends SplitPanel {
  constructor(model: Variables.IModel) {
    super();
    this.orientation = 'vertical';
    this.model = model;
    this.currentVariable = this.model.current;
    this.addClass('jp-DebuggerVariables-body');

    this.table = new VariablesTable(this.model);
    this.table.addClass('jp-DebuggerVariables-table');
    this.addWidget(this.table);

    this.descriptionBox = new Panel();
    this.descriptionBox.addClass('jp-DebuggerVariables-description');

    this.addWidget(this.descriptionBox);
    this.descriptionBox.node.innerHTML = '<b> Select Variable </b>';

    this.model.currentChanged.connect(
      (model: Variables.IModel, variable: Variables.IVariable) => {
        this.descriptionBox.node.innerHTML = this.renderDescription(
          this.model.current
        );
      }
    );
  }

  readonly searchParams: Widget;
  readonly table: Widget;
  readonly descriptionBox: Panel;

  model: Variables.IModel;
  currentVariable: any;

  // Still in progres: rendering description

  protected renderDescription(variable: Variables.IVariable) {
    const descriptionElementDOM = `<b>name: ${variable.name}</b>
                                       <p>type: ${variable.type} </p>
                                       Description:
                                       <p>${variable.description}</p> `;
    return descriptionElementDOM;
  }
}
