// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget, SplitPanel, Panel } from '@phosphor/widgets';

import { Variables } from '../index';

import { VariablesTable } from './variablesTable';

import { VariablesSearch } from './variablesSearch';

export class VariablesBody extends Panel {
  constructor(model: Variables.IModel) {
    super();
    this.model = model;
    this.addClass('jp-DebuggerVariables-body');

    const searchParams = new VariablesSearch(this.model);
    const splitPanel = new SplitPanel();
    const table = new VariablesTable(this.model);
    const description = new VariablesDescription(this.model);

    splitPanel.orientation = 'vertical';
    splitPanel.node.style.height = `100%`;
    splitPanel.addWidget(table);
    splitPanel.addWidget(description);

    this.addWidget(searchParams);
    this.addWidget(splitPanel);
  }

  model: Variables.IModel;
}

class VariablesDescription extends Widget {
  constructor(model: Variables.IModel) {
    super();
    this.addClass('jp-DebuggerVariables-description');
    this.model = model;

    this.model.currentChanged.connect(
      (model: Variables.IModel, variable: Variables.IVariable) => {
        this.node.innerHTML = this.renderDescription(this.model.current);
      }
    );
  }

  model: Variables.IModel;

  // Still in progres: rendering description

  protected renderDescription(variable: Variables.IVariable) {
    const descriptionElementDOM = `<b>name: ${variable.name}</b>
                                       <p>type: ${variable.type} </p>
                                       Description:
                                       <p>${variable.description}</p> `;
    return descriptionElementDOM;
  }
}
