import { expect } from 'chai';

import {
  CodeMirrorEditorFactory,
  CodeMirrorMimeTypeService
} from '@jupyterlab/codemirror';

import { CommandRegistry } from '@phosphor/commands';

import { Debugger } from '../../lib/debugger';

import { DebugService } from '../../lib/service';

class TestSidebar extends Debugger.Sidebar {}

describe('Debugger', () => {
  const service = new DebugService();
  const registry = new CommandRegistry();
  const factoryService = new CodeMirrorEditorFactory();
  const mimeTypeService = new CodeMirrorMimeTypeService();

  let sidebar: TestSidebar;

  beforeEach(() => {
    sidebar = new TestSidebar({
      service,
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
    sidebar.dispose();
  });

  describe('#constructor()', () => {
    it('should create a new debugger sidebar', () => {
      expect(sidebar).to.be.an.instanceOf(Debugger.Sidebar);
    });
  });
});
