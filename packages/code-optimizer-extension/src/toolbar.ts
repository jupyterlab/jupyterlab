/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
----------------------------------------------------------------------------*/

import { ToolbarButton } from '@jupyterlab/ui-components';
import type { Cell } from '@jupyterlab/cells';
import { RuleBasedOptimizer } from '@jupyterlab/code-optimizer';
import { showDialog, Dialog } from '@jupyterlab/apputils';
import { Widget } from '@lumino/widgets';

/**
 * Create a toolbar button for code optimization.
 */
export function createOptimizeButton(cell: Cell): ToolbarButton {
  const button = new ToolbarButton({
    iconClass: 'jp-Icon jp-ModifyImageIcon',
    tooltip: 'Optimize Code',
    onClick: () => {
      if (cell.model.type !== 'code') {
        return;
      }

      const originalCode = cell.model.sharedModel.getSource();
      const optimizer = new RuleBasedOptimizer();
      const optimized = optimizer.optimize(originalCode, 'python');

      if (optimized.code === originalCode) {
        showDialog({
          title: 'Code Optimization',
          body: 'Code is already optimized.',
          buttons: [Dialog.okButton()]
        });
        return;
      }

      // Create dialog body with diff view
      const body = new Widget();
      body.addClass('jp-OptimizerDialog');
      
      const originalDiv = document.createElement('div');
      originalDiv.innerHTML = `<h3>Original Code:</h3><pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; white-space: pre-wrap;">${escapeHtml(originalCode)}</pre>`;
      
      const optimizedDiv = document.createElement('div');
      optimizedDiv.innerHTML = `<h3>Optimized Code:</h3><pre style="background: #e8f5e9; padding: 10px; border-radius: 4px; white-space: pre-wrap;">${escapeHtml(optimized.code)}</pre>`;
      
      body.node.appendChild(originalDiv);
      body.node.appendChild(document.createElement('br'));
      body.node.appendChild(optimizedDiv);

      showDialog({
        title: 'Code Optimization - Review Changes',
        body: body,
        buttons: [
          Dialog.cancelButton({ label: 'Reject' }),
          Dialog.okButton({ label: 'Accept' })
        ]
      }).then(result => {
        if (result.button.accept) {
          cell.model.sharedModel.setSource(optimized.code);
        }
      });
    }
  });

  return button;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
