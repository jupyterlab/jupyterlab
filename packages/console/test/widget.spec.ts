// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { SessionContext } from '@jupyterlab/apputils';
import { createSessionContext } from '@jupyterlab/apputils/lib/testutils';
import {
  CodeCell,
  CodeCellModel,
  RawCell,
  RawCellModel
} from '@jupyterlab/cells';
import { createStandaloneCell, YCodeCell } from '@jupyter/ydoc';
import { NBTestUtils } from '@jupyterlab/cells/lib/testutils';
import { CodeConsole } from '@jupyterlab/console';
import { Message, MessageLoop } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import {
  createConsoleFactory,
  editorFactory,
  mimeTypeService,
  rendermime
} from './utils';

class TestConsole extends CodeConsole {
  methods: string[] = [];

  protected newPromptCell(): void {
    this.methods.push('newPromptCell');
    super.newPromptCell();
  }

  protected onActivateRequest(msg: Message): void {
    this.methods.push('onActivateRequest');
    super.onActivateRequest(msg);
  }

  protected onAfterAttach(msg: Message): void {
    this.methods.push('onAfterAttach');
    super.onAfterAttach(msg);
  }

  protected onUpdateRequest(msg: Message): void {
    this.methods.push('onUpdateRequest');
    super.onUpdateRequest(msg);
  }
}

const contentFactory = createConsoleFactory();

