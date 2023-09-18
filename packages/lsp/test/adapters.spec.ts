/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  CodeExtractorsManager,
  DocumentConnectionManager,
  EditorAdapter,
  FeatureManager,
  LanguageServerManager,
  WidgetLSPAdapterTracker
} from '@jupyterlab/lsp';
import { ServerConnection } from '@jupyterlab/services';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { NotebookAdapter } from '@jupyterlab/notebook';
import { LabShell } from '@jupyterlab/application';

import { signalToPromise } from '@jupyterlab/testing';
import { NBTestUtils } from '@jupyterlab/notebook/lib/testutils';

import { Widget } from '@lumino/widgets';
import { PromiseDelegate } from '@lumino/coreutils';

const spy = jest.spyOn(ServerConnection, 'makeRequest');
const specs = {
  /* eslint-disable */
  pyls: {
    argv: [''],
    display_name: 'pyls',
    env: {},
    languages: ['python'],
    mime_types: ['text/python', 'text/x-ipython'],
    version: 2
  }
  /* eslint-enable  */
};
const sessions = {
  /* eslint-disable */
  pyls: {
    handler_count: 0,
    last_handler_message_at: null,
    last_server_message_at: null,
    spec: specs.pyls,
    status: 'not_started'
  }
  /* eslint-enable  */
};
spy.mockImplementation((status, method, setting) => {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => ({
      sessions,
      specs,
      version: 2
    })
  }) as any;
});

describe('@jupyterlab/lsp', () => {
  describe('WidgetLSPAdapterTracker', () => {
    let tracker: WidgetLSPAdapterTracker;
    let shell: LabShell;

    beforeEach(() => {
      shell = new LabShell({ waitForRestore: false });
      tracker = new WidgetLSPAdapterTracker({ shell });
      Widget.attach(shell, document.body);
    });

    afterEach(() => {
      tracker.dispose();
      shell.dispose();
    });

    it('should add an adapter', async () => {
      const adapter = await createAdapter(tracker);

      tracker.add(adapter);

      expect(tracker.size).toEqual(1);
      expect(tracker.has(adapter)).toEqual(true);

      adapter.dispose();
    });

    it('should find an adapter', async () => {
      const adapter = await createAdapter(tracker);
      tracker.add(adapter);

      expect(tracker.find(value => value === adapter)).toBe(adapter);

      adapter.dispose();
    });

    it('the latest adapter should become the current adapter', async () => {
      const adapter = await createAdapter(tracker);
      tracker.add(adapter);

      expect(tracker.currentAdapter).toBe(adapter);

      adapter.dispose();
    });

    it('the latest adapter should not become the current adapter', async () => {
      const adapter1 = await createAdapter(tracker);

      shell.add(adapter1.editorWidget, 'main');
      shell.activateById(adapter1.editorWidget.id);
      tracker.add(adapter1);

      expect(tracker.currentAdapter).toBe(adapter1);

      const adapter2 = await createAdapter(tracker);
      tracker.add(adapter2);

      expect(tracker.currentAdapter).not.toBe(adapter2);

      adapter1.dispose();
      adapter2.dispose();
    });

    it('should emit signal after adding an adapter', async () => {
      const adapter = await createAdapter(tracker);
      const promise = signalToPromise(tracker.adapterAdded);

      tracker.add(adapter);
      const [_, res] = await promise;

      expect(adapter).toBe(res);

      adapter.dispose();
    });

    it('should emit signal when the current adapter changes', async () => {
      const adapter1 = await createAdapter(tracker);
      shell.add(adapter1.editorWidget, 'main');
      tracker.add(adapter1);
      shell.activateById(adapter1.editorWidget.id);

      expect(tracker.currentAdapter).toBe(adapter1);

      const waitForActivation = signalToPromise(shell.currentChanged);

      const adapter2 = await createAdapter(tracker);
      shell.add(adapter2.editorWidget, 'main');
      tracker.add(adapter2);
      shell.activateById(adapter2.editorWidget.id);

      await waitForActivation;
      expect(tracker.currentAdapter).toBe(adapter2);

      const promise = signalToPromise(tracker.currentChanged);

      shell.activateById(adapter1.editorWidget.id);
      const [_, res] = await promise;

      expect(res).toBe(adapter1);

      adapter1.dispose();
      adapter2.dispose();
    });
  });

  describe('EditorAdapter', () => {
    it('should create an adapter', async () => {
      const shell = new LabShell({ waitForRestore: false });
      const tracker = new WidgetLSPAdapterTracker({ shell });
      Widget.attach(shell, document.body);
      const widgetAdapter = await createAdapter(tracker);

      const editor = new CodeMirrorEditor({
        host: document.body,
        model: new CodeEditor.Model()
      });

      const promise = new PromiseDelegate<any>();

      const adapter = new EditorAdapter({
        editor: {
          getEditor: () => editor,
          ready: () => Promise.resolve(editor),
          reveal: () => Promise.resolve(editor)
        },
        extensions: [
          {
            name: 'test_editor_extension',
            factory: options => {
              const { editor, widgetAdapter } = options;
              promise.resolve({
                triggered: true,
                editor: editor.getEditor(),
                widgetAdapter: widgetAdapter
              });
              return null;
            }
          }
        ],
        widgetAdapter
      });

      const res = await promise.promise;

      expect(res.triggered).toEqual(true);
      expect(res.editor).toBe(editor);
      expect(res.widgetAdapter).toBe(widgetAdapter);

      adapter.dispose();
      shell.dispose();
      tracker.dispose();
    });
  });
});

async function createAdapter(
  adapterTracker: WidgetLSPAdapterTracker
): Promise<NotebookAdapter> {
  const featureManager = new FeatureManager();
  const foreignCodeExtractorsManager = new CodeExtractorsManager();
  const languageServerManager = new LanguageServerManager({
    retries: 0,
    retriesInterval: 0
  });
  const connectionManager = new DocumentConnectionManager({
    adapterTracker,
    languageServerManager
  });

  const context = await NBTestUtils.createMockContext(false);
  const nb = NBTestUtils.createNotebookPanel(context);

  const adapter = new NotebookAdapter(nb, {
    connectionManager,
    featureManager,
    foreignCodeExtractorsManager
  });

  adapter.disposed.connect(() => {
    languageServerManager.dispose();
  });
  return adapter;
}
