// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReactWidget } from '@jupyterlab/apputils';

import { Widget, PanelLayout } from '@phosphor/widgets';

import React, { useState, useRef, useEffect } from 'react';

import { Variables } from '../index';

export class Search extends Widget {
  constructor(model: Variables.IModel) {
    super();
    this.addClass('jp-DebuggerVariables-search');

    const layout = new PanelLayout();
    this.layout = layout;
    this.scope = new ScopeSearch(model);
    this.search = new SearchInput(model);

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

class ScopeSearch extends ReactWidget {
  constructor(model: Variables.IModel) {
    super();
    this.model = model;
    this.node.style.overflow = 'visible';
    this.node.style.width = '85px';
    this.addClass('jp-DebuggerVariables-scope');
  }

  model: Variables.IModel;

  render() {
    return <ScopeMenuComponent model={this.model} />;
  }
}

const useOutsideClick = (
  ref: React.MutableRefObject<any>,
  callback: Function
) => {
  const handleClickOutside = (e: Event) => {
    if (ref.current && !ref.current.contains(e.target)) {
      callback();
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  });
};

const ScopeMenuComponent = ({ model }: { model: Variables.IModel }) => {
  const [toggleState, setToggle] = useState(false);
  const [scopes, setScopes] = useState(model.scopes);
  const [scope, setScope] = useState(model.currentScope);
  const wrapperRef = useRef(null);

  model.scopesChanged.connect((_, update) => {
    if (!!update && update.length > 0) {
      setScopes(update);
      setScope(update[0]);
    }
  });

  const onClickOutSide = () => {
    setToggle(false);
  };

  const toggle = () => {
    if (!!scopes) {
      setToggle(!toggleState);
    }
  };

  useOutsideClick(wrapperRef, onClickOutSide);

  const changeScope = (newScope: Variables.IScope) => {
    if (newScope === scope) {
      return;
    }
    setScope(newScope);
    model.currentScope = newScope;
    setToggle(false);
  };

  const List = (
    <ul>
      {!!scopes
        ? scopes.map(scope => (
            <li key={scope.name} onClick={e => changeScope(scope)}>
              {scope.name}
            </li>
          ))
        : null}
    </ul>
  );

  return (
    <div onClick={e => toggle()} ref={wrapperRef}>
      <span className="label">{scope ? scope.name : '-'}</span>
      <span className="fa fa-caret-down"></span>
      {toggleState ? List : null}
    </div>
  );
};
