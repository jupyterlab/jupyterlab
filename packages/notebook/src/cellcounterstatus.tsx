/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { DOMUtils } from '@jupyterlab/apputils';
import type { Popup } from '@jupyterlab/statusbar';
import { showPopup, TextItem } from '@jupyterlab/statusbar';
import type { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import {
  classes,
  lineFormIcon,
  ReactWidget,
  VDomModel,
  VDomRenderer
} from '@jupyterlab/ui-components';
import React from 'react';
import type { Notebook } from '.';

/**
 * A namespace for CellNumberFormComponent statics.
 */
namespace CellNumberFormComponent {
  /**
   * Props for the form component.
   */
  export interface IProps {
    /**
     * A callback for when the form is submitted.
     */
    handleSubmit: (value: number) => void;

    /**
     * The maximum cell number the form can take.
     */
    maxCell: number;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }

  /**
   * State for the form component.
   */
  export interface IState {
    /**
     * The current value of the form.
     */
    value: string;

    /**
     * Whether the form has focus.
     */
    hasFocus: boolean;

    /**
     * A generated ID for the input field.
     */
    textInputId: string;
  }
}

/**
 * A component for rendering a "go-to-cell" form.
 */
class CellNumberFormComponent extends React.Component<
  CellNumberFormComponent.IProps,
  CellNumberFormComponent.IState
> {
  /**
   * Construct a new CellNumberFormComponent.
   */
  constructor(props: CellNumberFormComponent.IProps) {
    super(props);
    const translator = props.translator || nullTranslator;
    this._trans = translator.load('jupyterlab');
    this.state = {
      value: '',
      hasFocus: false,
      textInputId: DOMUtils.createDomID() + '-cell-number-input'
    };
  }

  /**
   * Focus the element on mount.
   */
  componentDidMount() {
    this._textInput?.focus();
  }

  /**
   * Render the CellNumberFormComponent.
   */
  render() {
    return (
      <div className="jp-lineFormSearch">
        <form name="cellNumberForm" onSubmit={this._handleSubmit} noValidate>
          <div
            className={classes(
              'jp-lineFormWrapper',
              'lm-lineForm-wrapper',
              this.state.hasFocus ? 'jp-lineFormWrapperFocusWithin' : undefined
            )}
          >
            <input
              type="number"
              id={this.state.textInputId}
              className="jp-lineFormInput"
              min={1}
              max={this.props.maxCell}
              onChange={this._handleChange}
              onFocus={this._handleFocus}
              onBlur={this._handleBlur}
              value={this.state.value}
              ref={input => {
                this._textInput = input;
              }}
            />
            <div className="jp-baseLineForm jp-lineFormButtonContainer">
              <lineFormIcon.react
                className="jp-baseLineForm jp-lineFormButtonIcon"
                elementPosition="center"
              />
              <input
                type="submit"
                className="jp-baseLineForm jp-lineFormButton"
                value=""
              />
            </div>
          </div>
          <label
            className="jp-lineFormCaption"
            htmlFor={this.state.textInputId}
          >
            {this._trans.__(
              'Go to cell number between 1 and %1',
              this.props.maxCell
            )}
          </label>
        </form>
      </div>
    );
  }

  /**
   * Handle a change to the value in the input field.
   */
  private _handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ value: event.currentTarget.value });
  };

  /**
   * Handle submission of the input field.
   */
  private _handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const value = parseInt(this._textInput?.value ?? '', 10);
    if (
      !isNaN(value) &&
      isFinite(value) &&
      1 <= value &&
      value <= this.props.maxCell
    ) {
      this.props.handleSubmit(value);
    }

    return false;
  };

  /**
   * Handle focusing of the input field.
   */
  private _handleFocus = () => {
    this.setState({ hasFocus: true });
  };

  /**
   * Handle blurring of the input field.
   */
  private _handleBlur = () => {
    this.setState({ hasFocus: false });
  };

  private _trans: TranslationBundle;
  private _textInput: HTMLInputElement | null = null;
}

