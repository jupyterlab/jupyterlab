// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReactWidget } from '@jupyterlab/apputils';

import { Widget, PanelLayout } from '@phosphor/widgets';

import React, { useState } from 'react';

import { Variables } from '../index';

export class Search extends Widget {
  constructor(model: Variables.IModel) {
    super();
    this.addClass('jp-DebuggerVariables-search');

    const layout = new PanelLayout();
    this.layout = layout;
    this.search = new SearchInput(model);

    // layout.addWidget(this.search);
  }

  readonly search: Widget;
}

const SearchComponent = ({ model }: any) => {
  const [state, setState] = useState('');
  model.filter = state;
  return (
    <div>
      <span className="fa fa-search"></span>
      <input
        placeholder="Search..."
        value={state}
        onChange={e => {
          setState(e.target.value);
        }}
      />
    </div>
  );
};

class SearchInput extends ReactWidget {
  search: string;
  model: Variables.IModel;
  constructor(model: Variables.IModel) {
    super();
    this.model = model;
    this.search = model.filter;
    this.node.style;
    this.addClass('jp-DebuggerVariables-input');
  }

  render() {
    return <SearchComponent model={this.model} />;
  }
}
