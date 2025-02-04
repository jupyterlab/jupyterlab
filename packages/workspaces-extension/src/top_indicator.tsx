import {
  blankIcon,
  checkIcon,
  LabIcon,
  ReactWidget
} from '@jupyterlab/ui-components';
import React, { useEffect, useRef, useState } from 'react';
import { searchIcon } from '@jupyterlab/ui-components';
import { IWorkspacesModel } from '@jupyterlab/workspaces';

interface IWorkspaceSelectorProps {
  currentWorkspace: string;
  identifiers: string[];
  openWorkspace: (workspace: string) => void;
  model?: IWorkspacesModel;
}

const WorkspaceSelector: React.FC<IWorkspaceSelectorProps> = ({
  currentWorkspace,
  identifiers,
  openWorkspace
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

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
        className="jp-WorkspaceSelectorHeader"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="jp-WorkspaceSelectorCurrent">
          {currentWorkspace.length > 12
            ? `${currentWorkspace.slice(0, 12)}...`
            : currentWorkspace}
        </span>
        <span className="jp-WorkspaceSelectorCaret">
          {isExpanded ? '▲' : '▼'}
        </span>
      </button>

      {isExpanded && (
        <div className="jp-WorkspaceSelectorDropdown">
          <div className="jp-WorkspaceSelectorSearch">
            <div className="jp-WorkspaceSelectorSearchIcon">
              <LabIcon.resolveReact icon={searchIcon} />
            </div>
            <input
              type="text"
              className="jp-WorkspaceSelectorInput"
              placeholder="Search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          <ul className="jp-WorkspaceSelectorList">
            {filteredIdentifiers.map(identifier => (
              <li
                key={identifier}
                className="jp-WorkspaceSelectorItem"
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
  private currentWorkspace: string;
  private identifiers: string[];
  private openWorkspace: (workspace: string) => void;

  constructor(props: IWorkspaceSelectorProps) {
    super();
    this.id = 'jp-workspace-top-indicator';
    this.addClass('jp-react-widget');
    this.identifiers = props.identifiers;
    this.openWorkspace = props.openWorkspace;
    this.currentWorkspace = props.currentWorkspace;
    props.model?.refreshed.connect(() => {
      this.identifiers = props.model?.identifiers!;
      this.update();
    });
  }

  render(): JSX.Element {
    return this.currentWorkspace &&
      !this.currentWorkspace.startsWith('auto-') &&
      this.currentWorkspace !== 'default' ? (
      <WorkspaceSelector
        currentWorkspace={this.currentWorkspace}
        identifiers={this.identifiers}
        openWorkspace={this.openWorkspace}
      />
    ) : (
      <></>
    );
  }
}
