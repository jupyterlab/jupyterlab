import { Panel, Widget } from '@phosphor/widgets';
import * as React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';

const SEARCH_ITEM = 'jp-Search-item';

export class VariablesSearch extends Panel {
  scope: Widget;
  search: Widget;

  constructor() {
    super();
    this.addClass('jp-DebuggerSidebarVariable-Search');
    this.scope = new VariableScopeSearch();
    this.search = new VariableSearchInput();
    this.scope.addClass(SEARCH_ITEM);
    this.search.addClass(SEARCH_ITEM);
    this.addWidget(this.scope);
    this.addWidget(this.search);
  }
}

class VariableSearchInput extends ReactWidget {
  constructor() {
    super();
  }

  render() {
    return (
      <div>
        <input
          placeholder="Search..."
          className="jp-DebuggerSidebarVariable-Search-input"
        />
      </div>
    );
  }
}

class VariableScopeSearch extends ReactWidget {
  constructor() {
    super();
  }

  render() {
    return (
      <div>
        <span className="jp-DebuggerSidebarVariable-Scope-label">local</span>{' '}
        <span className="fa fa-caret-down"></span>
      </div>
    );
  }
}
