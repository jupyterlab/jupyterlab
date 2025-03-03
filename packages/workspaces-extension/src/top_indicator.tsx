/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  blankIcon,
  caretDownEmptyThinIcon,
  caretUpEmptyThinIcon,
  checkIcon,
  LabIcon,
  ReactWidget
} from '@jupyterlab/ui-components';
import React, { useEffect, useId, useRef, useState } from 'react';
import { searchIcon } from '@jupyterlab/ui-components';
import { IWorkspacesModel } from '@jupyterlab/workspaces';
import { ITranslator } from '@jupyterlab/translation';

interface IWorkspaceSelectorProps {
  currentWorkspace: string;
  identifiers: string[];
  openWorkspace: (workspace: string) => void;
  translator: ITranslator;
}

interface IWorkspaceSelectorWidgetProps extends IWorkspaceSelectorProps {
  model: IWorkspacesModel;
}

const WorkspaceSelector: React.FC<IWorkspaceSelectorProps> = ({
  currentWorkspace,
  identifiers,
  openWorkspace,
  translator
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownId = useId();
  const trans = translator.load('jupyterlab');

  const filteredIdentifiers = identifiers.filter(identifier =>
    identifier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="jp-WorkspaceSelector" ref={dropdownRef}>
      <button
        className="jp-WorkspaceSelector-header"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls={dropdownId}
      >
        <span className="jp-WorkspaceSelector-current">
          {currentWorkspace.length > 12
            ? `${currentWorkspace.slice(0, 12)}...`
            : currentWorkspace}
        </span>
        <span className="jp-WorkspaceSelector-caret">
          <LabIcon.resolveReact
            icon={isExpanded ? caretUpEmptyThinIcon : caretDownEmptyThinIcon}
          />
        </span>
      </button>

      {isExpanded && (
        <div className="jp-WorkspaceSelector-dropdown" id={dropdownId}>
          <div className="jp-WorkspaceSelector-search">
            <div className="jp-WorkspaceSelector-searchIcon">
              <LabIcon.resolveReact icon={searchIcon} />
            </div>
            <input
              type="text"
              className="jp-WorkspaceSelector-input"
              placeholder={trans.__('Search workspace')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
              aria-autocomplete="list"
              role="combobox"
            />
          </div>

          <ul
            className="jp-WorkspaceSelector-list"
            role="listbox"
            aria-label={trans.__('Workspace')}
          >
            {filteredIdentifiers.map(identifier => (
              <li
                key={identifier}
                className="jp-WorkspaceSelector-item"
                onClick={() => {
                  if (identifier === currentWorkspace) return;
                  openWorkspace(identifier);
                  setIsExpanded(false);
                }}
              >
                <LabIcon.resolveReact
                  icon={identifier === currentWorkspace ? checkIcon : blankIcon}
                />
                {identifier.length > 12
                  ? `${identifier.slice(0, 12)}...`
                  : identifier}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * A Widget for Workspace Selector at topbar
 */
export class WorkspaceSelectorWidget extends ReactWidget {
  constructor(props: IWorkspaceSelectorWidgetProps) {
    super();
    this.id = 'jp-workspace-top-indicator';
    this._identifiers = props.identifiers;
    this._openWorkspace = props.openWorkspace;
    this._currentWorkspace = props.currentWorkspace;
    this._translator = props.translator;
    props.model.refreshed.connect(() => {
      this._identifiers = props.model.identifiers;
      this.update();
    });
  }

  render(): JSX.Element {
    return (
      <WorkspaceSelector
        currentWorkspace={this._currentWorkspace}
        identifiers={this._identifiers}
        openWorkspace={this._openWorkspace}
        translator={this._translator}
      />
    );
  }

  private _currentWorkspace: string;
  private _identifiers: string[];
  private _openWorkspace: (workspace: string) => void;
  private _translator: ITranslator;
}
