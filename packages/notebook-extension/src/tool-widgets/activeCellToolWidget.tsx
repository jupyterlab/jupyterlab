/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import type { FieldProps } from '@rjsf/utils';
import { SystemClipboard } from '@jupyterlab/apputils';
import type { IEditorLanguageRegistry } from '@jupyterlab/codemirror';
import { PageConfig } from '@jupyterlab/coreutils';
import type { INotebookTracker } from '@jupyterlab/notebook';
import { NotebookTools } from '@jupyterlab/notebook';
import type { ISharedText } from '@jupyter/ydoc';
import { PanelLayout, Widget } from '@lumino/widgets';
import type { ICellModel } from '@jupyterlab/cells';
import { InputPrompt, isCodeCellModel } from '@jupyterlab/cells';
import type { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import {
  checkIcon,
  copyIcon,
  ToolbarButtonComponent
} from '@jupyterlab/ui-components';
import { Debouncer } from '@lumino/polling';

/**
 * The class name added to the ActiveCellTool.
 */
const ACTIVE_CELL_TOOL_CLASS = 'jp-ActiveCellTool';
/**
 * The class name added to the ActiveCellTool content.
 */
const ACTIVE_CELL_TOOL_CONTENT_CLASS = 'jp-ActiveCellTool-Content';
/**
 * The class name added to the ActiveCellTool cell content.
 */
const ACTIVE_CELL_TOOL_CELL_CONTENT_CLASS = 'jp-ActiveCellTool-CellContent';

/**
 * The class name added to the cell ID field.
 */
const CELL_ID_FIELD_CLASS = 'jp-CellIdField';
/**
 * The valid cell ID pattern from nbformat.
 */
const CELL_ID_PATTERN = /^[\w-]+$/;
/**
 * The maximum valid cell ID length from nbformat.
 */
const CELL_ID_MAX_LENGTH = 64;

interface ICellIdFieldProps extends FieldProps {
  /**
   * The tracker to the notebook panel.
   */
  tracker: INotebookTracker;

  /**
   * Language translator.
   */
  translator?: ITranslator;
}

namespace Private {
  /**
   * Custom active cell field options.
   */
  export interface IOptions {
    /**
     * The tracker to the notebook panel.
     */
    tracker: INotebookTracker;

    /**
     * Editor languages registry
     */
    languages: IEditorLanguageRegistry;
  }

  export function updateActiveCellId(
    tracker: INotebookTracker,
    value: string,
    trans: TranslationBundle
  ): string | null {
    const notebookPanel = tracker.currentWidget;
    const notebook = notebookPanel?.content;
    const activeCell = tracker.activeCell;
    if (!notebookPanel?.model || !notebook || !activeCell) {
      return trans.__('No active cell selected.');
    }

    const id = value.trim();
    if (id === activeCell.model.id) {
      return null;
    }
    if (!id) {
      return trans.__('Cell ID cannot be empty.');
    }
    if (id.length > CELL_ID_MAX_LENGTH || !CELL_ID_PATTERN.test(id)) {
      return trans.__(
        'Cell ID must be 1-64 letters, numbers, hyphens, or underscores.'
      );
    }
    if (
      notebook.widgets.some(cell => cell !== activeCell && cell.model.id === id)
    ) {
      return trans.__('Cell ID must be unique.');
    }

    const index = notebook.widgets.indexOf(activeCell);
    if (index === -1) {
      return trans.__('Active cell not found.');
    }

    const cellJSON = {
      ...activeCell.model.toJSON(),
      id
    };
    const executionState = isCodeCellModel(activeCell.model)
      ? activeCell.model.executionState
      : null;
    const sharedModel = notebookPanel.model.sharedModel;
    sharedModel.transact(() => {
      sharedModel.deleteCell(index);
      sharedModel.insertCell(index, cellJSON);
    });

    const replacement = notebook.widgets.find(cell => cell.model.id === id);
    if (replacement) {
      notebook.activeCellIndex = notebook.widgets.indexOf(replacement);
      if (executionState && isCodeCellModel(replacement.model)) {
        replacement.model.executionState = executionState;
      }
    }
    return null;
  }
}

/**
 * The cell ID field, displaying the ID of the active cell.
 *
 * ## Note
 * This field does not work as other metadata form fields, as it does not update metadata.
 */
export function CellIdField(props: ICellIdFieldProps): JSX.Element {
  const translator = props.translator ?? nullTranslator;
  const trans = translator.load('jupyterlab');
  const title = props.schema.title ?? trans.__('Cell ID');
  const activeCellId = props.tracker.activeCell?.model.id ?? '';
  const [value, setValue] = React.useState(activeCellId);
  const [copied, setCopied] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const copiedTimeout = React.useRef<number | null>(null);

  React.useEffect(() => {
    setValue(activeCellId);
    inputRef.current?.setCustomValidity('');
    setCopied(false);
  }, [activeCellId]);

  React.useEffect(() => {
    return () => {
      if (copiedTimeout.current !== null) {
        window.clearTimeout(copiedTimeout.current);
      }
    };
  }, []);

  const setValidityMessage = (message: string | null): void => {
    inputRef.current?.setCustomValidity(message ?? '');
    if (message) {
      inputRef.current?.reportValidity();
    }
  };

  const saveCellId = (): boolean => {
    const result = Private.updateActiveCellId(props.tracker, value, trans);
    setValidityMessage(result);
    if (!result) {
      setValue(props.tracker.activeCell?.model.id ?? value.trim());
    }
    return !result;
  };

  const showCopied = () => {
    setCopied(true);
    if (copiedTimeout.current !== null) {
      window.clearTimeout(copiedTimeout.current);
    }
    copiedTimeout.current = window.setTimeout(() => {
      setCopied(false);
      copiedTimeout.current = null;
    }, 1400);
  };

  const onCopyLink = () => {
    if (document.activeElement === inputRef.current && !saveCellId()) {
      return;
    }
    const notebookPanel = props.tracker.currentWidget;
    const activeCell = props.tracker.activeCell;
    if (!notebookPanel || !activeCell) {
      return;
    }

    const url = PageConfig.getUrl({
      workspace: PageConfig.defaultWorkspace,
      treePath: notebookPanel.context.path,
      toShare: true
    });
    void SystemClipboard.getInstance()
      .setData(
        'text/plain',
        `${url}#cell-id=${encodeURIComponent(activeCell.model.id)}`
      )
      .then(showCopied);
  };

  return (
    <div className={CELL_ID_FIELD_CLASS}>
      <label htmlFor={props.idSchema.$id}>{title}</label>
      <div className="jp-CellIdField-row">
        <input
          className="jp-mod-styled jp-CellIdField-input"
          id={props.idSchema.$id}
          maxLength={CELL_ID_MAX_LENGTH}
          onBlur={saveCellId}
          onChange={event => {
            setValue(event.target.value);
            event.currentTarget.setCustomValidity('');
            setCopied(false);
          }}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.currentTarget.blur();
            } else if (event.key === 'Escape') {
              setValue(activeCellId);
              event.currentTarget.setCustomValidity('');
              event.currentTarget.blur();
            }
          }}
          ref={inputRef}
          type="text"
          value={value}
        />
        <ToolbarButtonComponent
          className={`jp-CellIdField-button ${copied ? 'jp-mod-copied' : ''}`}
          enabled={!!activeCellId}
          icon={copied ? checkIcon : copyIcon}
          iconLabel={trans.__('Copy link to cell')}
          onClick={onCopyLink}
          tooltip={copied ? trans.__('Copied') : trans.__('Copy link to cell')}
        />
      </div>
    </div>
  );
}

