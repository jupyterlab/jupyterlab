// tests/stream‑cleanup.spec.ts
// import { KernelMessage } from '@jupyterlab/services';
import { NotebookActions, NotebookPanel } from '@jupyterlab/notebook';
import { CodeCellModel } from '@jupyterlab/cells';
import {
  createMockContext,
  createNotebookPanel
} from '@jupyterlab/notebook/test/utils';

describe('Uncoalesced stream outputs persistence', () => {
  let panel: NotebookPanel;
  let cellModel: CodeCellModel;

  beforeEach(async () => {
    // Create a fresh NotebookPanel with one empty code cell
    const context = await createMockContext();
    panel = createNotebookPanel(context);
    await panel.sessionContext.initialize(); // mount & start a no‑op kernel
    await panel.revealed; // make sure the widget is attached
    cellModel = panel.model!.cells.get(0) as CodeCellModel;
  });

  afterEach(async () => {
    await panel.sessionContext.shutdown();
    panel.dispose();
  });

  function emitStream(text: string) {
    // Directly add the output to the cell model for testing
    cellModel.outputs.add({
      output_type: 'stream',
      name: 'stdout',
      text
    });
  }

  it('clears previous partial stream outputs before a re‑run', async () => {
    // 1) First “run”: emit a few partial stdout chunks
    emitStream('0\n');
    emitStream('1\n');
    emitStream('2\n');
    console.log('This is outputs:', cellModel.outputs.toJSON());
    expect(cellModel.outputs.length).toBe(3);
    expect(cellModel.outputs.toJSON().map((o: any) => o.text)).toEqual([
      '0\n',
      '1\n',
      '2\n'
    ]);

    // 2) Clear all outputs (simulates “clean cells”)
    NotebookActions.clearAllOutputs(panel.content);
    expect(cellModel.outputs.length).toBe(0);

    // 3) Second “run”: emit the new stream
    emitStream('hi\n');

    // 4) Assert that only the new output remains
    expect(cellModel.outputs.length).toBe(1);
    const out = cellModel.outputs.get(0).toJSON() as any;
    expect(out.output_type).toBe('stream');
    expect(out.name).toBe('stdout');
    expect(out.text).toBe('hi\n');
  });
});
