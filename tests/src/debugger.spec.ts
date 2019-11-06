import { expect } from 'chai';

import { CodeMirrorEditorFactory } from '@jupyterlab/codemirror';

import { CommandRegistry } from '@phosphor/commands';

import { Debugger } from '../../lib/debugger';

import { DebugService } from '../../lib/service';

class TestPanel extends Debugger {}

describe('Debugger', () => {
  const service = new DebugService();
  const registry = new CommandRegistry();
  const editorServices = new CodeMirrorEditorFactory();
  const editorFactory = editorServices.newInlineEditor;

  let panel: TestPanel;

  beforeEach(() => {
    panel = new TestPanel({
      debugService: service,
      callstackCommands: {
        registry,
        continue: '',
        terminate: '',
        next: '',
        stepIn: '',
        stepOut: ''
      },
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
