import {
  CodeMirrorEditorFactory,
  CodeMirrorMimeTypeService
} from '@jupyterlab/codemirror';

import { JupyterServer } from '@jupyterlab/testutils';

import { KernelSpecManager } from '@jupyterlab/services';

import { CommandRegistry } from '@lumino/commands';

import { Debugger } from '../src/debugger';

import { DebuggerService } from '../src/service';

/**
 * A test sidebar.
 */
class TestSidebar extends Debugger.Sidebar {}

const server = new JupyterServer();

beforeAll(async () => {
  jest.setTimeout(20000);
  await server.start();
});

afterAll(async () => {
  await server.shutdown();
});

describe('Debugger', () => {
  const specsManager = new KernelSpecManager();
  const config = new Debugger.Config();
  const service = new DebuggerService({ specsManager, config });
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
