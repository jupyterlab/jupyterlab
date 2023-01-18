/**
 * Implementation of commands registered by the jupyter_gai extension.
 */
import {
  Notebook,
  NotebookActions,
  INotebookTracker
} from '@jupyterlab/notebook';
import { JupyterFrontEnd } from '@jupyterlab/application';

import { NotebookTasks, DocumentTracker } from './index';
import { GaiService } from './handler';
import { OpenTaskDialog } from './components/open-task-dialog';
import { ClosableDialog } from './widgets/closable-dialog';
import { InsertionContext, insertOutput } from './inserter';
import { getTextSelection, getEditor } from './utils';

/**
 * Creates a placeholder markdown cell either above/below the currently active
 * cell depending on the value of `above`. Keeps previously active cell active.
 */
function insertPlaceholderCell(
  notebook: Notebook,
  mode: 'above-in-cells' | 'below-in-cells'
): string {
  const notebookModel = notebook.model;
  const oldIdx = notebook.activeCellIndex;
  if (notebookModel === null) {
    return '';
  }

  if (mode === 'above-in-cells') {
    NotebookActions.insertAbove(notebook);
  } else {
    NotebookActions.insertBelow(notebook);
  }

  // Get the cell at the new index and change its type and contents.
  const idx = notebook.activeCellIndex;
  NotebookActions.changeCellType(notebook, 'markdown');
  const newCellModel = notebookModel.cells.get(idx);
  newCellModel?.sharedModel.setSource('Analyzing your code …'); // TODO: Translate
  NotebookActions.runAndAdvance(notebook);

  // revert active cell index
  notebook.activeCellIndex = oldIdx;

  // finally return the new placeholder cell ID
  return newCellModel.id;
}

/**
 * Replaces a cell with a markdown cell containing a string.
 */
function replaceWithMarkdown(notebook: Notebook, cellId: string, body: string) {
  const cellIdx = findIndex(notebook, cellId);
  if (cellIdx === -1) {
    return;
  }

  notebook.activeCellIndex = cellIdx;
  NotebookActions.changeCellType(notebook, 'markdown');
  notebook.model?.cells.get(cellIdx)?.sharedModel.setSource(body);
  NotebookActions.run(notebook);
}

function findIndex(notebook: Notebook, id: string): number {
  const idx = notebook.model?.sharedModel.cells.findIndex(
    cell => cell.getId() === id
  );
  return idx === undefined ? -1 : idx;
}

function deleteCell(notebook: Notebook, id: string): void {
  const idx = findIndex(notebook, id);
  if (idx !== -1) {
    notebook.model?.sharedModel.deleteCell(idx);
  }
}

type CellToInsert = {
  cellType: 'markdown' | 'code';
  source: string;
};

/**
 * Splits results, presumed to be in markdown format, into a mixture of markdown
 * cells and code cells.
 *
 * Exported for testing purposes
 */
export function splitMarkdown(results: string): CellToInsert[] {
  // Split the results into multiple cells based on the presence of code.
  // Code is presumed to start with '```', optionally followed by a language identifier.
  // Code is presumed to end with '```'.
  const resultCells: CellToInsert[] = [];

  const MARKDOWN_SPLIT_REGEX = /(```[a-z]*\n[\s\S]*?```)/g;

  const blocks: string[] = results
    .split(MARKDOWN_SPLIT_REGEX)
    .map(block => block.trim());

  for (const block of blocks) {
    let source = '';
    let cellType: 'markdown' | 'code' = 'markdown';

    if (block.startsWith('```')) {
      // Blocks that start with a triple-backtick will be interpreted as code,
      // even if they don't end with a triple-backtick
      cellType = 'code';

      // Trim first and last line of block, and any inner whitespace at the beginning/end
      source = block
        .replace(/^```[a-z]*\n/, '')
        .replace(/```$/, '')
        .trim();
    } else {
      source = block.trim();
    }

    if (source.length > 0) {
      resultCells.push({ cellType, source });
    }
  }

  return resultCells;
}

/**
 * Builds commands used by GAI notebook shortcuts, e.g. in the context menu or
 * in the cell toolbar.
 */
