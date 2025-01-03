// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { act } from 'react-dom/test-utils';

import { Button } from '@jupyter/web-components';

import { CodeEditorWrapper } from '@jupyterlab/codeeditor';

import {
  CodeMirrorEditorFactory,
  CodeMirrorMimeTypeService,
  EditorExtensionRegistry,
  EditorLanguageRegistry,
  ybinding
} from '@jupyterlab/codemirror';

import { KernelSpecManager, Session } from '@jupyterlab/services';

import { createSession } from '@jupyterlab/docregistry/lib/testutils';

import { JupyterServer, signalToPromise } from '@jupyterlab/testing';

import { CommandRegistry } from '@lumino/commands';

import { UUID } from '@lumino/coreutils';

import { MessageLoop } from '@lumino/messaging';

import { Widget } from '@lumino/widgets';

import { Debugger } from '../src/debugger';

import { DebuggerService } from '../src/service';

import { DebuggerModel } from '../src/model';

import { SourcesBody } from '../src/panels/sources/body';

import { IYText } from '@jupyter/ydoc';
import { IDebugger } from '../src/tokens';

const server = new JupyterServer();

const emptyFn = () => undefined;

beforeAll(async () => {
  await server.start();
}, 30000);

afterAll(async () => {
  await server.shutdown();
});

