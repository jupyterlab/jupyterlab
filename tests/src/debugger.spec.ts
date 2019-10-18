import { expect } from 'chai';

import { CodeMirrorEditorFactory } from '@jupyterlab/codemirror';

import { Debugger } from '../../lib/debugger';

class TestPanel extends Debugger {}

describe('Debugger', () => {
  const editorServices = new CodeMirrorEditorFactory();
  const editorFactory = editorServices.newInlineEditor;

  let panel: TestPanel;

  beforeEach(() => {
    panel = new TestPanel({ editorFactory });
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
