import { expect } from 'chai';
import { CodeMirrorAdapter } from './cm_adapter';
import { LSPConnection } from '../../connection';
import {
  IJupyterLabComponentsManager,
  StatusMessage
} from '../jupyterlab/jl_adapter';
import { IRootPosition } from '../../positioning';
import * as CodeMirror from 'codemirror';
import { DummySettings, FileEditorFeatureTestEnvironment } from './testutils';
import { CodeMirrorIntegration } from "../../editor_integration/codemirror";

describe('CodeMirrorAdapter', () => {
  let env: FileEditorFeatureTestEnvironment;

  beforeEach(() => (env = new FileEditorFeatureTestEnvironment()));
  afterEach(() => env.dispose());

  describe('Works with VirtualFileEditor', () => {
    let dummy_components_manager: IJupyterLabComponentsManager;
    let connection: LSPConnection;

    it('updates on change', async () => {
      class UpdateReceivingFeature extends CodeMirrorIntegration {
        name = 'UpdateReceivingFeature';
        public received_update = false;
        public last_change: CodeMirror.EditorChange = null;
        public last_change_position: IRootPosition;

        afterChange(
          change: CodeMirror.EditorChange,
          root_position: IRootPosition
        ): void {
          this.received_update = true;
          this.last_change = change;
          this.last_change_position = root_position;
        }
      }

      connection = env.create_dummy_connection();
      dummy_components_manager = env.create_dummy_components();
      let virtual_editor = env.virtual_editor;

      let feature = new UpdateReceivingFeature(
        virtual_editor,
        virtual_editor.virtual_document,
        connection,
        dummy_components_manager,
        new StatusMessage(),
        new DummySettings()
      );

      let adapter = new CodeMirrorAdapter(
        virtual_editor,
        virtual_editor.virtual_document,
        dummy_components_manager,
        [feature]
      );
      env.ce_editor.model.value.text = 'f';
      await virtual_editor.update_documents();
      expect(feature.received_update).to.equal(false);

      env.ce_editor.model.value.text = 'fo';
      await virtual_editor.update_documents();
      await adapter.updateAfterChange();

      expect(feature.received_update).to.equal(true);
      expect(feature.last_change.text[0]).to.equal('fo');

      connection.close();
    });
  });
});
