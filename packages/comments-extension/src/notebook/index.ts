// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IThemeManager } from '@jupyterlab/apputils';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { YNotebook } from '@jupyterlab/shared-models';
import { Awareness } from 'y-protocols/awareness';
import { Cell } from '@jupyterlab/cells';
import {
  CellCommentFactory,
  CellCommentWidgetFactory,
  CellSelectionCommentFactory,
  CellSelectionCommentWidgetFactory,
  getIdentity,
  ICellComment,
  ICommentPanel
} from '@jupyterlab/comments';
import { CodeEditor } from '@jupyterlab/codeeditor';

export namespace CommandIDs {
  export const addNotebookComment = 'jl-comments:add-notebook-comment';
}

/**
 * A plugin that allows notebooks to be commented on.
 */
export const notebookCommentsPlugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-comments:notebook',
  autoStart: true,
  requires: [INotebookTracker, ICommentPanel, IThemeManager],
  activate: (
    app: JupyterFrontEnd,
    nbTracker: INotebookTracker,
    panel: ICommentPanel,
    manager: IThemeManager
  ) => {
    const commentRegistry = panel.commentRegistry;
    const commentWidgetRegistry = panel.commentWidgetRegistry;

    commentRegistry.addFactory(new CellCommentFactory());
    commentRegistry.addFactory(new CellSelectionCommentFactory());

    commentWidgetRegistry.addFactory(
      new CellCommentWidgetFactory({ commentRegistry, tracker: nbTracker })
    );
    commentWidgetRegistry.addFactory(
      new CellSelectionCommentWidgetFactory(
        {
          commentRegistry,
          tracker: nbTracker
        },
        manager
      )
    );

    app.commands.addCommand(CommandIDs.addNotebookComment, {
      label: 'Add Comment',
      execute: () => {
        const cell = nbTracker.activeCell;
        if (cell == null) {
          return;
        }

        const model = panel.model;
        if (model == null) {
          return;
        }

        const comments = model.comments;
        let index = comments.length;
        for (let i = comments.length; i > 0; i--) {
          const comment = comments.get(i - 1) as ICellComment;
          if (comment.target.cellID === cell.model.id) {
            index = i;
          }
        }

        const { start, end } = cell.editor.getSelection();
        const type =
          start.column === end.column && start.line === end.line
            ? 'cell'
            : 'cell-selection';

        panel.mockComment(
          {
            identity: getIdentity(model.awareness),
            type,
            source: cell
          },
          index
        );
      }
    });

    // This updates the indicator and scrolls to the comments of the selected cell
    // when the active cell changes.
    let currentCell: Cell | null = null;
    nbTracker.activeCellChanged.connect((_, cell: Cell | null) => {
      // Clean up old mouseup listener
      document.removeEventListener('mouseup', onMouseup);

      currentCell = cell;
      panel.button.close();

      // panel.model can be null when the notebook is first loaded
      if (cell == null || panel.model == null) {
        return;
      }

      // Scroll to the first comment associated with the currently selected cell.
      for (let comment of panel.model.comments) {
        if (comment.type === 'cell-selection' || comment.type === 'cell') {
          const cellComment = comment as ICellComment;
          if (cellComment.target.cellID === cell.model.id) {
            panel.scrollToComment(cellComment.id);
            break;
          }
        }
      }
    });

    let currentSelection: CodeEditor.IRange;

    // Opens add comment button on the current cell when the mouse is released
    // after a text selection
    const onMouseup = (_: MouseEvent): void => {
      if (currentCell == null || currentCell.isDisposed) {
        return;
      }

      const editor = currentCell.editor;
      const { top } = editor.getCoordinateForPosition(currentSelection.start);
      const { bottom } = editor.getCoordinateForPosition(currentSelection.end);
      const { right } = currentCell.editorWidget.node.getBoundingClientRect();

      const node = nbTracker.currentWidget!.content.node;

      panel.button.open(
        right - 10,
        (top + bottom) / 2 - 10,
        () => app.commands.execute(CommandIDs.addNotebookComment),
        node
      );
    };

    // Adds a single-run mouseup listener whenever a text selection is made in a cell
    const awarenessHandler = (): void => {
      if (currentCell == null) {
        return;
      }

      currentSelection = currentCell.editor.getSelection();
      const { start, end } = currentSelection;

      if (start.column !== end.column || start.line !== end.line) {
        document.addEventListener('mouseup', onMouseup, { once: true });
      } else {
        panel.button.close();
      }
    };

    let lastAwareness: Awareness | null = null;
    nbTracker.currentChanged.connect((_, notebook: NotebookPanel | null) => {
      if (notebook == null) {
        lastAwareness = null;
        return;
      }

      // Clean up old awareness handler
      if (lastAwareness != null) {
        lastAwareness.off('change', awarenessHandler);
      }

      // Add new awareness handler
      const model = notebook.model!.sharedModel as YNotebook;
      model.awareness.on('change', awarenessHandler);

      lastAwareness = model.awareness;
    });

    // Add a separator above the item.
    app.contextMenu.addItem({
      type: 'separator',
      selector: '.jp-Notebook .jp-Cell',
      rank: 15
    });

    app.contextMenu.addItem({
      command: CommandIDs.addNotebookComment,
      selector: '.jp-Notebook .jp-Cell',
      rank: 15.1
    });
  }
};

export default notebookCommentsPlugin;
