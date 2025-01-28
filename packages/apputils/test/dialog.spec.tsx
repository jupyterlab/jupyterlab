// Copyright (c) Jupyter Development Team.

// Distributed under the terms of the Modified BSD License.

import { Dialog, ReactWidget, showDialog } from '@jupyterlab/apputils';
import {
  acceptDialog,
  dismissDialog,
  waitForDialog
} from '@jupyterlab/testing';
import { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import * as React from 'react';
import { generate, simulate } from 'simulate-event';

class TestDialog extends Dialog<any> {
  methods: string[] = [];
  events: string[] = [];

  handleEvent(event: Event): void {
    super.handleEvent(event);
    this.events.push(event.type);
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.methods.push('onAfterAttach');
  }

  protected onAfterDetach(msg: Message): void {
    super.onAfterDetach(msg);
    this.methods.push('onAfterDetach');
  }

  protected onCloseRequest(msg: Message): void {
    super.onCloseRequest(msg);
    this.methods.push('onCloseRequest');
  }
}

class ValueWidget extends Widget {
  getValue(): string {
    return 'foo';
  }
}

describe('@jupyterlab/apputils', () => {
  describe('Dialog', () => {
    let dialog: TestDialog;

    beforeEach(() => {
      dialog = new TestDialog();
    });

    afterEach(() => {
      dialog.dispose();
    });

    describe('#constructor()', () => {
      it('should create a new dialog', () => {
        expect(dialog).toBeInstanceOf(Dialog);
      });

      it('should accept options', () => {
        const dialog = new TestDialog({
          title: 'foo',
          body: 'Hello',
          buttons: [Dialog.okButton()],
          hasClose: false
        });

        expect(dialog).toBeInstanceOf(Dialog);
      });
    });

    describe('#launch()', () => {
      it.skip('should attach the dialog to the host', async () => {
        const host = document.createElement('div');
        const dialog = new TestDialog({ host });

        document.body.appendChild(host);
        void dialog.launch();
        await waitForDialog(host);
        expect(host.contains(dialog.node)).toBe(true);
        dialog.dispose();
        document.body.removeChild(host);
      });

      it('should resolve with `true` when accepted', async () => {
        const prompt = dialog.launch();

        await waitForDialog();
        dialog.resolve();
        expect((await prompt).button.accept).toBe(true);
      });

      it('should resolve with `false` when rejected', async () => {
        const prompt = dialog.launch();

        await waitForDialog();
        dialog.reject();
        expect((await prompt).button.accept).toBe(false);
      });

      it('should resolve with `false` when closed', async () => {
        const prompt = dialog.launch();

        await waitForDialog();
        dialog.close();
        expect((await prompt).button.accept).toBe(false);
      });

      it('should return focus to the original focused element', async () => {
        const input = document.createElement('input');

        document.body.appendChild(input);
        input.focus();
        expect(document.activeElement).toBe(input);

        const prompt = dialog.launch();

        await waitForDialog();
        expect(document.activeElement).not.toBe(input);
        dialog.resolve();
        await prompt;
        expect(document.activeElement).toBe(input);
        document.body.removeChild(input);
      });
    });

    describe('#resolve()', () => {
      it('should resolve with the default item', async () => {
        const prompt = dialog.launch();

        await waitForDialog();
        dialog.resolve();
        expect((await prompt).button.accept).toBe(true);
      });

      it('should resolve with the item at the given index', async () => {
        const prompt = dialog.launch();

        await waitForDialog();
        dialog.resolve(0);
        expect((await prompt).button.accept).toBe(false);
      });
    });

    describe('#reject()', () => {
      it('should reject with the default reject item', async () => {
        const prompt = dialog.launch();

        await waitForDialog();
        dialog.reject();

        const result = await prompt;

        expect(result.button.label).toBe('Cancel');
        expect(result.button.accept).toBe(false);
      });
    });

    describe('#handleEvent()', () => {
      describe('keydown', () => {
        it('should reject on escape key', async () => {
          const prompt = dialog.launch();

          await waitForDialog();
          simulate(dialog.node, 'keydown', { keyCode: 27 });
          expect((await prompt).button.accept).toBe(false);
        });

        it('should accept on enter key', async () => {
          const prompt = dialog.launch();

          await waitForDialog();
          simulate(dialog.node, 'keydown', { keyCode: 13 });
          expect((await prompt).button.accept).toBe(true);
        });

        it('should not accept on enter key within textarea', async () => {
          class CustomDialogBody
            extends ReactWidget
            implements Dialog.IBodyWidget<ReactWidget>
          {
            constructor() {
              super();
              this.addClass('jp-Dialog-body');
            }

            render(): JSX.Element {
              return (
                <div>
                  <textarea data-testid="dialog-textarea" />
                </div>
              );
            }

            getValue(): ReactWidget {
              return this;
            }
          }

          const body = new CustomDialogBody();
          const dialog = new Dialog({ body });
          const promptPromise = dialog.launch();

          await waitForDialog();

          const textarea = dialog.node.querySelector(
            '[data-testid="dialog-textarea"]'
          );
          expect(textarea).not.toBeNull();

          if (textarea) {
            (textarea as HTMLTextAreaElement).focus();
            simulate(textarea, 'keydown', { key: 'Enter', keyCode: 13 });
          }

          expect(dialog.isVisible).toBe(true);
          dialog.dispose();
          await promptPromise.catch(() => {});
        });

        it('should resolve with currently focused button', async () => {
          const dialog = new TestDialog({
            buttons: [
              Dialog.createButton({ label: 'first' }),
              Dialog.createButton({ label: 'second' }),
              Dialog.createButton({ label: 'third' }),
              Dialog.createButton({ label: 'fourth' })
            ],
            // focus on "first"
            defaultButton: 0
          });
          const prompt = dialog.launch();

          await waitForDialog();

          // press right arrow twice (focusing on "third")
          simulate(dialog.node, 'keydown', { keyCode: 39 });
          simulate(dialog.node, 'keydown', { keyCode: 39 });

          // press enter
          simulate(dialog.node, 'keydown', { keyCode: 13 });
          const promptResult = await prompt;
          expect(promptResult.button.label).toBe('third');
          dialog.dispose();
        });

        it('should cycle to the first button on a tab key', async () => {
          const prompt = dialog.launch();

          await waitForDialog();
          expect(document.activeElement!.className).toContain('jp-mod-accept');
          simulate(dialog.node, 'keydown', { keyCode: 9 });
          expect(document.activeElement!.className).toContain('jp-mod-reject');
          simulate(document.activeElement!, 'click');
          expect((await prompt).button.accept).toBe(false);
        });
      });

      describe('contextmenu', () => {
        it('should cancel context menu events', async () => {
          const prompt = dialog.launch();

          await waitForDialog();

          const canceled = !dialog.node.dispatchEvent(generate('contextmenu'));

          expect(canceled).toBe(true);
          simulate(dialog.node, 'keydown', { keyCode: 27 });
          expect((await prompt).button.accept).toBe(false);
        });
      });

      describe('click', () => {
        it('should prevent clicking outside of the content area', async () => {
          const prompt = dialog.launch();

          await waitForDialog();

          const canceled = !dialog.node.dispatchEvent(generate('click'));

          expect(canceled).toBe(true);
          dialog.resolve();
          await prompt;
        });

        it('should resolve a clicked button', async () => {
          const prompt = dialog.launch();

          await waitForDialog();
          simulate(dialog.node.querySelector('.jp-mod-reject')!, 'click');
          expect((await prompt).button.accept).toBe(false);
        });
      });

      describe('focus', () => {
        it('should focus the default button when focus leaves the dialog', async () => {
          const host = document.createElement('div');
          const target = document.createElement('div');
          target.tabIndex = 0; // Make the div element focusable
          const dialog = new TestDialog({ host });

          document.body.appendChild(target);
          document.body.appendChild(host);
          target.focus();
          expect(document.activeElement).toBe(target);

          const prompt = dialog.launch();

          await waitForDialog();
          simulate(target, 'focus');
          expect(document.activeElement).not.toBe(target);
          expect(document.activeElement!.className).toContain('jp-mod-accept');
          dialog.resolve();
          await prompt;
          dialog.dispose();
        });
      });
    });

    describe('#onAfterAttach()', () => {
      it('should attach event listeners', async () => {
        Widget.attach(dialog, document.body);
        await dialog.ready;
        expect(dialog.methods).toContain('onAfterAttach');
        ['keydown', 'contextmenu', 'click', 'focus'].forEach(event => {
          simulate(dialog.node, event);
          expect(dialog.events).toContain(event);
        });
      });

      it('should focus the default button', () => {
        Widget.attach(dialog, document.body);
        expect(document.activeElement!.className).toContain('jp-mod-accept');
      });

      it('should focus the primary element', async () => {
        const body = (
          <div>
            <input type={'text'} />
          </div>
        );

        const dialog = new TestDialog({ body, focusNodeSelector: 'input' });
        Widget.attach(dialog, document.body);
        await dialog.ready;
        expect(document.activeElement!.localName).toBe('input');
        dialog.dispose();
      });
    });

    describe('#onAfterDetach()', () => {
      it('should remove event listeners', () => {
        Widget.attach(dialog, document.body);
        Widget.detach(dialog);
        expect(dialog.methods).toContain('onAfterDetach');
        dialog.events = [];
        ['keydown', 'contextmenu', 'click', 'focus'].forEach(event => {
          simulate(dialog.node, event);
          expect(dialog.events).not.toContain(event);
        });
      });

      it('should return focus to the original focused element', () => {
        const input = document.createElement('input');

        document.body.appendChild(input);
        input.focus();
        Widget.attach(dialog, document.body);
        Widget.detach(dialog);
        expect(document.activeElement).toBe(input);
        document.body.removeChild(input);
      });
    });

    describe('#onCloseRequest()', () => {
      it('should reject an existing promise', async () => {
        const prompt = dialog.launch();

        await waitForDialog();
        dialog.close();
        expect((await prompt).button.accept).toBe(false);
      });
    });

    describe('.defaultRenderer', () => {
      it('should be an instance of a Renderer', () => {
        expect(Dialog.defaultRenderer).toBeInstanceOf(Dialog.Renderer);
      });
    });

    describe('.Renderer', () => {
      const renderer = Dialog.defaultRenderer;

      const checkbox: Dialog.ICheckbox = {
        label: 'foo',
        caption: 'hello',
        className: 'baz',
        checked: false
      };

      const data: Dialog.IButton = {
        ariaLabel: 'ariafoo',
        label: 'foo',
        iconClass: 'bar',
        iconLabel: 'foo',
        caption: 'hello',
        className: 'baz',
        accept: false,
        displayType: 'warn',
        actions: []
      };

      describe('#createHeader()', () => {
        it('should create the header of the dialog', () => {
          const widget = renderer.createHeader('foo');

          expect(widget.hasClass('jp-Dialog-header')).toBe(true);
        });
      });

      describe('#createBody()', () => {
        it('should create the body from a string', () => {
          const widget = renderer.createBody('foo');

          expect(widget.hasClass('jp-Dialog-body')).toBe(true);
          expect(widget.node.firstChild!.textContent).toBe('foo');
        });

        it('should create the body from a virtual node', async () => {
          const vnode = (
            <div>
              <input type={'text'} />
              <select>
                <option value={'foo'}>foo</option>
              </select>
              <button />
            </div>
          );
          const widget = renderer.createBody(vnode);
          Widget.attach(widget, document.body);
          await (widget as ReactWidget).renderPromise;

          const button = widget.node.querySelector('button')!;
          const input = widget.node.querySelector('input')!;
          const select = widget.node.querySelector('select')!;

          expect(button.className).toContain('jp-mod-styled');
          expect(input.className).toContain('jp-mod-styled');
          expect(select.className).toContain('jp-mod-styled');
          widget.dispose();
        });

        it('should create the body from a widget', () => {
          const body = new Widget();

          renderer.createBody(body);
          expect(body.hasClass('jp-Dialog-body')).toBe(true);
        });
      });

      describe('#createFooter()', () => {
        it('should create the footer of the dialog', () => {
          const buttons = [Dialog.okButton, { label: 'foo' }];
          const nodes = buttons.map(button => {
            return renderer.createButtonNode(button as Dialog.IButton);
          });
          const footer = renderer.createFooter(nodes, null);
          const buttonNodes = footer.node.querySelectorAll('button');

          expect(footer.hasClass('jp-Dialog-footer')).toBe(true);
          expect(footer.node.contains(nodes[0])).toBe(true);
          expect(footer.node.contains(nodes[1])).toBe(true);
          expect(buttonNodes.length).toBeGreaterThan(0);
          for (const node of buttonNodes) {
            expect(node.className).toContain('jp-mod-styled');
          }
        });

        it('should create the footer of the dialog with checkbox', () => {
          const buttons = [Dialog.okButton, { label: 'foo' }];
          const nodes = buttons.map((button: Dialog.IButton) => {
            return renderer.createButtonNode(button);
          });
          const cboxNode = renderer.createCheckboxNode(checkbox);
          const footer = renderer.createFooter(nodes, cboxNode);
          expect(footer.node.contains(cboxNode)).toBe(true);
        });
      });

      describe('#createButtonNode()', () => {
        it('should create a button node for the dialog', () => {
          const node = renderer.createButtonNode(data);
          expect(node.className).toContain('jp-Dialog-button');
          expect(node.querySelector('.jp-Dialog-buttonIcon')).toBeTruthy();
          expect(node.querySelector('.jp-Dialog-buttonLabel')).toBeTruthy();
        });
      });

      describe('#createCheckboxNode()', () => {
        it('should create a checkbox node for the dialog', () => {
          const node = renderer.createCheckboxNode(checkbox);
          expect(node.className).toContain('jp-Dialog-checkbox');
          expect(node.tagName).toEqual('LABEL');
          expect(node.querySelector('input')?.type).toEqual('checkbox');
        });
      });

      describe('#renderIcon()', () => {
        it('should render an icon element for a dialog item', () => {
          const node = renderer.renderIcon(data);
          expect(node.className).toContain('jp-Dialog-buttonIcon');
          expect(node.textContent).toBe('foo');
        });
      });

      describe('#createItemClass()', () => {
        it('should create the class name for the button', () => {
          const value = renderer.createItemClass(data);
          expect(value).toContain('jp-Dialog-button');
          expect(value).toContain('jp-mod-reject');
          expect(value).toContain(data.className);
        });
      });

      describe('#createIconClass()', () => {
        it('should create the class name for the button icon', () => {
          const value = renderer.createIconClass(data);
          expect(value).toContain('jp-Dialog-buttonIcon');
          expect(value).toContain(data.iconClass);
        });
      });

      describe('#renderLabel()', () => {
        it('should render a label element for a button', () => {
          const node = renderer.renderLabel(data);
          expect(node.className).toBe('jp-Dialog-buttonLabel');
          expect(node.title).toBe(data.caption);
          expect(node.textContent).toBe(data.label);
        });
      });
    });
  });

  describe('showDialog()', () => {
    it('should accept zero arguments', async () => {
      const dialog = showDialog();

      await dismissDialog();
      expect((await dialog).button.accept).toBe(false);
    });

    it('should accept dialog options', async () => {
      const node = document.createElement('div');

      document.body.appendChild(node);

      const prompt = showDialog({
        title: 'foo',
        body: 'Hello',
        host: node,
        defaultButton: 0,
        buttons: [Dialog.cancelButton(), Dialog.okButton()]
      });

      await acceptDialog();

      const result = await prompt;

      expect(result.button.accept).toBe(false);
      expect(result.isChecked).toBe(null);
      expect(result.value).toBe(null);
      document.body.removeChild(node);
    });

    it('should accept a virtualdom body', async () => {
      const body = (
        <div>
          <input />
          <select />
        </div>
      );
      const prompt = showDialog({ body });

      await acceptDialog();

      const result = await prompt;

      expect(result.button.accept).toBe(true);
      expect(result.value).toBe(null);
    });

    it('should accept a widget body', async () => {
      const prompt = showDialog({ body: new Widget() });

      await acceptDialog();

      const result = await prompt;

      expect(result.button.accept).toBe(true);
      expect(result.value).toBe(null);
    });

    it('should give the value from the widget', async () => {
      const prompt = showDialog({ body: new ValueWidget() });

      await acceptDialog();

      const result = await prompt;

      expect(result.button.accept).toBe(true);
      expect(result.value).toBe('foo');
    });

    it('should not create a close button by default', async () => {
      const node = document.createElement('div');

      document.body.appendChild(node);

      const prompt = showDialog({
        title: 'foo',
        body: 'Hello',
        host: node,
        defaultButton: 0,
        buttons: [Dialog.cancelButton(), Dialog.okButton()]
      });

      await waitForDialog();

      expect(node.querySelector('.jp-Dialog-close-button')).toBeFalsy();

      await acceptDialog();

      const result = await prompt;

      expect(result.button.accept).toBe(false);
      expect(result.button.actions).toEqual([]);
      expect(result.value).toBe(null);

      document.body.removeChild(node);
    });

    it('should create a close button', async () => {
      const node = document.createElement('div');

      document.body.appendChild(node);

      const prompt = showDialog({
        title: 'foo',
        body: 'Hello',
        host: node,
        defaultButton: 0,
        buttons: [Dialog.cancelButton(), Dialog.okButton()],
        hasClose: true
      });

      await waitForDialog();

      expect(node.querySelector('.jp-Dialog-close-button')).toBeTruthy();

      await acceptDialog();

      const result = await prompt;

      expect(result.button.accept).toBe(false);
      expect(result.button.actions).toEqual([]);
      expect(result.value).toBe(null);

      document.body.removeChild(node);
    });

    it('should accept the dialog reload options', async () => {
      const node = document.createElement('div');

      document.body.appendChild(node);

      const prompt = showDialog({
        title: 'foo',
        body: 'Hello',
        host: node,
        defaultButton: 0,
        buttons: [
          Dialog.cancelButton({ actions: ['reload'] }),
          Dialog.okButton()
        ],
        hasClose: true
      });

      await acceptDialog();

      const result = await prompt;

      expect(result.button.accept).toBe(false);
      expect(result.button.actions).toEqual(['reload']);
      expect(result.value).toBe(null);
      document.body.removeChild(node);
    });

    it('should accept checkbox options', async () => {
      const node = document.createElement('div');

      document.body.appendChild(node);

      const prompt = showDialog({
        title: 'foo',
        body: 'Hello',
        host: node,
        defaultButton: 0,
        buttons: [Dialog.cancelButton(), Dialog.okButton()],
        checkbox: {
          label: 'foo',
          caption: 'bar',
          className: 'baz'
        }
      });

      await acceptDialog();

      const result = await prompt;

      expect(result.button.accept).toBe(false);
      expect(result.isChecked).toBe(false);
      expect(result.value).toBe(null);
      document.body.removeChild(node);
    });

    it('should accept checkbox checked state', async () => {
      const node = document.createElement('div');

      document.body.appendChild(node);

      const prompt = showDialog({
        title: 'foo',
        body: 'Hello',
        host: node,
        defaultButton: 0,
        buttons: [Dialog.cancelButton(), Dialog.okButton()],
        checkbox: {
          label: 'foo',
          caption: 'bar',
          className: 'baz',
          checked: true
        }
      });

      await acceptDialog();

      const result = await prompt;

      expect(result.button.accept).toBe(false);
      expect(result.isChecked).toBe(true);
      expect(result.value).toBe(null);
      document.body.removeChild(node);
    });

    it('should return the checkbox state', async () => {
      const node = document.createElement('div');

      document.body.appendChild(node);

      const prompt = showDialog({
        title: 'foo',
        body: 'Hello',
        host: node,
        defaultButton: 0,
        buttons: [Dialog.cancelButton(), Dialog.okButton()],
        checkbox: {
          label: 'foo',
          caption: 'bar',
          className: 'baz'
        }
      });

      await waitForDialog();

      node.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();

      await acceptDialog();

      const result = await prompt;

      expect(result.button.accept).toBe(false);
      expect(result.isChecked).toBe(true);
      expect(result.value).toBe(null);
      document.body.removeChild(node);
    });
  });
});