/**
 * The active cell field, displaying the first line and execution count of the active cell.
 *
 * ## Note
 * This field does not work as other metadata form fields, as it does not update metadata.
 */
export class ActiveCellTool extends NotebookTools.Tool {
  constructor(options: Private.IOptions) {
    super();
    const { languages } = options;
    this._tracker = options.tracker;

    this.addClass(ACTIVE_CELL_TOOL_CLASS);
    this.layout = new PanelLayout();

    this._inputPrompt = new InputPrompt();
    (this.layout as PanelLayout).addWidget(this._inputPrompt);

    // First code line container
    const node = document.createElement('div');
    node.classList.add(ACTIVE_CELL_TOOL_CONTENT_CLASS);
    const container = node.appendChild(document.createElement('div'));
    const editor = container.appendChild(document.createElement('pre'));
    container.className = ACTIVE_CELL_TOOL_CELL_CONTENT_CLASS;
    this._editorEl = editor;
    (this.layout as PanelLayout).addWidget(new Widget({ node }));

    const update = async () => {
      this._editorEl.innerHTML = '';
      if (this._cellModel && isCodeCellModel(this._cellModel)) {
        this._inputPrompt.executionCount = `${
          this._cellModel.executionCount ?? ''
        }`;
        this._inputPrompt.show();
      } else {
        this._inputPrompt.executionCount = null;
        this._inputPrompt.hide();
      }

      if (this._cellModel) {
        await languages.highlight(
          this._cellModel.sharedModel.getSource().split('\n')[0],
          languages.findByMIME(this._cellModel.mimeType),
          this._editorEl
        );
      }
    };

    this._refreshDebouncer = new Debouncer(update, 150);
  }

  render(props: FieldProps): JSX.Element {
    const activeCell = this._tracker.activeCell;
    if (activeCell) this._cellModel = activeCell?.model || null;
    (this._cellModel?.sharedModel as ISharedText).changed.connect(
      this.refresh,
      this
    );
    this._cellModel?.mimeTypeChanged.connect(this.refresh, this);
    this.refresh()
      .then(() => undefined)
      .catch(console.warn);
    return <div ref={ref => ref?.appendChild(this.node)}></div>;
  }

  private async refresh(): Promise<void> {
    await this._refreshDebouncer.invoke();
  }

  private _tracker: INotebookTracker;
  private _cellModel: ICellModel | null;
  private _refreshDebouncer: Debouncer<void, void, null[]>;
  private _editorEl: HTMLPreElement;
  private _inputPrompt: InputPrompt;
}
