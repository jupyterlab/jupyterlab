import * as CodeMirror from 'codemirror';
import { until_ready } from '../../utils';
import { VirtualCodeMirrorEditor } from '../../virtual/editor';
import { VirtualDocument } from '../../virtual/document';
import { IRootPosition } from '../../positioning';
import { IJupyterLabComponentsManager } from '../jupyterlab/jl_adapter';
import { FeatureEditorIntegration } from "../../feature";
import { CodeMirrorEditor } from "@jupyterlab/codemirror";

export class CodeMirrorAdapter {
  features: Map<string, FeatureEditorIntegration<CodeMirrorEditor>>;
  isDisposed = false;

  private last_change: CodeMirror.EditorChange;

  constructor(
    protected editor: VirtualCodeMirrorEditor,
    protected virtual_document: VirtualDocument,
    protected jupyterlab_components: IJupyterLabComponentsManager,
    features = new Array<FeatureEditorIntegration<CodeMirrorEditor>>()
  ) {
    this.editor.on('change', this.saveChange);

    this.features = new Map();

    for (let feature of features) {
      feature.register();
      if (!feature.is_registered) {
        this.editor.console.warn(
          'The feature ',
          feature,
          'was not registered properly'
        );
      }
      this.features.set(feature.feature.id, feature);
    }
  }

  public async updateAfterChange() {
    this.jupyterlab_components.remove_tooltip();

    try {
      await until_ready(() => this.last_change != null, 30, 22);
    } catch (err) {
      console.log(
        'No change obtained from CodeMirror editor within the expected time of 0.66s'
      );
      return;
    }

    let change: CodeMirror.EditorChange = this.last_change;

    let root_position: IRootPosition;

    try {
      root_position = this.editor.getDoc().getCursor('end') as IRootPosition;
    } catch (err) {
      console.log('LSP: Root positon not found');
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
        feature.afterChange(change, root_position);
      }
      return true;
    } catch (e) {
      this.editor.console.log('updateAfterChange failure');
      this.editor.console.error(e);
    }
    this.invalidateLastChange();
  }

  public invalidateLastChange() {
    this.last_change = null;
  }

  public saveChange = (
    doc: CodeMirror.Doc,
    change: CodeMirror.EditorChange
  ) => {
    this.last_change = change;
  };

  public dispose() {
    if (this.isDisposed) {
      return;
    }
    for (let feature of this.features.values()) {
      feature.remove();
    }
    this.features.clear();
    this.editor.off('change', this.saveChange);

    // just to be sure
    this.editor = null;

    // actually disposed
    this.isDisposed = true;
  }
}
