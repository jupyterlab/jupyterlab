// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget, SplitPanel, Panel } from '@phosphor/widgets';

import { Variables } from '../index';

import { Table } from './table';

import { Search } from './search';

export class Body extends Panel {
  constructor(model: Variables.IModel) {
    super();
    this.model = model;
    this.addClass('jp-DebuggerVariables-body');

    const searchParams = new Search(this.model);
    const splitPanel = new SplitPanel();
    const table = new Table(this.model);
    const description = new Description(this.model);

    splitPanel.orientation = 'vertical';
    splitPanel.node.style.height = `100%`;
    splitPanel.addWidget(table);
    splitPanel.addWidget(description);

    this.addWidget(searchParams);
    this.addWidget(splitPanel);
  }

  model: Variables.IModel;
}

class Description extends Widget {
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
