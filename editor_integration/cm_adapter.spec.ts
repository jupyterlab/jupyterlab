import { expect } from 'chai';
import type * as CodeMirror from 'codemirror';

import { IRootPosition } from '../positioning';
import { IEditorChange } from '../virtual/editor';

import { CodeMirrorIntegration } from './codemirror';
import { FileEditorFeatureTestEnvironment } from './testutils';

describe('CodeMirrorAdapter', () => {
  let env: FileEditorFeatureTestEnvironment;

  beforeEach(() => (env = new FileEditorFeatureTestEnvironment()));
  afterEach(() => env.dispose());

  describe('Works with VirtualFileEditor', () => {
    it('updates on change', async () => {
      class UpdateReceivingFeature extends CodeMirrorIntegration {
        public received_update = false;
        public last_change: CodeMirror.EditorChange = null;
        public last_change_position: IRootPosition;

        afterChange(change: IEditorChange, root_position: IRootPosition): void {
          this.received_update = true;
          this.last_change = change;
          this.last_change_position = root_position;
        }
      }

      await env.adapter.widget.context.initialize(true);
      await env.adapter.widget.context.ready;
      await env.adapter.initialized;

      let feature = env.init_integration({
        constructor: UpdateReceivingFeature,
        id: 'UpdateReceivingFeature'
      }) as UpdateReceivingFeature;

      await env.adapter.update_finished;
      expect(feature.received_update).to.equal(false);

      env.ce_editor.model.value.text = 'fo';
      await env.adapter.update_finished;
      expect(feature.received_update).to.equal(true);
      expect(feature.last_change.text[0]).to.equal('fo');
    });
  });
});
