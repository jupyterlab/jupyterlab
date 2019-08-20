// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Panel, SplitPanel, Widget } from '@phosphor/widgets';

import { Variables } from '../variables';

import { VariableTableDescription } from './variableTableDescription';

export class VariableDescription extends SplitPanel {
  readonly searchParams: Widget;
  readonly table: Widget;
  readonly descriptionBox: Panel;

  model: Variables.Model;
  currentVariable: any;

  constructor(model: Variables.Model) {
    super();
    this.orientation = 'vertical';
    this.model = model;
    this.currentVariable = this.model.current;

    this.table = new VariableTableDescription(this.model);
    this.table.addClass('jp-DebuggerSidebarVariable-table');
    this.addWidget(this.table);

    this.descriptionBox = new Panel();
    this.descriptionBox.addClass('jp-DebuggerSidebarVariable-description');

    this.addWidget(this.descriptionBox);
    this.descriptionBox.node.innerHTML = '<b> Select Variable </b>';

    this.model.currentChanged.connect(
      (model: Variables.Model, variable: Variables.IVariable) => {
        this.descriptionBox.node.innerHTML = this.renderDescription(
          this.model.current
        );
      }
    );
  }

  // Still in progres: rendering description

  protected renderDescription(variable: Variables.IVariable) {
    const descriptionElementDOM = `<b>name: ${variable.name}</b>
                                       <p>type: ${variable.type} </p>
                                       Description:
                                       <p>${variable.description}</p> `;
    return descriptionElementDOM;
  }
}
