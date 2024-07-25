// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ITranslator, nullTranslator } from '@jupyterlab/translation';

import {
  getTreeItemElement,
  ReactWidget,
  searchIcon
} from '@jupyterlab/ui-components';

import { Button, TreeItem, TreeView } from '@jupyter/react-components';

import { ArrayExt } from '@lumino/algorithm';

import { CommandRegistry } from '@lumino/commands';

import { DebugProtocol } from '@vscode/debugprotocol';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { convertType } from '.';

import { Debugger } from '../../debugger';

import { IDebugger } from '../../tokens';

import { VariablesModel } from './model';

/**
 * The body for tree of variables.
 */
export class VariablesBodyTree extends ReactWidget {
  /**
   * Instantiate a new Body for the tree of variables.
   *
   * @param options The instantiation options for a VariablesBodyTree.
   */
  constructor(options: VariablesBodyTree.IOptions) {
    super();
    this._commands = options.commands;
    this._service = options.service;
    this._translator = options.translator;

    const model = (this.model = options.model);
    model.changed.connect(this._updateScopes, this);

    this.addClass('jp-DebuggerVariables-body');
  }

  /**
   * Render the VariablesBodyTree.
   */
  render(): JSX.Element {
    const scope =
      this._scopes.find(scope => scope.name === this._scope) ?? this._scopes[0];

    const handleSelectVariable = (variable: IDebugger.IVariable) => {
      this.model.selectedVariable = variable;
    };

    if (scope?.name !== 'Globals') {
      this.addClass('jp-debuggerVariables-local');
    } else {
      this.removeClass('jp-debuggerVariables-local');
    }

    return scope ? (
      <>
        <TreeView className="jp-TreeView">
          <VariablesBranch
            key={scope.name}
            commands={this._commands}
            service={this._service}
            data={scope.variables}
            filter={this._filter}
            translator={this._translator}
            handleSelectVariable={handleSelectVariable}
          />
        </TreeView>
      </>
    ) : (
      <div></div>
    );
  }

  /**
   * Set the variable filter list.
   */
  set filter(filter: Set<string>) {
    this._filter = filter;
    this.update();
  }

  /**
   * Set the current scope
   */
  set scope(scope: string) {
    this._scope = scope;
    this.update();
  }

  /**
   * Update the scopes and the tree of variables.
   *
   * @param model The variables model.
   */
  private _updateScopes(model: VariablesModel): void {
    if (ArrayExt.shallowEqual(this._scopes, model.scopes)) {
      return;
    }
    this._scopes = model.scopes;
    this.update();
  }

  protected model: IDebugger.Model.IVariables;
  private _commands: CommandRegistry;
  private _scope = '';
  private _scopes: IDebugger.IScope[] = [];
  private _filter = new Set<string>();
  private _service: IDebugger;
  private _translator: ITranslator | undefined;
}

interface IVariablesBranchProps {
  /**
   * The commands registry.
   */
  commands: CommandRegistry;
  data: IDebugger.IVariable[];
  service: IDebugger;
  filter?: Set<string>;
  /**
   * The application language translator
   */
  translator?: ITranslator;
  /**
   * Callback on variable selection
   */
  handleSelectVariable?: (variable: IDebugger.IVariable) => void;
}

/**
 * A React component to display a list of variables.
 *
 * @param {object} props The component props.
 * @param props.data An array of variables.
 * @param props.service The debugger service.
 * @param props.filter Optional variable filter list.
 */
const VariablesBranch = (props: IVariablesBranchProps): JSX.Element => {
  const { commands, data, service, filter, translator, handleSelectVariable } =
    props;
  const [variables, setVariables] = useState(data);

  useEffect(() => {
    setVariables(data);
  }, [data]);

  return (
    <>
      {variables
        .filter(
          variable => !(filter || new Set()).has(variable.evaluateName || '')
        )
        .map(variable => {
          const key = `${variable.name}-${variable.evaluateName}-${variable.type}-${variable.value}-${variable.variablesReference}`;
          return (
            <VariableComponent
              key={key}
              commands={commands}
              data={variable}
              service={service}
              filter={filter}
              translator={translator}
              onSelect={handleSelectVariable}
            />
          );
        })}
    </>
  );
};

/**
 * VariableComponent properties
 */
interface IVariableComponentProps {
  /**
   * The commands registry.
   */
  commands: CommandRegistry;
  /**
   * Variable description
   */
  data: IDebugger.IVariable;
  /**
   * Filter applied on the variable list
   */
  filter?: Set<string>;
  /**
   * The Debugger service
   */
  service: IDebugger;
  /**
   * The application language translator
   */
  translator?: ITranslator;
  /**
   * Callback on selection
   */
  onSelect?: (variable: IDebugger.IVariable) => void;
}

function _prepareDetail(variable: IDebugger.IVariable) {
  if (
    variable.type === 'float' &&
    (variable.value == 'inf' || variable.value == '-inf')
  ) {
    return variable.value;
  }
  const detail = convertType(variable);
  if (variable.type === 'float' && isNaN(detail as number)) {
    // silence React warning:
    // `Received NaN for the `children` attribute. If this is expected, cast the value to a string`
    return 'NaN';
  }
  return detail;
}

