/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
----------------------------------------------------------------------------*/

/**
 * @packageDocumentation
 * @module code-optimizer-extension
 */

import type {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  INotebookTracker
} from '@jupyterlab/notebook';
import { ToolbarButton, runIcon } from '@jupyterlab/ui-components';
import { showDialog, Dialog } from '@jupyterlab/apputils';
import { Widget } from '@lumino/widgets';
import { RuleBasedOptimizer } from '@jupyterlab/code-optimizer';

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * The code optimizer extension plugin.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/code-optimizer-extension:plugin',
  description: 'Integrates code optimizer with JupyterLab notebooks',
  requires: [INotebookTracker],
  activate: (
    app: JupyterFrontEnd,
    tracker: INotebookTracker
  ) => {
    console.log('CODE OPTIMIZER EXTENSION LOADED SUCCESSFULLY');

    // Add optimize button to notebook toolbar
    tracker.widgetAdded.connect((sender, notebookPanel) => {
      console.log('Adding optimize button to notebook toolbar');
      const optimizeButton = new ToolbarButton({
        icon: runIcon,
        tooltip: 'Optimize Current Cell',
        onClick: async () => {
          console.log('Optimize button clicked');
          const cell = tracker.activeCell;
          console.log('Active cell:', cell);
          console.log('Cell type:', cell?.model.type);
          if (cell && cell.model.type === 'code') {
            const originalCode = cell.model.sharedModel.getSource();
            console.log('Original code length:', originalCode.length);
            console.log('Original code:', originalCode);
            
            const ruleOptimizer = new RuleBasedOptimizer();
            const optimized = ruleOptimizer.optimize(originalCode, 'python');
            const method = 'rule-based';

            console.log('Optimized code:', optimized.code);
            console.log('Optimization method:', method);

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

            // Show optimization method
            const methodDiv = document.createElement('div');
            methodDiv.innerHTML = `<h3>Optimization Method:</h3><p><strong>${method}</strong></p>`;
            body.node.appendChild(methodDiv);

            // Show transformations applied
            if (optimized.transformations.length > 0) {
              const transformDiv = document.createElement('div');
              transformDiv.innerHTML = `<h3>Transformations Applied:</h3><ul>${optimized.transformations.map((t: any) => `<li>${t.description}</li>`).join('')}</ul>`;
              body.node.appendChild(transformDiv);
            }

            const buttons = optimized.code === originalCode
              ? [Dialog.okButton({ label: 'Close' })]
              : [Dialog.cancelButton({ label: 'Reject' }), Dialog.okButton({ label: 'Accept' })];

            showDialog({
              title: optimized.code === originalCode ? `Code Optimization - No Changes (${method})` : `Code Optimization - Review Changes (${method})`,
              body: body,
              buttons
            }).then(result => {
              if (result.button.accept && optimized.code !== originalCode) {
                cell.model.sharedModel.setSource(optimized.code);
              }
            });
          }
        }
      });

      notebookPanel.toolbar.addItem('optimize-cell', optimizeButton);
      console.log('Optimize button added');
    });
  }
};

export default plugin;