/**
 * Props for CellCounterComponent.
 */
namespace CellCounterComponent {
  export interface IProps {
    /**
     * Current active cell number (1-based).
     */
    activeCell: number;

    /**
     * First selected cell number (1-based).
     */
    selectionStart: number;

    /**
     * Last selected cell number (1-based).
     */
    selectionEnd: number;

    /**
     * Total number of notebook cells.
     */
    totalCells: number;

    /**
     * The application language translator.
     */
    translator?: ITranslator;

    /**
     * Click handler used to launch the go-to-cell form.
     */
    handleClick: () => void;
  }
}

/**
 * A pure functional component for rendering a notebook cell counter.
 */
function CellCounterComponent(
  props: CellCounterComponent.IProps
): React.ReactElement<CellCounterComponent.IProps> {
  const translator = props.translator || nullTranslator;
  const trans = translator.load('jupyterlab');
  const source =
    props.selectionStart > 0 && props.selectionStart !== props.selectionEnd
      ? trans.__(
          '%1:%2/%3',
          props.selectionStart,
          props.selectionEnd,
          props.totalCells
        )
      : trans.__('Cell %1/%2', props.activeCell, props.totalCells);
  const keydownHandler = (event: React.KeyboardEvent<HTMLImageElement>) => {
    if (
      event.key === 'Enter' ||
      event.key === 'Spacebar' ||
      event.key === ' '
    ) {
      event.preventDefault();
      event.stopPropagation();
      props.handleClick();
    }
  };

  return (
    <TextItem
      role="button"
      aria-haspopup
      onClick={props.handleClick}
      source={source}
      title={trans.__('Go to cell…')}
      tabIndex={0}
      onKeyDown={keydownHandler}
    />
  );
}

/**
 * A widget implementing a notebook cell counter status item.
 */
export class CellCounterStatus extends VDomRenderer<CellCounterStatus.Model> {
  /**
   * Construct a new CellCounterStatus status item.
   */
  constructor(options: CellCounterStatus.IOptions = {}) {
    super(new CellCounterStatus.Model());
    this.addClass('jp-mod-highlighted');
    this._translator = options.translator || nullTranslator;
  }

  /**
   * Render the status item.
   */
  render(): JSX.Element | null {
    if (this.model === null) {
      return null;
    }

    return (
      <CellCounterComponent
        activeCell={this.model.activeCell}
        selectionStart={this.model.selectionStart}
        selectionEnd={this.model.selectionEnd}
        totalCells={this.model.totalCells}
        translator={this._translator}
        handleClick={() => this._handleClick()}
      />
    );
  }

  /**
   * A click handler for the widget.
   */
  private _handleClick(): void {
    if (this.model!.totalCells < 1) {
      return;
    }

    if (this._popup) {
      this._popup.dispose();
    }

    const body = ReactWidget.create(
      <CellNumberFormComponent
        handleSubmit={value => this._handleSubmit(value)}
        maxCell={this.model!.totalCells}
        translator={this._translator}
      />
    );

    this._popup = showPopup({
      body,
      anchor: this,
      align: 'right'
    });
  }

  /**
   * Handle submission for the widget.
   */
  private _handleSubmit(value: number): void {
    const notebook = this.model!.notebook;
    if (!notebook) {
      return;
    }

    const cellIndex = value - 1;
    notebook.activeCellIndex = cellIndex;
    notebook.deselectAll();
    void notebook.scrollToItem(cellIndex).catch(reason => {
      console.error('Go to cell', reason);
    });

    this._popup?.dispose();
    notebook.activate();
  }

  private _translator: ITranslator;
  private _popup: Popup | null = null;
}

/**
 * A namespace for CellCounterStatus statics.
 */
export namespace CellCounterStatus {
  /**
   * Options for creating a CellCounterStatus item.
   */
  export interface IOptions {
    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }

  /**
   * Snapshot of the model state used for change detection.
   */
  interface IState {
    /**
     * Current active cell number (1-based).
     */
    activeCell: number;

    /**
     * First selected cell number (1-based).
     */
    selectionStart: number;

    /**
     * Last selected cell number (1-based).
     */
    selectionEnd: number;

    /**
     * Total number of cells.
     */
    totalCells: number;
  }

  /**
   * A VDom model for a status item tracking active and total notebook cells.
   */
  export class Model extends VDomModel {
    /**
     * The notebook tracked by this model.
     */
    get notebook(): Notebook | null {
      return this._notebook;
    }

    set notebook(notebook: Notebook | null) {
      const oldNotebook = this._notebook;
      if (oldNotebook) {
        oldNotebook.activeCellChanged.disconnect(this._onChanged, this);
        oldNotebook.modelContentChanged.disconnect(this._onChanged, this);
        oldNotebook.selectionChanged.disconnect(this._onChanged, this);
      }

      const oldState = this._getAllState();
      this._notebook = notebook;

      if (!this._notebook) {
        this._activeCell = 0;
        this._selectionStart = 0;
        this._selectionEnd = 0;
        this._totalCells = 0;
      } else {
        this._notebook.activeCellChanged.connect(this._onChanged, this);
        this._notebook.modelContentChanged.connect(this._onChanged, this);
        this._notebook.selectionChanged.connect(this._onChanged, this);
        this._updateStateFromNotebook(this._notebook);
      }

      this._triggerChange(oldState, this._getAllState());
    }

    /**
     * The current active cell index shown to users (1-based).
     */
    get activeCell(): number {
      return this._activeCell;
    }

    /**
     * The first selected cell index shown to users (1-based).
     */
    get selectionStart(): number {
      return this._selectionStart;
    }

    /**
     * The last selected cell index shown to users (1-based).
     */
    get selectionEnd(): number {
      return this._selectionEnd;
    }

    /**
     * The total number of cells.
     */
    get totalCells(): number {
      return this._totalCells;
    }

    /**
     * React to notebook changes by refreshing the tracked state.
     */
    private _onChanged(notebook: Notebook): void {
      const oldState = this._getAllState();
      this._updateStateFromNotebook(notebook);
      this._triggerChange(oldState, this._getAllState());
    }

    private _updateStateFromNotebook(notebook: Notebook): void {
      const activeCellIndex = notebook.activeCellIndex;
      this._activeCell = activeCellIndex >= 0 ? activeCellIndex + 1 : 0;
      this._totalCells = notebook.widgets.length;

      let selectionStart = this._activeCell;
      let selectionEnd = this._activeCell;
      let seenSelection = false;

      notebook.widgets.forEach((cell, index) => {
        if (!notebook.isSelectedOrActive(cell)) {
          return;
        }

        const oneBasedIndex = index + 1;
        if (!seenSelection) {
          selectionStart = oneBasedIndex;
          selectionEnd = oneBasedIndex;
          seenSelection = true;
          return;
        }

        selectionEnd = oneBasedIndex;
      });

      this._selectionStart = seenSelection ? selectionStart : 0;
      this._selectionEnd = seenSelection ? selectionEnd : 0;
    }

    private _getAllState(): IState {
      return {
        activeCell: this._activeCell,
        selectionStart: this._selectionStart,
        selectionEnd: this._selectionEnd,
        totalCells: this._totalCells
      };
    }

    private _triggerChange(oldState: IState, newState: IState) {
      if (
        oldState.activeCell !== newState.activeCell ||
        oldState.selectionStart !== newState.selectionStart ||
        oldState.selectionEnd !== newState.selectionEnd ||
        oldState.totalCells !== newState.totalCells
      ) {
        this.stateChanged.emit(void 0);
      }
    }

    private _activeCell = 0;
    private _selectionStart = 0;
    private _selectionEnd = 0;
    private _totalCells = 0;
    private _notebook: Notebook | null = null;
  }
}