/**
 * A React component to display one node variable in tree.
 *
 * @param {object} props The component props.
 * @param props.data An array of variables.
 * @param props.service The debugger service.
 * @param props.filter Optional variable filter list.
 */
const VariableComponent = (props: IVariableComponentProps): JSX.Element => {
  const { commands, data, service, filter, translator, onSelect } = props;
  const [variable] = useState(data);
  const [showDetailsButton, setShowDetailsButton] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [variables, setVariables] = useState<DebugProtocol.Variable[] | null>(
    null
  );

  const trans = useMemo(
    () => (translator ?? nullTranslator).load('jupyterlab'),
    [translator]
  );
  const onSelection = onSelect ?? (() => void 0);

  const expandable = useMemo(
    () => variable.variablesReference !== 0 || variable.type === 'function',
    [variable.variablesReference, variable.type]
  );

  const details = useMemo(() => _prepareDetail(variable), [variable]);

  const hasMimeRenderer = useMemo(
    () =>
      ![
        'special variables',
        'protected variables',
        'function variables',
        'class variables'
      ].includes(variable.name),
    [variable.name]
  );

  const disableMimeRenderer = useMemo(
    () =>
      !service.model.hasRichVariableRendering ||
      !commands.isEnabled(Debugger.CommandIDs.renderMimeVariable, {
        name: variable.name,
        frameID: service.model.callstack.frame?.id
      } as any),
    [
      service.model.hasRichVariableRendering,
      variable.name,
      service.model.callstack.frame?.id
    ]
  );

  const fetchChildren = useCallback(async () => {
    if (expandable && !variables) {
      setVariables(await service.inspectVariable(variable.variablesReference));
    }
  }, [expandable, service, variable.variablesReference, variables]);

  const onVariableClicked = useCallback(
    async (event: React.MouseEvent): Promise<void> => {
      const item = getTreeItemElement(event.target as HTMLElement);
      if (event.currentTarget !== item) {
        return;
      }

      if (!expandable) {
        return;
      }
      setExpanded(!expanded);
    },
    [expandable, expanded]
  );

  const onSelectChange = useCallback(
    (event: CustomEvent) => {
      if (event.currentTarget === event.detail && event.detail.selected) {
        onSelection(variable);
      }
    },
    [variable]
  );

  const renderVariable = useCallback(() => {
    commands
      .execute(Debugger.CommandIDs.renderMimeVariable, {
        name: variable.name,
        frameID: service.model.callstack.frame?.id
      } as any)
      .catch(reason => {
        console.error(`Failed to render variable ${variable?.name}`, reason);
      });
  }, [commands, variable.name, service.model.callstack.frame?.id]);

  const onContextMenu = useCallback(
    (event: React.MouseEvent<HTMLElement, MouseEvent>): void => {
      const item = getTreeItemElement(event.target as HTMLElement);
      if (event.currentTarget !== item) {
        return;
      }

      onSelection(variable);
    },
    [variable]
  );

  return (
    <TreeItem
      className="jp-TreeItem nested"
      expanded={expanded}
      onSelect={onSelectChange}
      onExpand={fetchChildren}
      onClick={(e): Promise<void> => onVariableClicked(e)}
      onContextMenu={onContextMenu}
      onKeyDown={event => {
        if (event.key == 'Enter') {
          if (hasMimeRenderer && showDetailsButton) {
            onSelection(variable);
            renderVariable();
          }
        }
      }}
      onFocus={event => {
        setShowDetailsButton(!event.defaultPrevented);
        event.preventDefault();
      }}
      onBlur={event => {
        setShowDetailsButton(false);
      }}
      onMouseOver={(event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        setShowDetailsButton(!event.defaultPrevented);
        event.preventDefault();
      }}
      onMouseLeave={(event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        setShowDetailsButton(false);
      }}
    >
      <span className="jp-DebuggerVariables-name">{variable.name}</span>
      {details && (
        <span className="jp-DebuggerVariables-detail">{details}</span>
      )}
      {hasMimeRenderer && showDetailsButton && (
        <Button
          className="jp-DebuggerVariables-renderVariable"
          appearance="stealth"
          slot="end"
          disabled={disableMimeRenderer}
          onClick={e => {
            e.stopPropagation();
            renderVariable();
          }}
          title={trans.__('Render variable: %1', variable?.name)}
        >
          <searchIcon.react tag={null} />
        </Button>
      )}
      {variables ? (
        <VariablesBranch
          key={variable.name}
          commands={commands}
          data={variables}
          service={service}
          filter={filter}
          translator={translator}
          handleSelectVariable={onSelect}
        />
      ) : (
        /* Trick to ensure collapse button is displayed
           when variables are not loaded yet */
        expandable && <TreeItem />
      )}
    </TreeItem>
  );
};

/**
 * A namespace for VariablesBodyTree `statics`.
 */
namespace VariablesBodyTree {
  /**
   * Instantiation options for `VariablesBodyTree`.
   */
  export interface IOptions {
    /**
     * The variables model.
     */
    model: IDebugger.Model.IVariables;
    /**
     * The debugger service.
     */
    service: IDebugger;
    /**
     * The commands registry.
     */
    commands: CommandRegistry;
    /**
     * The application language translator
     */
    translator?: ITranslator;
  }
}
