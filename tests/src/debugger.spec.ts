import {
  CodeMirrorEditorFactory,
  CodeMirrorMimeTypeService
} from '@jupyterlab/codemirror';

import { CommandRegistry } from '@lumino/commands';

import { Debugger } from '../../lib/debugger';

import { DebuggerService } from '../../lib/service';

class TestSidebar extends Debugger.Sidebar {}

describe('Debugger', () => {
  const service = new DebuggerService();
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
      expect(sidebar).toBeInstanceOf(Debugger.Sidebar);
    });
  });
});
