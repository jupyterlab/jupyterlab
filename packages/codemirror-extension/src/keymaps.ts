import CodeMirror from 'codemirror';
import { INotebookTracker } from '@jupyterlab/notebook';
import { MarkdownCell } from '@jupyterlab/cells';
import { CommandRegistry } from '@lumino/commands';

export async function setupKeymap(
  keyMap: string,
  commands: CommandRegistry,
  notebookTracker: INotebookTracker
): Promise<void> {
  if (keyMap === 'vim') {
    // This setup for vim in the notebook is derived from extension built by
    // members of the community
    // https://github.com/lambdalisue/jupyter-vim-binding (Jupyter notebook)
    // https://github.com/jwkvam/jupyterlab-vim (JupyterLab 0.x + 1.x)
    // https://github.com/axelfahy/jupyterlab-vim (JupyterLab 2.x)

    // @ts-expect-error
    await import('codemirror/keymap/vim.js');
    const vim = (CodeMirror as any).Vim;
    vim.defineMotion(
      'moveByLinesOrCell',
      (cm: any, head: any, motionArgs: any, vim: any) => {
        let cur = head;
        let endCh = cur.ch;
        let currentCell = notebookTracker.activeCell;
        // TODO: these references will be undefined
        // Depending what our last motion was, we may want to do different
        // things. If our last motion was moving vertically, we want to
        // preserve the HPos from our last horizontal move.  If our last motion
        // was going to the end of a line, moving vertically we should go to
        // the end of the line, etc.
        switch (vim.lastMotion) {
          case 'moveByLines':
          case 'moveByDisplayLines':
          case 'moveByScroll':
          case 'moveToColumn':
          case 'moveToEol':
          // JUPYTER PATCH: add our custom method to the motion cases
          // eslint-disable-next-line no-fallthrough
          case 'moveByLinesOrCell':
            endCh = vim.lastHPos;
            break;
          default:
            vim.lastHPos = endCh;
        }
        let repeat = motionArgs.repeat + (motionArgs.repeatOffset || 0);
        let line = motionArgs.forward ? cur.line + repeat : cur.line - repeat;
        let first = cm.firstLine();
        let last = cm.lastLine();
        // Vim cancels linewise motions that start on an edge and move beyond
        // that edge. It does not cancel motions that do not start on an edge.

        // JUPYTER PATCH BEGIN
        // here we insert the jumps to the next cells
        if (line < first || line > last) {
          // var currentCell = ns.notebook.get_selected_cell();
          // var currentCell = tracker.activeCell;
          // var key = '';
          if (currentCell?.model.type === 'markdown') {
            (currentCell as MarkdownCell).rendered = true;
          }
          if (motionArgs.forward) {
            void commands.execute('notebook:move-cursor-down');
          } else {
            void commands.execute('notebook:move-cursor-up');
          }
          return;
        }
        vim.lastHSPos = cm.charCoords(CodeMirror.Pos(line, endCh), 'div').left;
        return (CodeMirror as any).Pos(line, endCh);
      }
    );
    vim.mapCommand(
      'k',
      'motion',
      'moveByLinesOrCell',
      { forward: false, linewise: true },
      { context: 'normal' }
    );
    vim.mapCommand(
      'j',
      'motion',
      'moveByLinesOrCell',
      { forward: true, linewise: true },
      { context: 'normal' }
    );
    CodeMirror.prototype.save = () => {
      void commands.execute('docmanager:save');
    };
    vim.defineEx('quit', 'q', function (cm: any) {
      void commands.execute('notebook:enter-command-mode');
    });
    vim.defineAction('splitCell', (cm: any, actionArgs: any) => {
      void commands.execute('notebook:split-cell-at-cursor');
    });
    vim.mapCommand('-', 'action', 'splitCell', {}, { extra: 'normal' });
    commands.addKeyBinding({
      selector: '.jp-Notebook.jp-mod-editMode',
      keys: ['Ctrl J'],
      command: 'notebook:move-cursor-down'
    });
    commands.addKeyBinding({
      selector: '.jp-Notebook.jp-mod-editMode',
      keys: ['Ctrl K'],
      command: 'notebook:move-cursor-up'
    });
    commands.addKeyBinding({
      selector: '.jp-Notebook.jp-mod-editMode',
      keys: ['Escape'],
      command: 'codemirror:leave-vim-insert-mode'
    });
    commands.addKeyBinding({
      selector: '.jp-Notebook.jp-mod-editMode',
      keys: ['Shift Escape'],
      command: 'notebook:enter-command-mode'
    });
  } else {
    commands.addKeyBinding({
      selector: '.jp-Notebook.jp-mod-editMode',
      keys: ['Escape'],
      command: 'notebook:enter-command-mode'
    });
  }
}
