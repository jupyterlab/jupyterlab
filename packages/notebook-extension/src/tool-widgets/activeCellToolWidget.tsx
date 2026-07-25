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
import type { ITranslator } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import {
  checkIcon,
  copyIcon,
  linkIcon,
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

type CopiedAction = 'id' | 'link';

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
  const [copiedAction, setCopiedAction] = React.useState<CopiedAction | null>(
    null
  );
  const copiedTimeout = React.useRef<number | null>(null);

  React.useEffect(() => {
    setCopiedAction(null);
  }, [activeCellId]);

  React.useEffect(() => {
    return () => {
      if (copiedTimeout.current !== null) {
        window.clearTimeout(copiedTimeout.current);
      }
    };
  }, []);

  const showCopied = (action: CopiedAction) => {
    setCopiedAction(action);
    if (copiedTimeout.current !== null) {
      window.clearTimeout(copiedTimeout.current);
    }
    copiedTimeout.current = window.setTimeout(() => {
      setCopiedAction(null);
      copiedTimeout.current = null;
    }, 1400);
  };

  const onCopyId = () => {
    if (!activeCellId) {
      return;
    }
    void SystemClipboard.getInstance()
      .setData('text/plain', activeCellId)
      .then(() => showCopied('id'));
  };

  const onCopyLink = () => {
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
      .then(() => showCopied('link'));
  };

  return (
    <div className={CELL_ID_FIELD_CLASS}>
      <label htmlFor={props.idSchema.$id}>{title}</label>
      <div className="jp-CellIdField-row">
        <input
          className="jp-mod-styled jp-CellIdField-input"
          id={props.idSchema.$id}
          readOnly
          type="text"
          value={activeCellId}
        />
        <ToolbarButtonComponent
          className={`jp-CellIdField-button ${
            copiedAction === 'id' ? 'jp-mod-copied' : ''
          }`}
          enabled={!!activeCellId}
          icon={copiedAction === 'id' ? checkIcon : copyIcon}
          iconLabel={trans.__('Copy cell ID')}
          onClick={onCopyId}
          tooltip={
            copiedAction === 'id'
              ? trans.__('Copied')
              : trans.__('Copy cell ID')
          }
        />
        <ToolbarButtonComponent
          className={`jp-CellIdField-button ${
            copiedAction === 'link' ? 'jp-mod-copied' : ''
          }`}
          enabled={!!activeCellId}
          icon={copiedAction === 'link' ? checkIcon : linkIcon}
          iconLabel={trans.__('Copy link to cell')}
          onClick={onCopyLink}
          tooltip={
            copiedAction === 'link'
              ? trans.__('Copied')
              : trans.__('Copy link to cell')
          }
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
