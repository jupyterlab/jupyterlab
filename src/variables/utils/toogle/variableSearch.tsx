import { Panel, Widget } from '@phosphor/widgets';
import React, { useState } from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { IVariablesModel } from '../../model';

const SEARCH_ITEM = 'jp-Search-item';

export class VariablesSearch extends Panel {
  scope: Widget;
  search: Widget;

  constructor(model: any) {
    super();
    this.addClass('jp-DebuggerSidebarVariable-Search');
    this.scope = new VariableScopeSearch();
    this.search = new VariableSearchInput(model);
    this.scope.addClass(SEARCH_ITEM);
    this.search.addClass(SEARCH_ITEM);
    this.addWidget(this.scope);
    this.addWidget(this.search);
  }
}

const SearchComponent = ({ model }: any) => {
  const [state, setState] = useState('');
  model.filter = state;
  return (
    <div>
      <input
        placeholder="Search..."
        className="jp-DebuggerSidebarVariable-Search-input"
        value={state}
        onChange={e => {
          setState(e.target.value);
        }}
      />
    </div>
  );
};

class VariableSearchInput extends ReactWidget {
  search: string;
  model: IVariablesModel;
  constructor(model: IVariablesModel) {
    super();
    this.model = model;
    this.search = model.filter;
  }

  render() {
    return <SearchComponent model={this.model} />;
  }
}

class VariableScopeSearch extends ReactWidget {
  constructor() {
    super();
  }
  open: boolean = false;
  menu: ReactWidget;
  widget: Widget;

  showMenu = function() {
    this.open = !this.open;
    if (this.open) {
    } else {
    }
  };

  render() {
    return (
      <div onClick={() => this.showMenu()}>
        <span className="jp-DebuggerSidebarVariable-Scope-label">local</span>
        <span className="fa fa-caret-down"></span>
      </div>
    );
  }
}

// namespace Internal {
//   export function createOptionsNode(): HTMLElement {
//     const optionsIcon = document.createElement('span');
//     optionsIcon.className = 'fa fa-caret-down';
//     const optionLabel = document.createElement('span');

//     const options = document.createElement('div');
//     options.title = 'Options';
//     optionLabel.innerText = 'local';
//     optionLabel.className = 'jp-DebuggerSidebarVariable-Scope-label';
//     options.appendChild(optionLabel);
//     options.appendChild(optionsIcon);
//     return options;
//   }
// }
