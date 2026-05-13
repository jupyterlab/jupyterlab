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
import type { NotebookPanel } from '@jupyterlab/notebook';
import { INotebookTracker } from '@jupyterlab/notebook';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { offlineBoltIcon, ToolbarButton } from '@jupyterlab/ui-components';
import { Dialog, showDialog } from '@jupyterlab/apputils';
import { Widget } from '@lumino/widgets';
import { LLMOptimizer, RuleBasedOptimizer } from '@jupyterlab/code-optimizer';

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/code-optimizer-extension:plugin',
  description: 'Integrates code optimizer with JupyterLab notebooks',
  autoStart: true,
  requires: [INotebookTracker, ISettingRegistry],
  activate: (
    app: JupyterFrontEnd,
    tracker: INotebookTracker,
    settingRegistry: ISettingRegistry
  ) => {
    let pluginSettings: ISettingRegistry.ISettings | null = null;
    settingRegistry
      .load('@jupyterlab/code-optimizer-extension:plugin')
      .then(s => {
        pluginSettings = s;
      })
      .catch(err => {
        console.error('Could not load code optimizer settings:', err);
      });

    // Per-cell optimize command — shows in the cell toolbar via schema registration
    app.commands.addCommand('code-optimizer:optimize-active-cell', {
      icon: offlineBoltIcon,
      caption: 'Optimize this cell (Gemini if configured, else rule-based)',
      describedBy: { args: {}, selector: '.jp-Cell' },
      execute: async () => {
        const cell = tracker.activeCell;
        if (!cell || cell.model.type !== 'code') return;

        const originalCode = cell.model.sharedModel.getSource();
        if (!originalCode.trim()) return;

        const apiKey =
          (pluginSettings?.get('llmApiKey').composite as string) ?? '';

        let optimizedCode = originalCode;
        let method = 'rule-based';
        let transformations: any[] = [];

        if (apiKey) {
          try {
            const llmModel =
              (pluginSettings?.get('llmModel').composite as string) ||
              'gemini-flash-latest';
            const llm = new LLMOptimizer({
              apiKey,
              provider: 'google',
              model: llmModel
            });
            const result = await llm.optimize(originalCode, 'python');
            if (result.code.trim() === originalCode.trim()) {
              throw new Error('LLM returned unchanged code');
            }
            optimizedCode = result.code;
            method = 'Gemini';
          } catch {
            const rule = new RuleBasedOptimizer();
            const result = rule.optimize(originalCode, 'python');
            optimizedCode = result.code;
            method = 'rule-based (Gemini failed)';
            transformations = result.transformations;
          }
        } else {
          const rule = new RuleBasedOptimizer();
          const result = rule.optimize(originalCode, 'python');
          optimizedCode = result.code;
          transformations = result.transformations;
        }

        const body = new Widget();
        body.addClass('jp-OptimizerDialog');
        body.node.innerHTML = `
          <div style="display:flex;gap:12px;min-height:0">
            <div style="flex:1;min-width:0">
              <h3 style="margin:0 0 6px">Original:</h3>
              <pre style="background:#f5f5f5;padding:10px;border-radius:4px;white-space:pre-wrap;font-size:12px;max-height:340px;overflow:auto">${escapeHtml(originalCode)}</pre>
            </div>
            <div style="flex:1;min-width:0">
              <h3 style="margin:0 0 6px;color:#2e7d32">Optimized (${method}):</h3>
              <pre style="background:#e8f5e9;padding:10px;border-radius:4px;white-space:pre-wrap;font-size:12px;max-height:340px;overflow:auto">${escapeHtml(optimizedCode)}</pre>
            </div>
          </div>
          ${
            transformations.length > 0
              ? `<ul style="font-size:12px;margin:8px 0 0">${transformations.map(t => `<li>${escapeHtml(t.description)}</li>`).join('')}</ul>`
              : ''
          }
        `;

        const buttons =
          optimizedCode === originalCode
            ? [Dialog.okButton({ label: 'Close' })]
            : [
                Dialog.cancelButton({ label: 'Reject' }),
                Dialog.okButton({ label: 'Accept' })
              ];

        const result = await showDialog({
          title:
            optimizedCode === originalCode
              ? `No Changes (${method})`
              : `Review Optimization (${method})`,
          body,
          buttons
        });

        if (result.button.accept && optimizedCode !== originalCode) {
          cell.model.sharedModel.setSource(optimizedCode);
        }
      }
    });

    const addButtonsToPanel = (notebookPanel: NotebookPanel) => {
      // "Optimize All" — Gemini first if API key set, rule-based fallback
      const optimizeAllButton = new ToolbarButton({
        icon: offlineBoltIcon,
        label: 'Optimize All',
        tooltip: 'Optimize all cells (Gemini if configured, else rule-based)',
        onClick: async () => {
          const notebook = notebookPanel.content;
          const apiKey =
            (pluginSettings?.get('llmApiKey').composite as string) ?? '';

          const codeCells: Array<{ index: number; code: string }> = [];
          notebook.widgets.forEach((cell, index) => {
            if (
              cell.model.type === 'code' &&
              cell.model.sharedModel.getSource().trim()
            ) {
              codeCells.push({
                index,
                code: cell.model.sharedModel.getSource()
              });
            }
          });

          if (codeCells.length === 0) {
            const b = new Widget();
            b.node.textContent = 'No non-empty code cells found.';
            showDialog({
              title: 'Nothing to Optimize',
              body: b,
              buttons: [Dialog.okButton()]
            });
            return;
          }

          if (apiKey) {
            // ── Gemini path — live queue: dialog opens immediately, cells stream in ──
            const llmModel =
              (pluginSettings?.get('llmModel').composite as string) ||
              'gemini-flash-latest';

            interface IGResult {
              index: number;
              originalCode: string;
              optimizedCode: string;
              changed: boolean;
              error?: string;
            }

            // Build the dialog body up-front with a placeholder row per cell
            const reviewBody = new Widget();
            reviewBody.addClass('jp-OptimizerDialog');
            reviewBody.node.style.minWidth = '560px';

            const statusLine = document.createElement('p');
            statusLine.style.cssText =
              'margin:0 0 8px;font-size:13px;color:#555';
            statusLine.textContent = `Sending ${codeCells.length} cell(s) to Gemini…`;
            reviewBody.node.appendChild(statusLine);

            // One section per cell — starts as a spinner, filled in when result arrives
            const cellSections: HTMLDivElement[] = [];
            const checkboxes: Array<{
              checkbox: HTMLInputElement;
              cellIndex: number;
              optimizedCode: string;
            }> = [];

            codeCells.forEach(({ index }) => {
              const section = document.createElement('div');
              section.style.cssText =
                'margin-top:12px;border-top:1px solid #e0e0e0;padding-top:10px';
              section.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;font-weight:bold;margin-bottom:6px">
                  <span>Cell ${index + 1}</span>
                  <span class="cell-status" style="font-weight:normal;color:#888;font-size:12px">⏳ waiting…</span>
                </div>
                <div class="cell-diff" style="color:#aaa;font-size:12px;padding:4px 0">Optimizing…</div>
              `;
              cellSections.push(section);
              reviewBody.node.appendChild(section);
            });

            // Show the dialog immediately — Apply Selected starts disabled
            let resolveDialog!: (v: Dialog.IResult<unknown>) => void;
            const dialogDone = new Promise<Dialog.IResult<unknown>>(res => {
              resolveDialog = res;
            });

            const dialogPromise = showDialog({
              title: `Gemini — Optimizing ${codeCells.length} cell(s)`,
              body: reviewBody,
              buttons: [
                Dialog.cancelButton({ label: 'Cancel' }),
                Dialog.okButton({ label: 'Apply Selected' })
              ]
            });
            dialogPromise.then(r => resolveDialog(r));

            // Disable Apply Selected until all results are in
            // (find the ok button and disable it)
            requestAnimationFrame(() => {
              const okBtn = document.querySelector(
                '.jp-Dialog-button.jp-mod-accept'
              ) as HTMLButtonElement | null;
              if (okBtn) okBtn.disabled = true;
            });

            let cancelled = false;
            let doneCount = 0;
            const geminiResults: IGResult[] = [];

            // Fire all cell requests in parallel
            const cellPromises = codeCells.map(async ({ index, code }, i) => {
              try {
                const controller = new AbortController();
                const tid = setTimeout(() => controller.abort(), 30000);
                let resp: Response;
                try {
                  const prompt = `You are a code optimization expert. Optimize the following Python code.
Optimization goals:
- Optimize for readability and maintainability
- Use Pythonic idioms (list comprehensions, built-ins, zip/enumerate)
- Remove unnecessary code and variables
Important: Preserve the original functionality. Return ONLY the optimized code, no explanations or markdown.

\`\`\`python
${code}
\`\`\``;
                  resp = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${llmModel}:generateContent?key=${apiKey}`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                      }),
                      signal: controller.signal
                    }
                  );
                } finally {
                  clearTimeout(tid);
                }
                if (!resp.ok)
                  throw new Error(`${resp.status} ${resp.statusText}`);
                const data = await resp.json();
                let optimized: string =
                  data.candidates[0].content.parts[0].text;
                // Strip markdown fences if present
                optimized = optimized
                  .replace(/```[\w]*\n?([\s\S]*?)```/g, '$1')
                  .trim();
                const changed =
                  optimized !== '' && optimized.trim() !== code.trim();

                geminiResults.push({
                  index,
                  originalCode: code,
                  optimizedCode: changed ? optimized : code,
                  changed
                });

                // Update this cell's section in the dialog
                const section = cellSections[i];
                const statusEl = section.querySelector(
                  '.cell-status'
                ) as HTMLElement;
                const diffEl = section.querySelector(
                  '.cell-diff'
                ) as HTMLElement;

                if (changed) {
                  statusEl.textContent = '✓ optimized';
                  statusEl.style.color = '#2e7d32';

                  const checkbox = document.createElement('input');
                  checkbox.type = 'checkbox';
                  checkbox.checked = true;
                  checkboxes.push({
                    checkbox,
                    cellIndex: index,
                    optimizedCode: optimized
                  });

                  const label = section.querySelector('div') as HTMLElement;
                  label.insertBefore(checkbox, label.firstChild);

                  diffEl.innerHTML = `
                    <div style="display:flex;gap:8px">
                      <div style="flex:1;min-width:0">
                        <h5 style="margin:0 0 4px;color:#555">Original:</h5>
                        <pre style="background:#f5f5f5;padding:8px;border-radius:4px;white-space:pre-wrap;font-size:12px;max-height:150px;overflow:auto">${escapeHtml(code)}</pre>
                      </div>
                      <div style="flex:1;min-width:0">
                        <h5 style="margin:0 0 4px;color:#2e7d32">Optimized:</h5>
                        <pre style="background:#e8f5e9;padding:8px;border-radius:4px;white-space:pre-wrap;font-size:12px;max-height:150px;overflow:auto">${escapeHtml(optimized)}</pre>
                      </div>
                    </div>
                  `;
                } else {
                  statusEl.textContent = '— no changes';
                  statusEl.style.color = '#aaa';
                  diffEl.textContent = '';
                }
              } catch (err: any) {
                geminiResults.push({
                  index,
                  originalCode: code,
                  optimizedCode: code,
                  changed: false,
                  error: String(err?.message ?? err)
                });
                const section = cellSections[i];
                const statusEl = section.querySelector(
                  '.cell-status'
                ) as HTMLElement;
                const diffEl = section.querySelector(
                  '.cell-diff'
                ) as HTMLElement;
                statusEl.textContent = '✗ failed';
                statusEl.style.color = '#c00';
                diffEl.textContent = '';
              }

              doneCount++;
              statusLine.textContent =
                doneCount < codeCells.length
                  ? `${doneCount} of ${codeCells.length} done, waiting for remaining…`
                  : `All ${codeCells.length} cell(s) processed.`;

              if (doneCount === codeCells.length) {
                // Re-enable Apply Selected and update title
                const okBtn = document.querySelector(
                  '.jp-Dialog-button.jp-mod-accept'
                ) as HTMLButtonElement | null;
                if (okBtn) okBtn.disabled = false;
                const titleEl = document.querySelector(
                  '.jp-Dialog-header'
                ) as HTMLElement | null;
                const changed = geminiResults.filter(r => r.changed).length;
                if (titleEl)
                  titleEl.textContent = `Gemini — ${changed} Change(s) Ready`;
              }
            });

            // Wait for all parallel calls AND for the user to interact with the dialog
            await Promise.all(cellPromises);
            const dialogResult = await dialogDone;
            cancelled = !dialogResult.button.accept;

            if (!cancelled) {
              checkboxes.forEach(({ checkbox, cellIndex, optimizedCode }) => {
                if (checkbox.checked) {
                  notebook.widgets[cellIndex].model.sharedModel.setSource(
                    optimizedCode
                  );
                }
              });
            }
          } else {
            // ── Rule-based path ───────────────────────────────────────────────
            const ruleOptimizer = new RuleBasedOptimizer();

            interface IRResult {
              index: number;
              originalCode: string;
              optimizedCode: string;
              transformations: any[];
              changed: boolean;
            }
            const results: IRResult[] = [];

            notebook.widgets.forEach((cell, index) => {
              if (cell.model.type === 'code') {
                const orig = cell.model.sharedModel.getSource();
                const opt = ruleOptimizer.optimize(orig, 'python');
                results.push({
                  index,
                  originalCode: orig,
                  optimizedCode: opt.code,
                  transformations: opt.transformations,
                  changed: opt.code !== orig
                });
              }
            });

            const changedR = results.filter(r => r.changed);
            const body = new Widget();
            body.addClass('jp-OptimizerDialog');

            if (changedR.length === 0) {
              body.node.textContent = `All ${results.length} code cell(s) are already optimized.`;
              showDialog({
                title: 'No Changes',
                body,
                buttons: [Dialog.okButton({ label: 'Close' })]
              });
              return;
            }

            const summary = document.createElement('p');
            summary.innerHTML = `<strong>${changedR.length}</strong> of <strong>${results.length}</strong> cell(s) can be optimized:`;
            body.node.appendChild(summary);

            changedR.forEach(r => {
              const section = document.createElement('div');
              section.style.cssText =
                'margin-top:16px;border-top:1px solid #ccc;padding-top:8px';
              section.innerHTML = `
                <h4 style="margin:0 0 8px">Cell ${r.index + 1}</h4>
                <div style="display:flex;gap:8px">
                  <div style="flex:1;min-width:0">
                    <h5 style="margin:0 0 4px">Original:</h5>
                    <pre style="background:#f5f5f5;padding:8px;border-radius:4px;font-size:12px;white-space:pre-wrap;max-height:150px;overflow:auto">${escapeHtml(r.originalCode)}</pre>
                  </div>
                  <div style="flex:1;min-width:0">
                    <h5 style="margin:0 0 4px;color:#2e7d32">Optimized:</h5>
                    <pre style="background:#e8f5e9;padding:8px;border-radius:4px;font-size:12px;white-space:pre-wrap;max-height:150px;overflow:auto">${escapeHtml(r.optimizedCode)}</pre>
                  </div>
                </div>
                ${
                  r.transformations.length > 0
                    ? `<ul style="font-size:12px;margin:6px 0 0">${r.transformations.map(t => `<li>${escapeHtml(t.description)}</li>`).join('')}</ul>`
                    : ''
                }
              `;
              body.node.appendChild(section);
            });

            const ruleResult = await showDialog({
              title: `Optimize All (rule-based) — ${changedR.length} Change(s)`,
              body,
              buttons: [
                Dialog.cancelButton({ label: 'Reject All' }),
                Dialog.okButton({ label: 'Accept All' })
              ]
            });

            if (ruleResult.button.accept) {
              changedR.forEach(r => {
                notebook.widgets[r.index].model.sharedModel.setSource(
                  r.optimizedCode
                );
              });
            }
          }
        }
      });

      notebookPanel.toolbar.addItem('optimize-all', optimizeAllButton);

      // Inject per-cell ⚡ button into the floating cell toolbar
      const injectCellButton = async (cell: any) => {
        if (!cell || cell.model?.type !== 'code' || cell.isDisposed) return;
        // Wait for cell to be ready, then give the cell toolbar time to attach
        try {
          await cell.ready;
        } catch {
          return;
        }
        await new Promise(r => setTimeout(r, 80));
        if (cell.isDisposed || !cell.inputArea) return;

        const widgets: any[] = (cell.inputArea.layout as any)?.widgets ?? [];
        for (const w of widgets) {
          if (
            w &&
            typeof w.insertItem === 'function' &&
            typeof w.names === 'function'
          ) {
            const names: string[] = Array.from(w.names());
            if (!names.includes('optimize-active-cell')) {
              const btn = new ToolbarButton({
                icon: offlineBoltIcon,
                tooltip: 'Optimize this cell',
                onClick: () => {
                  void app.commands.execute(
                    'code-optimizer:optimize-active-cell'
                  );
                }
              });
              w.insertItem(0, 'optimize-active-cell', btn);
            }
            return;
          }
        }
      };

      notebookPanel.content.activeCellChanged.connect((_, cell) => {
        void injectCellButton(cell);
      });
      void injectCellButton(notebookPanel.content.activeCell);
    };

    tracker.widgetAdded.connect((_, panel) => addButtonsToPanel(panel));
    tracker.forEach(panel => addButtonsToPanel(panel));
  }
};

export default plugin;
