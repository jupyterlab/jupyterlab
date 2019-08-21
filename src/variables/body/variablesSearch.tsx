// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReactWidget } from '@jupyterlab/apputils';

import { Widget, PanelLayout } from '@phosphor/widgets';

import React, { useState, useRef } from 'react';

import useOutsideClick from './useOutsideClick';

import { Variables } from '../index';

export class VariablesSearch extends Widget {
  constructor(model: any) {
    super();
    this.addClass('jp-DebuggerVariables-Search');

    const layout = new PanelLayout();
    this.layout = layout;
    this.node.style.overflow = 'visible';
    this.scope = new VariableScopeSearch();
    this.search = new VariableSearchInput(model);

    layout.addWidget(this.scope);
    layout.addWidget(this.search);
  }

  readonly scope: Widget;
  readonly search: Widget;
}

const SearchComponent = ({ model }: any) => {
  const [state, setState] = useState('');
  model.filter = state;
  return (
    <input
      placeholder="Search..."
      value={state}
      onChange={e => {
        setState(e.target.value);
      }}
    />
  );
};

class VariableSearchInput extends ReactWidget {
  search: string;
  model: Variables.IModel;
  constructor(model: Variables.IModel) {
    super();
    this.model = model;
    this.search = model.filter;
    this.node.style;
    this.addClass('jp-SearchInput');
  }

  render() {
    return <SearchComponent model={this.model} />;
  }
}

const VariablesMenu = ({ config }: any) => {
  const [toggleState, setToggle] = useState(false);
  const [scope, setScope] = useState('local');
  const wrapperRef = useRef(null);

  const onClickOutSide = () => {
    setToggle(false);
  };

  const toggle = (e: any) => {
    setToggle(!toggleState);
  };

  useOutsideClick(wrapperRef, onClickOutSide);

  const changeScope = (newScope: string) => {
    if (newScope === scope) {
      return;
    }
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
        onClick={e => changeScope('built-in')}
      >
        built-in
      </li>
    </ul>
  );

  return (
    <div onClick={e => toggle(e)} ref={wrapperRef}>
      <span className="label">{scope}</span>
      <span className="fa fa-caret-down"></span>
      {toggleState ? List : null}
    </div>
  );
};

class VariableScopeSearch extends ReactWidget {
  constructor() {
    super();
    this.node.style.overflow = 'visible';
    this.node.style.width = '100px';
    this.addClass('jp-SearchScope');
  }

  render() {
    return <VariablesMenu />;
  }
}
