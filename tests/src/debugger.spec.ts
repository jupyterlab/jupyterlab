import { expect } from 'chai';

import { CodeMirrorEditorFactory } from '@jupyterlab/codemirror';

import { Debugger } from '../../lib/debugger';

import { DebugService } from '../../lib/service';

class TestPanel extends Debugger {}

describe('Debugger', () => {
  const service = new DebugService();
  const editorServices = new CodeMirrorEditorFactory();
  const editorFactory = editorServices.newInlineEditor;

  let panel: TestPanel;

  beforeEach(() => {
    panel = new TestPanel({
      debugService: service,
      editorFactory: editorFactory
    });
  });

  afterEach(() => {
    panel.dispose();
  });

  describe('#constructor()', () => {
    it('should create a new debugger panel', () => {
      expect(panel).to.be.an.instanceOf(Debugger);
    });
  });
});