export function buildNotebookShortcutCommand(
  tracker: INotebookTracker,
  app: JupyterFrontEnd
) {
  return async function notebookShortcutCommand(): Promise<boolean> {
    // first, perform some validation on the notebook and activeCell.
    const notebook = tracker.currentWidget?.content;
    if (!notebook) {
      console.error('Notebook is undefined.');
      return false;
    }

    const activeCell = notebook.activeCell;
    if (activeCell === null) {
      console.error('Current cell is null.');
      return false;
    }
    if (activeCell.model.type === 'raw') {
      console.error('Current cell has invalid type `raw`.');
    }

    // determine appropriate task based on cell type
    const task_id =
      activeCell.model.type === 'markdown'
        ? NotebookTasks.GenerateCode
        : NotebookTasks.ExplainCode;

    const cellContents = activeCell.model.sharedModel.getSource();
    console.log(`Calling ${task_id} command on source ${cellContents}`);

    // insert placeholder loading cell
    const placeholderId = insertPlaceholderCell(
      notebook,
      task_id === NotebookTasks.ExplainCode
        ? 'above-in-cells'
        : 'below-in-cells'
    );

    // make request, then delete placeholder cell
    const request: GaiService.IPromptRequest = {
      task_id,
      prompt_variables: {
        body: cellContents
      }
    };
    let response: GaiService.IPromptResponse;
    try {
      response = await GaiService.sendPrompt(request);
    } catch (e: unknown) {
      // if excepted, replace placeholder cell with error message and return
      replaceWithMarkdown(
        notebook,
        placeholderId,
        '**Failed** with error:\n```\n' + (e as Error).message + '\n```'
      );
      return false;
    } finally {
      // otherwise, delete the placeholder cell and continue
      deleteCell(notebook, placeholderId);
    }

    // finally, call appropriate inserter
    const context: InsertionContext = {
      widget: notebook,
      request,
      response
    };
    insertOutput(app, context);
    return true;
  };
}

/**
 * Builds command that handles the default insertion modes, available to any
 * DocumentWidget with an editor.
 */
export function buildDefaultInserter(mode: 'above' | 'below' | 'replace') {
  return function insert(context: InsertionContext): boolean {
    const { widget, request, response } = context;
    const editor = getEditor(widget);

    if (!editor) {
      return false;
    }

    switch (mode) {
      case 'above':
        editor.replaceSelection?.(
          `${response.output}\n\n${request.prompt_variables.body}`
        );
        break;
      case 'below':
        editor.replaceSelection?.(
          `${request.prompt_variables.body}${response.output}`
        );
        break;
      case 'replace':
        editor.replaceSelection?.(response.output);
        break;
    }

    return true;
  };
}

/**
 * Utility function that builds command that inserts 
 * prompt output above or below in new notebook cells. 
 * Requires the current cell to be the active cell.
 */
export function buildNotebookInserter(
  mode: 'above-in-cells' | 'below-in-cells'
) {
  return function insertInCells(context: InsertionContext): boolean {
    const { widget, response } = context;
    if (!(widget instanceof Notebook)) {
      console.error('Editor widget is not of type "Notebook".');
      return false;
    }

    const outputCells = splitMarkdown(response.output);
    if (outputCells.length < 1) {
      console.error('No output cells.');
      return false;
    }

    // insert first output cell above/below active cell
    // for subsequent output cells, always insert below previous output cell
    if (mode === 'above-in-cells') {
      NotebookActions.insertAbove(widget);
    } else {
      NotebookActions.insertBelow(widget);
    }

    for (let i = 0; i < outputCells.length; i++) {
      const outputCell = outputCells[i];
      if (i > 0) {
        NotebookActions.insertBelow(widget);
      }

      widget.activeCell?.model.sharedModel.setSource(outputCell.source);
      NotebookActions.changeCellType(widget, outputCell.cellType);
      if (outputCell.cellType === 'markdown') {
        NotebookActions.run(widget);
      }
    }

    return true;
  };
}

/**
 * Builds closure that opens the task dialog.
 */
export function buildOpenTaskDialog(
  tracker: DocumentTracker,
  app: JupyterFrontEnd
) {
  return async function openTaskDialog(): Promise<boolean> {
    const editorWidget = tracker.currentWidget?.content;
    if (!editorWidget) {
      return false;
    }

    const selectedText = getTextSelection(editorWidget);

    const dialog = new ClosableDialog({
      body: OpenTaskDialog,
      props: {
        selectedText,
        app,
        editorWidget
      }
    });

    dialog.open();

    return true;
  };
}
