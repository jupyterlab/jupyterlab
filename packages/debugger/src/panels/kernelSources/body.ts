// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  CodeEditorWrapper,
  IEditorMimeTypeService,
  IEditorServices
} from '@jupyterlab/codeeditor';

import { viewBreakpointIcon } from '../../icons';

import { ToolbarButton } from '@jupyterlab/ui-components';

import { Kernel, KernelMessage } from '@jupyterlab/services';

import { Signal } from '@lumino/signaling';

import { PanelLayout, Widget } from '@lumino/widgets';

import { Debugger } from '../..';

import { EditorHandler } from '../../handlers/editor';

import { IDebugger } from '../../tokens';

/**
 * The body for a Sources Panel.
 */
export class KernelSourcesBody extends Widget {
  /**
   * Instantiate a new Body for the SourcesBody widget.
   *
   * @param options The instantiation options for a SourcesBody.
   */
  constructor(options: KernelSourcesBody.IOptions) {
    super();
    this._model = options.model;
    this._debuggerService = options.service;
    this._mimeTypeService = options.editorServices.mimeTypeService;

    const factory = new Debugger.ReadOnlyEditorFactory({
      editorServices: options.editorServices
    });

    const layout = new PanelLayout();
    this.layout = layout;
    this.addClass('jp-DebuggerKernelSources-body');

    this._editor = factory.createNewEditor({
      content: '',
      mimeType: '',
      path: ''
    });
    this._editor.hide();

    this._model.currentFrameChanged.connect(async (_, frame) => {
      if (!frame) {
        this._clearEditor();
        return;
      }
      const kernel = this._debuggerService.session?.connection
        ?.kernel as Kernel.IKernelConnection;
      kernel.registerCommTarget(
        'get_sources',
        (comm: Kernel.IComm, commOpen: KernelMessage.ICommOpenMsg) => {
          comm.onMsg = msg => {
            const data = JSON.parse(msg.content.data as any);
            Object.entries(data).forEach(entry => {
              const [key, value] = entry;
              const button = new ToolbarButton({
                icon: viewBreakpointIcon,
                onClick: (): void => {
                  this._debuggerService
                    .getSource({
                      sourceReference: 0,
                      path: value as string
                    })
                    .then(source => {
                      console.log('---', source);
                      this._model.currentSource = source;
                      this._model.open();
                    });
                },
                label: key,
                tooltip: value as string
              });
              layout.addWidget(button);
            });
          };
        }
      );
      const code = `
import sys, re, json
from ipykernel.comm import Comm
comm = Comm(target_name="get_sources")
# help('modules')
modules = [sys.modules[name] for name in sys.modules]
mods = {}
for module in modules:
    m = str(module)
    if ".py'" in m:
        x = re.findall(r"'(.*?)'", m)
        mods[x[0]] = x[1]

j = json.dumps(mods)
print(j)
comm.send(data=str(j))
comm.close(data="closing comm")
`;
      kernel.requestExecute({
        code
      });

      void this._showSource(frame);
    });
  }

  /**
   * Dispose the sources body widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._editorHandler?.dispose();
    Signal.clearData(this);
    super.dispose();
  }

  /**
   * Clear the content of the source read-only editor.
   */
  private _clearEditor(): void {
    this._model.currentSource = null;
    this._editor.hide();
  }

  /**
   * Show the content of the source for the given frame.
   *
   * @param frame The current frame.
   */
  private async _showSource(frame: IDebugger.IStackFrame): Promise<void> {
    const path = frame.source?.path;
    const source = await this._debuggerService.getSource({
      sourceReference: 0,
      path
    });

    if (!source?.content) {
      this._clearEditor();
      return;
    }

    if (this._editorHandler) {
      this._editorHandler.dispose();
    }

    const { content, mimeType } = source;
    const editorMimeType =
      mimeType || this._mimeTypeService.getMimeTypeByFilePath(path ?? '');

    this._editor.model.value.text = content;
    this._editor.model.mimeType = editorMimeType;

    this._editorHandler = new EditorHandler({
      debuggerService: this._debuggerService,
      editor: this._editor.editor,
      path
    });

    this._model.currentSource = {
      content,
      mimeType: editorMimeType,
      path: path ?? ''
    };

    requestAnimationFrame(() => {
      EditorHandler.showCurrentLine(this._editor.editor, frame.line);
    });

    this._editor.show();
  }

  private _model: IDebugger.Model.ISources;
  private _editor: CodeEditorWrapper;
  private _editorHandler: EditorHandler;
  private _debuggerService: IDebugger;
  private _mimeTypeService: IEditorMimeTypeService;
}

/**
 * A namespace for SourcesBody `statics`.
 */
export namespace KernelSourcesBody {
  /**
   * Instantiation options for `Breakpoints`.
   */
  export interface IOptions {
    /**
     * The debug service.
     */
    service: IDebugger;

    /**
     * The sources model.
     */
    model: IDebugger.Model.ISources;

    /**
     * The editor services used to create new read-only editors.
     */
    editorServices: IEditorServices;
  }
}
