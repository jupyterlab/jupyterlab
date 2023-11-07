// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ITranslator, nullTranslator } from '@jupyterlab/translation';

import { ISignal, Signal } from '@lumino/signaling';

import {
  caretDownEmptyIcon,
  ReactWidget,
  searchIcon
} from '@jupyterlab/ui-components';

import { CommandRegistry } from '@lumino/commands';

import { JSONExt } from '@lumino/coreutils';

import React, { useCallback, useEffect, useState } from 'react';

import { convertType } from '.';

import { Debugger } from '../../debugger';

import { IDebugger } from '../../tokens';

const BUTTONS_CLASS = 'jp-DebuggerVariables-buttons';

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
    this._hoverChanged = new Signal(this);

    const model = (this.model = options.model);
    model.changed.connect(() => {
      this.update();
    }, this);

    this.addClass('jp-DebuggerVariables-body');
  }

  /**
   * Render the VariablesBodyTree.
   */
  render(): JSX.Element {
    const scope =
      this.model.scopes.find(scope => scope.name === this._scope) ??
      this.model.scopes[0];

    const handleClick = (variable: IDebugger.IVariable) => {
      this.model.expandVariable(variable);
    };

    const handleSelectVariable = (variable: IDebugger.IVariable) => {
      this.model.selectedVariable = variable;
    };
    const collapserIcon = (
      <caretDownEmptyIcon.react stylesheet="menuItem" tag="span" />
    );

    if (scope?.name !== 'Globals') {
      this.addClass('jp-debuggerVariables-local');
    } else {
      this.removeClass('jp-debuggerVariables-local');
    }

    return scope ? (
      <>
        <VariablesList
          filter={this._filter}
          variables={scope.variables}
          handleClick={handleClick}
          handleSelectVariable={handleSelectVariable}
          onHoverChanged={(data: IHoverData) => {
            this._hoverChanged.emit(data);
          }}
          collapserIcon={collapserIcon}
        />
        <TreeButtons
          commands={this._commands}
          service={this._service}
          hoverChanged={this._hoverChanged}
          handleSelectVariable={handleSelectVariable}
          translator={this._translator}
        />
      </>
    ) : (
      <div></div>
    );
  }

  /**
   * The variable filter list.
   */
  get filter(): Set<string> {
    return new Set<string>([...this._filter]);
  }
  set filter(filter: Set<string>) {
    if (!JSONExt.deepEqual([...this._filter], [...filter])) {
      this._filter = filter;
      this.update();
    }
  }

  /**
   * The current scope to display
   */
  get scope(): string {
    return this._scope;
  }
  set scope(scope: string) {
    if (this._scope != scope) {
      this._scope = scope;
      this.update();
    }
  }

  protected model: IDebugger.Model.IVariables;
  private _commands: CommandRegistry;
  private _scope = '';
  private _filter = new Set<string>();
  private _service: IDebugger;
  private _translator: ITranslator | undefined;
  private _hoverChanged: Signal<VariablesBodyTree, IHoverData>;
}

interface IHoverData {
  /**
   * The mouse target.
   */
  target: (EventTarget & HTMLElement) | null;
  /**
   * The variable corresponding to node under cursor.
   */
  variable: IDebugger.IVariable | null;
}

interface ITreeButtonsProps {
  /**
   * The commands registry.
   */
  commands: CommandRegistry;
  /**
   * The debugger service.
   */
  service: IDebugger;
  /**
   * The application language translator
   */
  translator?: ITranslator;
  /**
   * Callback on variable selection
   */
  handleSelectVariable: (variable: IDebugger.IVariable) => void;
  /**
   * Signal to be emitted on mouse over event.
   */
  hoverChanged: ISignal<VariablesBodyTree, IHoverData>;
}

/**
 * The singleton buttons bar shown by the variables.
 */
const TreeButtons = (props: ITreeButtonsProps): JSX.Element => {
  const { commands, service, translator, handleSelectVariable } = props;
  const trans = (translator ?? nullTranslator).load('jupyterlab');

  const [buttonsTop, setButtonsTop] = useState<number>(0);
  const [variable, setVariable] = useState<IDebugger.IVariable | null>(null);

  let stateRefreshLock = 0;

  // Empty dependency array is to only register once per lifetime.
  const handleHover = useCallback((_: VariablesBodyTree, data: IHoverData) => {
    const current = ++stateRefreshLock;
    if (!data.variable) {
      // Handle mouse leave.
      if (current !== stateRefreshLock) {
        return;
      }
      const target = data.target;
      if (
        target &&
        // Note: Element, not HTMLElement to permit entering <svg> icon.
        target instanceof Element &&
        target.closest(`.${BUTTONS_CLASS}`)
      ) {
        // Allow to enter the buttons.
        return;
      }
      setVariable(null);
    } else {
      // Handle mouse over.
      setVariable(data.variable);
      requestAnimationFrame(() => {
        if (current !== stateRefreshLock || !data.target) {
          return;
        }
        setButtonsTop(data.target.offsetTop);
      });
    }
  }, []);

  useEffect(() => {
    props.hoverChanged.connect(handleHover);
    return () => {
      props.hoverChanged.disconnect(handleHover);
    };
  }, [handleHover]);

  return (
    <div
      className={BUTTONS_CLASS}
      style={
        // Positioning and hiding is implemented using compositor-only
        // properties (transform and opacity) for performance.
        {
          transform: `translateY(${buttonsTop}px)`,
          opacity:
            !variable ||
            // Do not show buttons display for special entries, defined in debugpy:
            // https://github.com/microsoft/debugpy/blob/cf0d684566edc339545b161da7c3dfc48af7c7d5/src/debugpy/_vendored/pydevd/_pydevd_bundle/pydevd_utils.py#L359
            [
              'special variables',
              'protected variables',
              'function variables',
              'class variables'
            ].includes(variable.name)
              ? 0
              : 1
        }
      }
    >
      <button
        className="jp-DebuggerVariables-renderVariable"
        disabled={
          !variable ||
          !service.model.hasRichVariableRendering ||
          !commands.isEnabled(Debugger.CommandIDs.renderMimeVariable, {
            name: variable.name,
            frameID: service.model.callstack.frame?.id
          } as any)
        }
        onClick={e => {
          if (!variable || !handleSelectVariable) {
            return;
          }
          e.stopPropagation();
          handleSelectVariable(variable);
          commands
            .execute(Debugger.CommandIDs.renderMimeVariable, {
              name: variable.name,
              frameID: service.model.callstack.frame?.id
            } as any)
            .catch(reason => {
              console.error(
                `Failed to render variable ${variable?.name}`,
                reason
              );
            });
        }}
        title={trans.__('Render variable: %1', variable?.name)}
      >
        <searchIcon.react stylesheet="menuItem" tag="span" />
      </button>
    </div>
  );
};

