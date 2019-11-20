import { expect } from 'chai';

import {
  CodeMirrorEditorFactory,
  CodeMirrorMimeTypeService
} from '@jupyterlab/codemirror';

import { CommandRegistry } from '@phosphor/commands';

import { Debugger } from '../../lib/debugger';

import { DebugService } from '../../lib/service';

class TestPanel extends Debugger {}

describe('Debugger', () => {
  const service = new DebugService();
  const registry = new CommandRegistry();
  const factoryService = new CodeMirrorEditorFactory();
  const mimeTypeService = new CodeMirrorMimeTypeService();

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
      editorServices: {
        factoryService,
        mimeTypeService
      }
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