describe('console/widget', () => {
  describe('CodeConsole', () => {
    let widget: TestConsole;

    beforeEach(async () => {
      const sessionContext = await createSessionContext();
      widget = new TestConsole({
        contentFactory,
        rendermime,
        sessionContext,
        mimeTypeService
      });
    });

    afterEach(async () => {
      await widget.sessionContext.shutdown();
      widget.sessionContext.dispose();
      widget.dispose();
    });

    describe('#constructor()', () => {
      it('should create a new console content widget', () => {
        Widget.attach(widget, document.body);
        expect(widget).toBeInstanceOf(CodeConsole);
        expect(Array.from(widget.node.classList)).toEqual(
          expect.arrayContaining(['jp-CodeConsole'])
        );
      });
    });

    describe('#cells', () => {
      it('should exist upon instantiation', () => {
        expect(widget.cells).toBeTruthy();
      });

      it('should reflect the contents of the widget', async () => {
        const force = true;
        Widget.attach(widget, document.body);
        await (widget.sessionContext as SessionContext).initialize();
        await widget.execute(force);
        expect(widget.cells.length).toBe(1);
        widget.clear();
        expect(widget.cells.length).toBe(0);
      });
    });

    describe('#executed', () => {
      it('should emit a date upon execution', async () => {
        let called: Date | null = null;
        const force = true;
        Widget.attach(widget, document.body);
        widget.executed.connect((sender, time) => {
          called = time;
        });
        await (widget.sessionContext as SessionContext).initialize();
        await widget.execute(force);
        expect(called).toBeInstanceOf(Date);
      });
    });

    describe('#promptCell', () => {
      it('should be a code cell widget', () => {
        Widget.attach(widget, document.body);
        expect(widget.promptCell).toBeInstanceOf(CodeCell);
      });

      it('should be replaced after execution', async () => {
        const force = true;
        Widget.attach(widget, document.body);

        const old = widget.promptCell;
        expect(old).toBeInstanceOf(CodeCell);

        await (widget.sessionContext as SessionContext).initialize();
        await widget.execute(force);
        expect(widget.promptCell).toBeInstanceOf(CodeCell);
        expect(widget.promptCell).not.toBe(old);
      });
    });

    describe('#session', () => {
      it('should be a client session object', () => {
        expect(widget.sessionContext.sessionChanged).toBeTruthy();
      });
    });

    describe('#contentFactory', () => {
      it('should be the content factory used by the widget', () => {
        expect(widget.contentFactory).toBeInstanceOf(
          CodeConsole.ContentFactory
        );
      });
    });

    describe('#addCell()', () => {
      it('should add a code cell to the content widget', () => {
        const contentFactory = NBTestUtils.createCodeCellFactory();
        const model = new CodeCellModel();
        const cell = new CodeCell({
          model,
          contentFactory,
          rendermime
        }).initializeState();
        Widget.attach(widget, document.body);
        expect(widget.cells.length).toBe(0);
        widget.addCell(cell);
        expect(widget.cells.length).toBe(1);
      });
    });

    describe('#clear()', () => {
      it('should clear all of the content cells except the banner', async () => {
        const force = true;
        Widget.attach(widget, document.body);
        await (widget.sessionContext as SessionContext).initialize();
        await widget.execute(force);
        expect(widget.cells.length).toBeGreaterThan(0);
        widget.clear();
        expect(widget.cells.length).toBe(0);
        expect(widget.promptCell!.model.sharedModel.getSource()).toBe('');
      });
    });

    describe('#dispose()', () => {
      it('should dispose the content widget', () => {
        Widget.attach(widget, document.body);
        expect(widget.isDisposed).toBe(false);
        widget.dispose();
        expect(widget.isDisposed).toBe(true);
      });

      it('should be safe to dispose multiple times', () => {
        Widget.attach(widget, document.body);
        expect(widget.isDisposed).toBe(false);
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).toBe(true);
      });
    });

    describe('#execute()', () => {
      it('should execute contents of the prompt if forced', async () => {
        const force = true;
        Widget.attach(widget, document.body);
        expect(widget.cells.length).toBe(0);
        await (widget.sessionContext as SessionContext).initialize();
        await widget.execute(force);
        expect(widget.cells.length).toBeGreaterThan(0);
      });

      it('should check if code is multiline and allow amending', async () => {
        const force = false;
        const timeout = 9000;
        Widget.attach(widget, document.body);
        widget.promptCell!.model.sharedModel.setSource('for x in range(5):');
        expect(widget.cells.length).toBe(0);
        const session = widget.sessionContext as SessionContext;
        session.kernelPreference = { name: 'ipython' };
        await session.initialize();
        await widget.execute(force, timeout);
        expect(widget.cells.length).toBe(0);
      });
    });

    describe('#inject()', () => {
      it('should add a code cell and execute it', async () => {
        const code = 'print("#inject()")';
        Widget.attach(widget, document.body);
        expect(widget.cells.length).toBe(0);
        await widget.inject(code);
        expect(widget.cells.length).toBeGreaterThan(0);
      });
    });

    describe('#insertLinebreak()', () => {
      it('should insert a line break into the prompt', () => {
        Widget.attach(widget, document.body);

        const model = widget.promptCell!.model;
        expect(model.sharedModel.getSource()).toHaveLength(0);
        widget.insertLinebreak();
        expect(model.sharedModel.getSource()).toBe('\n');
      });
    });

    describe('#serialize()', () => {
      it('should serialize the contents of a console', () => {
        Widget.attach(widget, document.body);
        widget.promptCell!.model.sharedModel.setSource('foo');

        const serialized = widget.serialize();
        expect(serialized).toHaveLength(1);
        expect(serialized[0].source).toBe('foo');
      });
    });

    describe('#newPromptCell()', () => {
      it('should be called after attach, creating a prompt', () => {
        expect(widget.promptCell).toBeFalsy();
        expect(widget.methods).toEqual(
          expect.not.arrayContaining(['newPromptCell'])
        );
        Widget.attach(widget, document.body);
        expect(widget.methods).toEqual(
          expect.arrayContaining(['newPromptCell'])
        );
        expect(widget.promptCell).toBeTruthy();
      });

      it('should be called after execution, creating a prompt', async () => {
        expect(widget.promptCell).toBeFalsy();
        expect(widget.methods).toEqual(
          expect.not.arrayContaining(['newPromptCell'])
        );
        Widget.attach(widget, document.body);
        expect(widget.methods).toEqual(
          expect.arrayContaining(['newPromptCell'])
        );

        const old = widget.promptCell;
        const force = true;
        expect(old).toBeInstanceOf(CodeCell);
        widget.methods = [];

        await (widget.sessionContext as SessionContext).initialize();
        await widget.execute(force);

        expect(widget.promptCell).toBeInstanceOf(CodeCell);
        expect(widget.promptCell).not.toBe(old);
        expect(widget.methods).toEqual(
          expect.arrayContaining(['newPromptCell'])
        );
      });

      it('should make previous cell read-only after execution', async () => {
        Widget.attach(widget, document.body);

        const old = widget.promptCell;
        const force = true;
        expect(old).toBeInstanceOf(CodeCell);

        await (widget.sessionContext as SessionContext).initialize();
        await widget.execute(force);

        expect(old!.editor!.getOption('readOnly')).toBe(true);
      });
    });

    describe('#onActivateRequest()', () => {
      it('should focus the prompt editor', () => {
        expect(widget.promptCell).toBeFalsy();
        expect(widget.methods).toEqual(
          expect.not.arrayContaining(['onActivateRequest'])
        );
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.ActivateRequest);
        expect(widget.methods).toEqual(
          expect.arrayContaining(['onActivateRequest'])
        );
        expect(widget.promptCell!.editor!.hasFocus()).toBe(true);
      });
    });

    describe('#onAfterAttach()', () => {
      it('should be called after attach, creating a prompt', () => {
        expect(widget.promptCell).toBeFalsy();
        expect(widget.methods).toEqual(
          expect.not.arrayContaining(['onAfterAttach'])
        );
        Widget.attach(widget, document.body);
        expect(widget.methods).toEqual(
          expect.arrayContaining(['onAfterAttach'])
        );
        expect(widget.promptCell).toBeTruthy();
      });
    });

    describe('#setConfig()', () => {
      it('should clear cells on execute when clearCellsOnExecute is true', async () => {
        Widget.attach(widget, document.body);
        await widget.sessionContext.initialize();

        // First execute with default config (clearCellsOnExecute: false)
        await widget.execute(true);
        await widget.execute(true);
        await widget.execute(true);
        expect(widget.cells.length).toBe(3);

        // Set config to clear cells
        widget.setConfig({ clearCellsOnExecute: true });
        await widget.execute(true);
        expect(widget.cells.length).toBe(1);
      });

      it('should clear code content on execute when clearCodeContentOnExecute is true', async () => {
        Widget.attach(widget, document.body);
        await widget.sessionContext.initialize();

        // First execute with default config (clearCodeContentOnExecute: true)
        widget.promptCell!.model.sharedModel.setSource('1 + 1');
        await widget.execute(true);
        expect(widget.promptCell!.model.sharedModel.getSource()).toBe('');

        // Set config to not clear code content
        widget.setConfig({ clearCodeContentOnExecute: false });
        const testCode = '1 + 1';
        widget.promptCell!.model.sharedModel.setSource(testCode);
        await widget.execute(true);
        expect(widget.promptCell!.model.sharedModel.getSource()).toBe(testCode);
      });

      it('should hide code input when hideCodeInput is true', async () => {
        Widget.attach(widget, document.body);
        await widget.sessionContext.initialize();

        // Set config to hide input
        widget.setConfig({ hideCodeInput: true });

        // Execute some code
        const cell = widget.promptCell!;
        const testCode = 'print(1 + 1)';
        cell.model.sharedModel.setSource(testCode);
        await widget.execute(true);

        // Check the input is not visible in the executed cells
        for (const cell of widget.cells) {
          expect(cell.inputArea!.node.classList.contains('lm-mod-hidden')).toBe(
            true
          );
        }
      });

      it('should show/hide banner based on showBanner config', async () => {
        Widget.attach(widget, document.body);

        // Default config (showBanner: true)
        await widget.sessionContext.restartKernel();
        const banner = widget.node.querySelector('.jp-CodeConsole-banner');
        expect(banner).toBeTruthy();

        // Set config to hide banner
        widget.setConfig({ showBanner: false });
        await widget.sessionContext.restartKernel();
        const hiddenBanner = widget.node.querySelector(
          '.jp-CodeConsole-banner'
        );
        expect(hiddenBanner).toBeFalsy();
      });
    });

    describe('.ContentFactory', () => {
      describe('#constructor', () => {
        it('should create a new ContentFactory', () => {
          const factory = new CodeConsole.ContentFactory({ editorFactory });
          expect(factory).toBeInstanceOf(CodeConsole.ContentFactory);
        });
      });

      describe('#createCodeCell', () => {
        it('should create a code cell', () => {
          const model = new CodeCellModel();
          const prompt = contentFactory.createCodeCell({
            rendermime: widget.rendermime,
            model,
            contentFactory
          });
          expect(prompt).toBeInstanceOf(CodeCell);
        });
      });

      describe('#createRawCell', () => {
        it('should create a foreign cell', () => {
          const model = new RawCellModel();
          const prompt = contentFactory.createRawCell({
            model,
            contentFactory
          });
          expect(prompt).toBeInstanceOf(RawCell);
        });
      });
    });

    describe('.ModelFactory', () => {
      describe('#constructor()', () => {
        it('should create a new model factory', () => {
          const factory = new CodeConsole.ModelFactory({});
          expect(factory).toBeInstanceOf(CodeConsole.ModelFactory);
        });

        it('should accept a codeCellContentFactory', () => {
          const codeCellContentFactory = new CodeCellModel.ContentFactory();
          const factory = new CodeConsole.ModelFactory({
            codeCellContentFactory
          });
          expect(factory.codeCellContentFactory).toBe(codeCellContentFactory);
        });
      });

      describe('#codeCellContentFactory', () => {
        it('should be the code cell content factory used by the factory', () => {
          const factory = new CodeConsole.ModelFactory({});
          expect(factory.codeCellContentFactory).toBe(
            CodeCellModel.defaultContentFactory
          );
        });
      });

      describe('#createCodeCell()', () => {
        it('should create a code cell', () => {
          const factory = new CodeConsole.ModelFactory({});
          expect(
            factory.createCodeCell({
              sharedModel: createStandaloneCell({
                cell_type: 'code'
              }) as YCodeCell
            })
          ).toBeInstanceOf(CodeCellModel);
        });
      });

      describe('#createRawCell()', () => {
        it('should create a raw cell model', () => {
          const factory = new CodeConsole.ModelFactory({});
          expect(factory.createRawCell({})).toBeInstanceOf(RawCellModel);
        });
      });
    });

    describe('.defaultModelFactory', () => {
      it('should be a ModelFactory', () => {
        expect(CodeConsole.defaultModelFactory).toBeInstanceOf(
          CodeConsole.ModelFactory
        );
      });
    });
  });
});
