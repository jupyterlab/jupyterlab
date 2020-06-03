import { act } from 'react-dom/test-utils';

import {
  CodeMirrorEditorFactory,
  CodeMirrorMimeTypeService
} from '@jupyterlab/codemirror';

import { JupyterServer } from '@jupyterlab/testutils';

import { KernelSpecManager } from '@jupyterlab/services';

import { CommandRegistry } from '@lumino/commands';

import { createSession } from '@jupyterlab/testutils';

import { Session } from '@jupyterlab/services';

import { UUID } from '@lumino/coreutils';

import { MessageLoop } from '@lumino/messaging';

import { Widget } from '@lumino/widgets';

import { Debugger } from '../src/debugger';

import { DebuggerService } from '../src/service';

import { DebuggerModel } from '../src/model';

import { DebugSession } from '../src/session';

import { IDebugger } from '../src/tokens';

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
  const service = new DebuggerService({ specsManager });
  const registry = new CommandRegistry();
  const factoryService = new CodeMirrorEditorFactory();
  const mimeTypeService = new CodeMirrorMimeTypeService();

  let model: DebuggerModel;
  let connection: Session.ISessionConnection;
  let sidebar: TestSidebar;

  beforeEach(async () => {
    connection = await createSession({
      name: '',
      type: 'test',
      path: UUID.uuid4()
    });
    await connection.changeKernel({ name: 'xpython' });

    model = new DebuggerModel();
    service.model = model;
    service.session = new DebugSession({ connection });

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

  describe('Breakpoints', () => {
    const path = 'path/to/file.py';

    beforeEach(() => {
      const bpMap = new Map<string, IDebugger.IBreakpoint[]>();
      bpMap.set(
        path,
        [3, 5].map((line: number, id: number) => {
          return {
            id,
            line,
            active: true,
            verified: true,
            source: {
              path
            }
          };
        })
      );
      act(() => {
        Widget.attach(sidebar, document.body);
        MessageLoop.sendMessage(sidebar, Widget.Msg.UpdateRequest);
        model.breakpoints.restoreBreakpoints(bpMap);
      });
    });

    it('should have the jp-DebuggerBreakpoints class', () => {
      expect(sidebar.breakpoints.hasClass('jp-DebuggerBreakpoints')).toBe(true);
    });

    it('should contain the list of breakpoints', async () => {
      const node = sidebar.breakpoints.node;
      const items = node.querySelectorAll('.jp-DebuggerBreakpoint');
      expect(items).toHaveLength(2);
    });

    it('should contain the path to the breakpoints', async () => {
      const node = sidebar.breakpoints.node;
      const items = node.querySelectorAll('.jp-DebuggerBreakpoint-source');
      items.forEach(item => {
        expect(item.innerHTML).toEqual(path);
      });
    });
  });
});
