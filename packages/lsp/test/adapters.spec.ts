/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
import { LabShell } from '@jupyterlab/application';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import {
  CodeExtractorsManager,
  Document,
  DocumentConnectionManager,
  EditorAdapter,
  FeatureManager,
  IAdapterOptions,
  IVirtualPosition,
  LanguageServerManager,
  VirtualDocument,
  WidgetLSPAdapter,
  WidgetLSPAdapterTracker
} from '@jupyterlab/lsp';
import { NotebookAdapter } from '@jupyterlab/notebook';
import { NBTestUtils } from '@jupyterlab/notebook/lib/testutils';
import { ServerConnection } from '@jupyterlab/services';
import { signalToPromise } from '@jupyterlab/testing';
import { PromiseDelegate } from '@lumino/coreutils';
import { Widget } from '@lumino/widgets';

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

  describe('WidgetLSPAdapter', () => {
    let shell: LabShell;
    let adapterTracker: WidgetLSPAdapterTracker;

    beforeEach(async () => {
      shell = new LabShell({ waitForRestore: false });
      adapterTracker = new WidgetLSPAdapterTracker({ shell });
      Widget.attach(shell, document.body);
    });

    afterEach(() => {
      shell.dispose();
      adapterTracker.dispose();
    });
    it('should create an adapter', async () => {
      const { widgetAdapter } = await createMockAdapter(adapterTracker);
      expect(widgetAdapter).toBeInstanceOf(WidgetLSPAdapter);
      expect(widgetAdapter.language).toBe('python');
      expect(widgetAdapter.mimeType).toBe('text/python');
      await widgetAdapter.ready;
      expect(widgetAdapter.virtualDocument).toBeInstanceOf(VirtualDocument);
    });

    it('should disconnect signals on disposing', async () => {
      const { widgetAdapter, connectionManager, featureManager } =
        await await createMockAdapter(adapterTracker);
      const editorAddedSpy = jest.spyOn(
        widgetAdapter.editorAdded,
        'disconnect'
      );
      const editorRemovedSpy = jest.spyOn(
        widgetAdapter.editorRemoved,
        'disconnect'
      );
      const sessionsChangedSpy = jest.spyOn(
        connectionManager.languageServerManager.sessionsChanged,
        'disconnect'
      );
      const featureRegisteredSpy = jest.spyOn(
        featureManager.featureRegistered,
        'disconnect'
      );
      const disconnectSpy = jest.spyOn(widgetAdapter, 'disconnect');
      widgetAdapter.dispose();
      expect(editorAddedSpy).toHaveBeenCalled();
      expect(editorRemovedSpy).toHaveBeenCalled();
      expect(sessionsChangedSpy).toHaveBeenCalled();
      expect(featureRegisteredSpy).toHaveBeenCalled();
      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('should not update virtual document if LSP is not avaiable', async () => {
      const { widgetAdapter } = await createMockAdapter(adapterTracker);

      const { model } = widgetAdapter.widget.context;
      const contentChangedConnectSpy = jest.spyOn(
        model.contentChanged,
        'connect'
      );
      const contentChangedDisconnectSpy = jest.spyOn(
        model.contentChanged,
        'disconnect'
      );
      widgetAdapter['initVirtual']();
      expect(contentChangedConnectSpy).toHaveBeenCalledTimes(0);
      expect(contentChangedDisconnectSpy).toHaveBeenCalledTimes(1);
    });
    it('should update the virtual document if LSP server is activated and available', async () => {
      const { widgetAdapter, connectionManager, featureManager } =
        await createMockAdapter(adapterTracker);

      const { model } = widgetAdapter.widget.context;
      const contentChangedConnectSpy = jest.spyOn(
        model.contentChanged,
        'connect'
      );
      const contentChangedDisconnectSpy = jest.spyOn(
        model.contentChanged,
        'disconnect'
      );
      jest
        .spyOn(connectionManager.languageServerManager, 'isEnabled', 'get')
        .mockReturnValue(true);
      jest
        .spyOn(connectionManager.languageServerManager, 'getMatchingServers')
        .mockReturnValue(['pylsp']);
      featureManager.register({ id: 'foo-feature' });

      widgetAdapter['initVirtual']();
      expect(widgetAdapter.virtualDocument).toBeInstanceOf(VirtualDocument);
      expect(contentChangedConnectSpy).toHaveBeenCalled();
      expect(contentChangedDisconnectSpy).toHaveBeenCalledTimes(0);
    });
    it('should toggle the virtual document update if LSP server changed', async () => {
      const { widgetAdapter, connectionManager, featureManager } =
        await createMockAdapter(adapterTracker);

      const { model } = widgetAdapter.widget.context;
      const contentChangedConnectSpy = jest.spyOn(
        model.contentChanged,
        'connect'
      );
      const contentChangedDisconnectSpy = jest.spyOn(
        model.contentChanged,
        'disconnect'
      );
      widgetAdapter['initVirtual']();

      expect(contentChangedConnectSpy).toHaveBeenCalledTimes(0);
      expect(contentChangedDisconnectSpy).toHaveBeenCalled();

      // Toggle LSP on
      jest
        .spyOn(connectionManager.languageServerManager, 'isEnabled', 'get')
        .mockReturnValue(true);
      jest
        .spyOn(connectionManager.languageServerManager, 'getMatchingServers')
        .mockReturnValue(['pylsp']);
      featureManager.register({ id: 'foo-feature' });

      expect(contentChangedConnectSpy).toHaveBeenCalled();
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

class MockWidgetLSPAdapter extends WidgetLSPAdapter {
  constructor(
    public widget: any,
    protected options: IAdapterOptions
  ) {
    super(widget, options);
    this.initVirtual();
  }
  get wrapperElement(): HTMLElement {
    return document.createElement('div');
  }

  get documentPath(): string {
    return '';
  }

  get mimeType(): string {
    return 'text/python';
  }

  get languageFileExtension(): string | undefined {
    return undefined;
  }

  get activeEditor(): Document.IEditor | undefined {
    return undefined;
  }

  get editors(): Document.ICodeBlockOptions[] {
    return [];
  }

  get ready(): Promise<void> {
    return Promise.resolve();
  }

  createVirtualDocument(): VirtualDocument {
    return new VirtualDocument({} as any);
  }

  getEditorIndexAt(position: IVirtualPosition): number {
    return 0;
  }

  getEditorIndex(ceEditor: Document.IEditor): number {
    return 0;
  }

  getEditorWrapper(ceEditor: Document.IEditor): HTMLElement {
    return document.createElement('div');
  }
}

async function createMockAdapter(adapterTracker: WidgetLSPAdapterTracker) {
  const context = await NBTestUtils.createMockContext(false);
  const widget = NBTestUtils.createNotebookPanel(context);

  const languageServerManager = new LanguageServerManager({
    retries: 0,
    retriesInterval: 0
  });
  const connectionManager = new DocumentConnectionManager({
    adapterTracker,
    languageServerManager
  });
  const featureManager = new FeatureManager();
  const foreignCodeExtractorsManager = new CodeExtractorsManager();
  const widgetAdapter = new MockWidgetLSPAdapter(widget, {
    featureManager,
    connectionManager,
    foreignCodeExtractorsManager
  });
  return { widgetAdapter, connectionManager, featureManager };
}