interface IVariablesListProps {
  variables: IDebugger.IVariable[];

  filter?: Set<string>;
  /**
   * Callback on click
   */
  handleClick: (variable: IDebugger.IVariable) => void;
  /**
   * Callback on variable selection
   */
  handleSelectVariable?: (variable: IDebugger.IVariable) => void;
  /**
   * Callback on mouseOver/mouseLeave event.
   */
  onHoverChanged?: (data: IHoverData) => void;
  /**
   * Collapser icon component
   */
  collapserIcon: JSX.Element;
}

/**
 * A React component to display a list of variables.
 *
 * @param {object} props The component props.
 * @param props.data An array of variables.
 * @param props.service The debugger service.
 * @param props.filter Optional variable filter list.
 */
const VariablesList = (props: IVariablesListProps): JSX.Element => {
  const {
    variables,
    filter,
    handleClick,
    handleSelectVariable,
    onHoverChanged,
    collapserIcon
  } = props;

  return (
    <ul className="jp-DebuggerVariables-branch">
      {variables
        .filter(variable =>
          filter ? !filter.has(variable.evaluateName ?? '') : true
        )
        .map(variable => {
          const key = `${variable.name}-${variable.evaluateName}-${variable.type}-${variable.value}-${variable.variablesReference}`;
          return (
            <VariableComponent
              key={key}
              variable={variable}
              filter={filter}
              onClick={handleClick}
              onSelect={handleSelectVariable}
              onHoverChanged={onHoverChanged}
              collapserIcon={collapserIcon}
            />
          );
        })}
    </ul>
  );
};

/**
 * VariableComponent properties
 */
interface IVariableComponentProps {
  /**
   * Variable description
   */
  variable: IDebugger.IVariable;
  /**
   * Filter applied on the variable list
   */
  filter?: Set<string>;
  /**
   * Callback on click
   */
  onClick: (variable: IDebugger.IVariable) => void;
  /**
   * Callback on selection
   */
  onSelect?: (variable: IDebugger.IVariable) => void;
  /**
   * Callback on mouseOver/mouseLeave event.
   */
  onHoverChanged?: (data: IHoverData) => void;
  /**
   * Collapser icon component
   */
  collapserIcon: JSX.Element;
}

function _prepareDetail(variable: IDebugger.IVariable) {
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
  const { variable, filter, onClick, onSelect, onHoverChanged, collapserIcon } =
    props;

  const onSelection = onSelect ?? (() => void 0);

  const expandable =
    variable.variablesReference !== 0 || variable.type === 'function';

  return (
    <li
      onClick={e => {
        if (!expandable) {
          return;
        }
        e.stopPropagation();
        onClick(variable);
      }}
      onMouseDown={e => {
        e.stopPropagation();
        onSelection(variable);
      }}
      onMouseOver={(event: React.MouseEvent<HTMLLIElement, MouseEvent>) => {
        if (onHoverChanged) {
          onHoverChanged({ target: event.currentTarget, variable });
          event.stopPropagation();
        }
      }}
      onMouseLeave={(event: React.MouseEvent<HTMLLIElement, MouseEvent>) => {
        if (onHoverChanged) {
          onHoverChanged({
            target: event.relatedTarget as EventTarget & HTMLElement,
            variable: null
          });
          event.stopPropagation();
        }
      }}
    >
      <span
        className={
          'jp-DebuggerVariables-collapser' +
          (variable.expanded ? ' jp-mod-expanded' : '')
        }
      >
        {
          // note: using React.cloneElement due to high typestyle cost
          expandable ? React.cloneElement(collapserIcon) : null
        }
      </span>
      <span className="jp-DebuggerVariables-name">{variable.name}</span>
      <span className="jp-DebuggerVariables-detail">
        {_prepareDetail(variable)}
      </span>
      {variable.expanded && variable.children?.length ? (
        <VariablesList
          variables={variable.children}
          filter={filter}
          handleClick={onClick}
          handleSelectVariable={onSelect}
          onHoverChanged={onHoverChanged}
          collapserIcon={collapserIcon}
        />
      ) : null}
    </li>
  );
};

/**
 * A namespace for VariablesBodyTree `statics`.
 */
export namespace VariablesBodyTree {
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