describe('Debugger', () => {
  const specsManager = new KernelSpecManager();
  const config = new Debugger.Config();
  const service = new DebuggerService({ specsManager, config });
  const registry = new CommandRegistry();
  const languages = new EditorLanguageRegistry();
  const callstackToolbarCommands = {
    continue: 'continue',
    terminate: 'terminate',
    next: 'next',
    stepIn: 'stepIn',
    stepOut: 'stepOut',
    evaluate: 'evaluate'
  };
  EditorLanguageRegistry.getDefaultLanguages()
    .filter(lang => ['Python'].includes(lang.name))
    .forEach(lang => {
      languages.addLanguage(lang);
    });
  const extensions = new EditorExtensionRegistry();
  EditorExtensionRegistry.getDefaultExtensions()
    .filter(ext => ['lineNumbers'].includes(ext.name))
    .forEach(ext => extensions.addExtension(ext));
  extensions.addExtension({
    name: 'binding',
    factory: ({ model }) => {
      const m = model.sharedModel as IYText;
      return EditorExtensionRegistry.createImmutableExtension(
        ybinding({ ytext: m.ysource, undoManager: m.undoManager ?? undefined })
      );
    }
  });
  const factoryService = new CodeMirrorEditorFactory({ extensions, languages });
  const mimeTypeService = new CodeMirrorMimeTypeService(languages);
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
  let sidebar: Debugger.Sidebar;

  beforeAll(async () => {
    connection = await createSession({
      name: '',
      type: 'test',
      path: UUID.uuid4()
    });
    await connection.changeKernel({ name: 'python3' });

    session = new Debugger.Session({ connection, config });
    service.session = session;

    // Populate the command registry with fake command to render the button.
    Object.keys(callstackToolbarCommands).forEach(command => {
      registry.addCommand(command, { execute: emptyFn });
    });

    sidebar = new Debugger.Sidebar({
      service,
      callstackCommands: {
        registry,
        ...callstackToolbarCommands
      },
      breakpointsCommands: {
        registry,
        pauseOnExceptions: ''
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

  describe('Panel', () => {
    let toolbarList: any;
    beforeEach(() => {
      toolbarList = sidebar.content.node.querySelectorAll(
        '.jp-AccordionPanel-title'
      );
    });
    it('should have 5 child widgets', () => {
      expect(sidebar.widgets.length).toBe(5);
    });

    it('should have 5 toolbars', () => {
      expect(toolbarList.length).toBe(5);
    });
    describe('Variable toolbar', () => {
      let toolbar: Element;
      beforeEach(() => {
        toolbar = toolbarList.item(0);
      });
      it('should have expanding icon', () => {
        const title = toolbar.querySelectorAll(
          '.lm-AccordionPanel-titleCollapser'
        );
        expect(title[0].innerHTML).toContain('ui-components:caret-down');
      });
      it('should have title', () => {
        const title = toolbar.querySelectorAll(
          'span.lm-AccordionPanel-titleLabel'
        );
        expect(title.length).toBe(1);
        expect(title[0].innerHTML).toContain('Variables');
      });
      it('should have two buttons', () => {
        const buttons = toolbar.querySelectorAll('jp-button');
        expect(buttons.length).toBe(2);
        expect((buttons[0] as Button).title).toBe('Tree View');
        expect((buttons[1] as Button).title).toBe('Table View');
      });
    });
    describe('Callstack toolbar', () => {
      let toolbar: Element;
      beforeEach(() => {
        toolbar = toolbarList.item(1);
      });
      it('should have expanding icon', () => {
        const title = toolbar.querySelectorAll(
          '.lm-AccordionPanel-titleCollapser'
        );
        expect(title[0].innerHTML).toContain('ui-components:caret-down');
      });
      it('should have title', () => {
        const title = toolbar.querySelectorAll(
          'span.lm-AccordionPanel-titleLabel'
        );
        expect(title.length).toBe(1);
        expect(title[0].innerHTML).toContain('Callstack');
      });
      it('should have six buttons', () => {
        const buttons = toolbar.querySelectorAll('jp-button');
        expect(buttons.length).toBe(6);
      });
    });
    describe('Breakpoints toolbar', () => {
      let toolbar: Element;
      beforeEach(() => {
        toolbar = toolbarList.item(2);
      });
      it('should have expanding icon', () => {
        const title = toolbar.querySelectorAll(
          '.lm-AccordionPanel-titleCollapser'
        );
        expect(title[0].innerHTML).toContain('ui-components:caret-down');
      });
      it('should have title', () => {
        const title = toolbar.querySelectorAll(
          'span.lm-AccordionPanel-titleLabel'
        );
        expect(title.length).toBe(1);
        expect(title[0].innerHTML).toContain('Breakpoints');
      });
      it('should have two buttons', () => {
        const buttons = toolbar.querySelectorAll('jp-button');
        expect(buttons.length).toBe(2);
      });
    });
    describe('Source toolbar', () => {
      let toolbar: Element;
      beforeEach(() => {
        toolbar = toolbarList.item(3);
      });
      it('should have expanding icon', () => {
        const title = toolbar.querySelectorAll(
          '.lm-AccordionPanel-titleCollapser'
        );
        expect(title[0].innerHTML).toContain('ui-components:caret-down');
      });
      it('should have title', () => {
        const title = toolbar.querySelectorAll(
          'span.lm-AccordionPanel-titleLabel'
        );
        expect(title.length).toBe(1);
        expect(title[0].innerHTML).toContain('Source');
      });

      it('should have one button', () => {
        const buttons = toolbar.querySelectorAll('jp-button');
        expect(buttons.length).toBe(1);
      });
    });
  });

  describe('#callstack', () => {
    it('should have a body', () => {
      expect(sidebar.callstack.widgets.length).toEqual(1);
    });

    it('should have the jp-DebuggerCallstack class', () => {
      expect(sidebar.callstack.hasClass('jp-DebuggerCallstack')).toBe(true);
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

    it('should contain the path after a restore', async () => {
      await service.restoreState(true);
      const node = sidebar.breakpoints.node;
      const items = node.querySelectorAll('.jp-DebuggerBreakpoint-source');
      items.forEach(item => {
        // TODO: replace by toEqual when there is an alternative to the rtl
        // breakpoint display
        expect(item.innerHTML).toContain(path.slice(1));
      });
    });
  });

  describe('#sources', () => {
    it('should have a body', () => {
      expect(sidebar.sources.widgets.length).toEqual(1);
    });

    it('should display the source path in the header', () => {
      const header = sidebar.sources.toolbar;
      const pathWidget = header.node.innerHTML;
      expect(pathWidget).toContain(path);
    });

    it('should display the source code in the body', () => {
      const body = sidebar.sources.widgets[0] as SourcesBody;
      const children = Array.from(body.children());
      const editor = children[0] as CodeEditorWrapper;
      expect(editor.model.sharedModel.getSource()).toEqual(code);
    });
  });
});
