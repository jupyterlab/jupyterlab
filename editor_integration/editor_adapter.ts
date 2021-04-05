import { CodeEditor } from '@jupyterlab/codeeditor';

import { IFeatureEditorIntegration } from '../feature';
import { IRootPosition } from '../positioning';
import { ILSPLogConsole } from '../tokens';
import { until_ready } from '../utils';
import { VirtualDocument } from '../virtual/document';
import { IEditorChange, IVirtualEditor } from '../virtual/editor';

import IEditor = CodeEditor.IEditor;

export class EditorAdapter<T extends IVirtualEditor<IEditor>> {
  features: Map<string, IFeatureEditorIntegration<T>>;
  isDisposed = false;

  private last_change: IEditorChange;
  private console: ILSPLogConsole;

  constructor(
    protected editor: IVirtualEditor<CodeEditor.IEditor>,
    protected virtual_document: VirtualDocument,
    features = new Array<IFeatureEditorIntegration<T>>(),
    console: ILSPLogConsole
  ) {
    this.editor.change.connect(this.saveChange, this);
    this.console = console.scope('EditorAdapter');

    this.features = new Map();

    for (let feature of features) {
      feature.register();
      if (!feature.is_registered) {
        this.console.warn(
          'The feature ',
          feature,
          'was not registered properly'
        );
      }
      this.features.set(feature.feature.id, feature);
    }
  }

  public async updateAfterChange() {
    try {
      await until_ready(() => this.last_change != null, 30, 22);
    } catch (err) {
      this.console.log(
        'No change obtained from CodeMirror editor within the expected time of 0.66s'
      );
      return;
    }

    let change: IEditorChange = this.last_change;

    let root_position: IRootPosition;

    try {
      root_position = this.editor.get_cursor_position();
    } catch (err) {
      this.console.log('Root position not found');
      return;
    }

    try {
      let document = this.editor.document_at_root_position(root_position);

      if (this.virtual_document !== document) {
        return true;
      }

      if (!change || !change.text.length || !change.text[0].length) {
        // deletion - ignore
        return true;
      }

      for (let feature of this.features.values()) {
        try {
          feature.afterChange(change, root_position);
        } catch (err) {
          console.warn('afterChange of feature', feature, 'failed with', err);
        }
      }
      return true;
    } catch (e) {
      this.console.log('updateAfterChange failure');
      this.console.error(e);
    }
    this.invalidateLastChange();
  }

  public invalidateLastChange() {
    this.last_change = null;
  }

  public saveChange(sender: IVirtualEditor<IEditor>, change: IEditorChange) {
    this.last_change = change;
  }

  public dispose() {
    if (this.isDisposed) {
      return;
    }
    for (let feature of this.features.values()) {
      feature.remove();
    }
    this.features.clear();
    this.editor.change.disconnect(this.saveChange);

    // just to be sure
    this.editor = null;

    // actually disposed
    this.isDisposed = true;
  }
}
