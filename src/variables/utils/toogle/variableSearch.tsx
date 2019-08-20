import { Panel, Widget } from '@phosphor/widgets';
import React, { useState, useRef } from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { IVariablesModel } from '../../model';
import useOutsideClick from '../../../utils/useOutsideClick';

const SEARCH_ITEM = 'jp-Search-item';

export class VariablesSearch extends Panel {
  scope: Widget;
  search: Widget;

  constructor(model: any) {
    super();
    this.addClass('jp-DebuggerSidebarVariable-Search');
    this.node.style.overflow = 'visible';
    this.scope = new VariableScopeSearch();
    this.search = new VariableSearchInput(model);
    this.scope.addClass(SEARCH_ITEM);
    this.scope.node.style.overflow = 'visible';
    this.scope.node.style.width = '100px';
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

const MenuReact = ({ config }: any) => {
  const [toggleState, setToggle] = useState(false);
  const [scope, setScope] = useState('local');
  const wrapperRef = useRef(null);

  const onClickOutSide = () => {
    setToggle(false);
  };

  const toogle = (e: React.MouseEvent) => {
    setToggle(!toggleState);
  };

  useOutsideClick(wrapperRef, onClickOutSide);

  const changeScope = (newScope: string) => {
    if (newScope === scope) return;
    setScope(newScope);
    setToggle(false);
  };

  const List = (
    <ul className="jp-MenuComponent">
      <li onClick={e => changeScope('local')} className="jp-menu-item">
        local
      </li>
      <li
        className="jp-MenuComponent-item"
        onClick={e => changeScope('global')}
      >
        global
      </li>
      <li
        className="jp-MenuComponent-item"
        onClick={e => changeScope('builin')}
      >
        builin
      </li>
    </ul>
  );

  return (
    <div ref={wrapperRef}>
      <span
        onClick={(e: React.MouseEvent) => {
          toogle(e);
        }}
        className="jp-DebuggerSidebarVariable-Scope-label"
      >
        {scope}
      </span>
      <span className="fa fa-caret-down"></span>
      {toggleState ? List : null}
    </div>
  );
};

class VariableScopeSearch extends ReactWidget {
  constructor() {
    super();
  }
  menu: ReactWidget;
  widget: Widget;

  render() {
    return <MenuReact />;
  }
}
