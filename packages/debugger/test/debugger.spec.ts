// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { act } from 'react-dom/test-utils';

import { CodeEditorWrapper } from '@jupyterlab/codeeditor';

import {
  CodeMirrorEditorFactory,
  CodeMirrorMimeTypeService
} from '@jupyterlab/codemirror';

import { KernelSpecManager, Session } from '@jupyterlab/services';

import {
  createSession,
  signalToPromise,
  JupyterServer
} from '@jupyterlab/testutils';

import { toArray } from '@lumino/algorithm';

import { CommandRegistry } from '@lumino/commands';

import { UUID } from '@lumino/coreutils';

import { MessageLoop } from '@lumino/messaging';

import { Widget } from '@lumino/widgets';

import { Debugger } from '../src/debugger';

import { DebuggerService } from '../src/service';

import { DebuggerModel } from '../src/model';

import { SourcesBody } from '../src/panels/sources/body';

import { SourcesHeader } from '../src/panels/sources/header';

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
  const config = new Debugger.Config();
  const service = new DebuggerService({ specsManager, config });
  const registry = new CommandRegistry();
  const factoryService = new CodeMirrorEditorFactory();
  const mimeTypeService = new CodeMirrorMimeTypeService();
  const lines = [3, 5];
  const code = [
    'i = 0',
    'i += 1',
    'i += 1',
    'j = i**2',
    'j += 1',
    'print(i, j)'
  ].join('\n');

  let breakpoints: IDebugger.IBreakpoint[];
  let session: Debugger.Session;
  let path: string;
  let connection: Session.ISessionConnection;
  let sidebar: TestSidebar;

  beforeAll(async () => {
    connection = await createSession({
      name: '',
      type: 'test',
      path: UUID.uuid4()
    });
    await connection.changeKernel({ name: 'xpython' });

    session = new Debugger.Session({ connection });
    service.session = session;

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

    await act(async () => {
      Widget.attach(sidebar, document.body);
      MessageLoop.sendMessage(sidebar, Widget.Msg.UpdateRequest);
      await service.restoreState(true);
    });

    path = service.getCodeId(code);

    breakpoints = lines.map((line: number, id: number) => {
      return {
        id,
        line,
        verified: true,
        source: {
          path
        }
      };
    });

    const model = service.model as DebuggerModel;
    const currentFrameChanged = signalToPromise(
      model.callstack.currentFrameChanged
    );

    await act(async () => {
      await service.updateBreakpoints(code, breakpoints);
      connection!.kernel!.requestExecute({ code });
      await currentFrameChanged;
    });
  });

  afterAll(async () => {
    await connection.shutdown();
    connection.dispose();
    session.dispose();
    sidebar.dispose();
  });

  describe('#constructor()', () => {
    it('should create a new debugger sidebar', () => {
      expect(sidebar).toBeInstanceOf(Debugger.Sidebar);
    });
  });

  describe('#callstack', () => {
    it('should have a header and a body', () => {
      expect(sidebar.callstack.widgets.length).toEqual(2);
    });

    it('should have the jp-DebuggerCallstack class', () => {
      expect(sidebar.callstack.hasClass('jp-DebuggerCallstack')).toBe(true);
    });

    it('should have the debug buttons', () => {
      const node = sidebar.callstack.node;
      const items = node.querySelectorAll('button');

      expect(items.length).toEqual(5);
      items.forEach(item => {
        expect(Array.from(items[0].classList)).toEqual(
          expect.arrayContaining(['jp-ToolbarButtonComponent'])
        );
      });
    });

    it('should display the stack frames', () => {
      const node = sidebar.callstack.node;
      const items = node.querySelectorAll('.jp-DebuggerCallstack-body li');

      expect(items).toHaveLength(1);
      expect(items[0].innerHTML).toContain('module');
      expect(items[0].innerHTML).toContain('3'); // line for the first breakpoint
    });
  });

  describe('#breakpoints', () => {
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
        // TODO: replace by toEqual when there is an alternative to the rtl
        // breakpoint display
        expect(item.innerHTML).toContain(path.slice(1));
      });
    });

    it('should contain the line number', async () => {
      const node = sidebar.breakpoints.node;
      const items = node.querySelectorAll('.jp-DebuggerBreakpoint-line');

      await act(() => service.updateBreakpoints(code, breakpoints));

      items.forEach((item, i) => {
        const parsed = parseInt(item.innerHTML, 10);
        expect(parsed).toEqual(lines[i]);
      });
    });

    it('should be updated when new breakpoints are added', async () => {
      const node = sidebar.breakpoints.node;
      let items = node.querySelectorAll('.jp-DebuggerBreakpoint');
      const len1 = items.length;

      const bps = breakpoints.concat([
        {
          id: 3,
          line: 4,
          verified: true,
          source: {
            path
          }
        }
      ]);

      await act(() => service.updateBreakpoints(code, bps));

      items = node.querySelectorAll('.jp-DebuggerBreakpoint');
      const len2 = items.length;

      expect(len2).toEqual(len1 + 1);
    });
  });

  describe('#sources', () => {
    it('should have a header and a body', () => {
      expect(sidebar.sources.widgets.length).toEqual(2);
    });

    it('should display the source path in the header', () => {
      const body = sidebar.sources.widgets[0] as SourcesHeader;
      const children = toArray(body.children());
      const sourcePath = children[2].node.querySelector('span');
      expect(sourcePath!.innerHTML).toEqual(path);
    });

    it('should display the source code in the body', () => {
      const body = sidebar.sources.widgets[1] as SourcesBody;
      const children = toArray(body.children());
      const editor = children[0] as CodeEditorWrapper;
      expect(editor.model.value.text).toEqual(code);
    });
  });
});
