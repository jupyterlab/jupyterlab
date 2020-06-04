import {
  CodeMirrorEditorFactory,
  CodeMirrorMimeTypeService
} from '@jupyterlab/codemirror';

import { JupyterServer } from '@jupyterlab/testutils';

import { CommandRegistry } from '@lumino/commands';

import { Debugger } from '../src/debugger';

import { DebuggerService } from '../src/service';

/**
 * A test sidebar.
 */
class TestSidebar extends Debugger.Sidebar {}

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
});

afterAll(async () => {
  await server.shutdown();
});

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
