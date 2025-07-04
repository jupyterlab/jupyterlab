// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Popup, showPopup, TextItem } from '@jupyterlab/statusbar';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import {
  classes,
  lineFormIcon,
  ReactWidget,
  VDomModel,
  VDomRenderer
} from '@jupyterlab/ui-components';
import React from 'react';
import { CodeEditor } from './editor';
import { DOMUtils } from '@jupyterlab/apputils';

/**
 * A namespace for LineFormComponent statics.
 */
namespace LineFormComponent {
  /**
   * The props for LineFormComponent.
   */
  export interface IProps {
    /**
     * A callback for when the form is submitted.
     */
    handleSubmit: (value: number) => void;

    /**
     * The current line of the form.
     */
    currentLine: number;

    /**
     * The maximum line the form can take (typically the
     * maximum line of the relevant editor).
     */
    maxLine: number;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }

  /**
   * The props for LineFormComponent.
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
     * A generated ID for the input field
     */
    textInputId: string;
  }
}

/**
 * A component for rendering a "go-to-line" form.
 */
class LineFormComponent extends React.Component<
  LineFormComponent.IProps,
  LineFormComponent.IState
> {
  /**
   * Construct a new LineFormComponent.
   */
  constructor(props: LineFormComponent.IProps) {
    super(props);
    this.translator = props.translator || nullTranslator;
    this._trans = this.translator.load('jupyterlab');
    this.state = {
      value: '',
      hasFocus: false,
      textInputId: DOMUtils.createDomID() + '-line-number-input'
    };
  }

  /**
   * Focus the element on mount.
   */
  componentDidMount() {
    this._textInput!.focus();
  }

  /**
   * Render the LineFormComponent.
   */
  render() {
    return (
      <div className="jp-lineFormSearch">
        <form name="lineColumnForm" onSubmit={this._handleSubmit} noValidate>
          <div
            className={classes(
              'jp-lineFormWrapper',
              'lm-lineForm-wrapper',
              this.state.hasFocus ? 'jp-lineFormWrapperFocusWithin' : undefined
            )}
          >
            <input
              type="text"
              id={this.state.textInputId}
              className="jp-lineFormInput"
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
              'Go to line number between 1 and %1',
              this.props.maxLine
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

    const value = parseInt(this._textInput!.value, 10);
    if (
      !isNaN(value) &&
      isFinite(value) &&
      1 <= value &&
      value <= this.props.maxLine
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

  protected translator: ITranslator;
  private _trans: TranslationBundle;
  private _textInput: HTMLInputElement | null = null;
}

/**
 * A namespace for LineColComponent.
 */
namespace LineColComponent {
  /**
   * Props for LineColComponent.
   */
  export interface IProps {
    /**
     * The current line number.
     */
    line: number;

    /**
     * The current column number.
     */
    column: number;

    /**
     * The application language translator.
     */
    translator?: ITranslator;

    /**
     * A click handler for the LineColComponent, which
     * we use to launch the LineFormComponent.
     */
    handleClick: () => void;
  }
}

/**
 * A pure functional component for rendering a line/column
 * status item.
 */
function LineColComponent(
  props: LineColComponent.IProps
): React.ReactElement<LineColComponent.IProps> {
  const translator = props.translator || nullTranslator;
  const trans = translator.load('jupyterlab');
  const keydownHandler = (event: React.KeyboardEvent<HTMLImageElement>) => {
    if (
      event.key === 'Enter' ||
      event.key === 'Spacebar' ||
      event.key === ' '
    ) {
      event.preventDefault();
      event.stopPropagation();
      props.handleClick();
    } else {
      return;
    }
  };
  return (
    <TextItem
      role="button"
      aria-haspopup
      onClick={props.handleClick}
      source={trans.__('Ln %1, Col %2', props.line, props.column)}
      title={trans.__('Go to line number…')}
      tabIndex={0}
      onKeyDown={keydownHandler}
    />
  );
}

/**
 * A widget implementing a line/column status item.
 */
export class LineCol extends VDomRenderer<LineCol.Model> {
  /**
   * Construct a new LineCol status item.
   */
  constructor(translator?: ITranslator) {
    super(new LineCol.Model());
    this.addClass('jp-mod-highlighted');
    this.translator = translator || nullTranslator;
  }

  /**
   * Render the status item.
   */
  render(): JSX.Element | null {
    if (this.model === null) {
      return null;
    } else {
      return (
        <LineColComponent
          line={this.model.line}
          column={this.model.column}
          translator={this.translator}
          handleClick={() => this._handleClick()}
        />
      );
    }
  }

  /**
   * A click handler for the widget.
   */
  private _handleClick(): void {
    if (this._popup) {
      this._popup.dispose();
    }
    const body = ReactWidget.create(
      <LineFormComponent
        handleSubmit={val => this._handleSubmit(val)}
        currentLine={this.model!.line}
        maxLine={this.model!.editor!.lineCount}
        translator={this.translator}
      />
    );

    this._popup = showPopup({
      body: body,
      anchor: this,
      align: 'right'
    });
  }

  /**
   * Handle submission for the widget.
   */
  private _handleSubmit(value: number): void {
    this.model!.editor!.setCursorPosition({ line: value - 1, column: 0 });
    this._popup!.dispose();
    this.model!.editor!.focus();
  }

  protected translator: ITranslator;
  private _popup: Popup | null = null;
}

/**
 * A namespace for LineCol statics.
 */
export namespace LineCol {
  /**
   * A VDom model for a status item tracking the line/column of an editor.
   */
  export class Model extends VDomModel {
    /**
     * The current editor of the model.
     */
    get editor(): CodeEditor.IEditor | null {
      return this._editor;
    }
    set editor(editor: CodeEditor.IEditor | null) {
      const oldEditor = this._editor;
      if (oldEditor?.model?.selections) {
        oldEditor.model.selections.changed.disconnect(this._onSelectionChanged);
      }

      const oldState = this._getAllState();
      this._editor = editor;
      if (!this._editor) {
        this._column = 1;
        this._line = 1;
      } else {
        this._editor.model.selections.changed.connect(this._onSelectionChanged);

        const pos = this._editor.getCursorPosition();
        this._column = pos.column + 1;
        this._line = pos.line + 1;
      }

      this._triggerChange(oldState, this._getAllState());
    }

    /**
     * The current line of the model.
     */
    get line(): number {
      return this._line;
    }

    /**
     * The current column of the model.
     */
    get column(): number {
      return this._column;
    }

    /**
     * React to a change in the cursors of the current editor.
     */
    private _onSelectionChanged = () => {
      const oldState = this._getAllState();
      const pos = this.editor!.getCursorPosition();
      this._line = pos.line + 1;
      this._column = pos.column + 1;

      this._triggerChange(oldState, this._getAllState());
    };

    private _getAllState(): [number, number] {
      return [this._line, this._column];
    }

    private _triggerChange(
      oldState: [number, number],
      newState: [number, number]
    ) {
      if (oldState[0] !== newState[0] || oldState[1] !== newState[1]) {
        this.stateChanged.emit(void 0);
      }
    }

    private _line: number = 1;
    private _column: number = 1;
    private _editor: CodeEditor.IEditor | null = null;
  }
}
