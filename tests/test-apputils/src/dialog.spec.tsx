// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { Dialog, showDialog } from '@jupyterlab/apputils';

import { each, map, toArray } from '@phosphor/algorithm';

import { Message } from '@phosphor/messaging';

import { Widget } from '@phosphor/widgets';

import { generate, simulate } from 'simulate-event';

import * as React from 'react';

import { acceptDialog, dismissDialog, waitForDialog } from '../../utils';

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
        expect(dialog).to.be.an.instanceof(Dialog);
      });

      it('should accept options', () => {
        const dialog = new TestDialog({
          title: 'foo',
          body: 'Hello',
          buttons: [Dialog.okButton()]
        });

        expect(dialog).to.be.an.instanceof(Dialog);
        dialog.dispose();
      });
    });

    describe('#launch()', () => {
      it('should attach the dialog to the host', async () => {
        const host = document.createElement('div');
        const dialog = new TestDialog({ host });

        document.body.appendChild(host);
        dialog.launch();
        await waitForDialog();
        expect(host.firstChild).to.equal(dialog.node);
        dialog.dispose();
        document.body.removeChild(host);
      });

      it('should resolve with `true` when accepted', async () => {
        const prompt = dialog.launch();

        await waitForDialog();
        dialog.resolve();
        expect((await prompt).button.accept).to.equal(true);
      });

      it('should resolve with `false` when accepted', async () => {
        const prompt = dialog.launch();

        await waitForDialog();
        dialog.reject();
        expect((await prompt).button.accept).to.equal(false);
      });

      it('should resolve with `false` when closed', async () => {
        const prompt = dialog.launch();

        await waitForDialog();
        dialog.close();
        expect((await prompt).button.accept).to.equal(false);
      });

      it('should return focus to the original focused element', async () => {
        const input = document.createElement('input');

        document.body.appendChild(input);
        input.focus();
        expect(document.activeElement).to.equal(input);

        const prompt = dialog.launch();

        await waitForDialog();
        expect(document.activeElement).to.not.equal(input);
        dialog.resolve();
        await prompt;
        expect(document.activeElement).to.equal(input);
        document.body.removeChild(input);
      });
    });

    describe('#resolve()', () => {
      it('should resolve with the default item', async () => {
        const prompt = dialog.launch();

        await waitForDialog();
        dialog.resolve();
        expect((await prompt).button.accept).to.equal(true);
      });

      it('should resolve with the item at the given index', async () => {
        const prompt = dialog.launch();

        await waitForDialog();
        dialog.resolve(0);
        expect((await prompt).button.accept).to.equal(false);
      });
    });

    describe('#reject()', () => {
      it('should reject with the default reject item', async () => {
        const prompt = dialog.launch();

        await waitForDialog();
        dialog.reject();

        const result = await prompt;

        expect(result.button.label).to.equal('CANCEL');
        expect(result.button.accept).to.equal(false);
      });
    });

    describe('#handleEvent()', () => {
      context('keydown', () => {
        it('should reject on escape key', async () => {
          const prompt = dialog.launch();

          await waitForDialog();
          simulate(dialog.node, 'keydown', { keyCode: 27 });
          expect((await prompt).button.accept).to.equal(false);
        });

        it('should accept on enter key', async () => {
          const prompt = dialog.launch();

          await waitForDialog();
          simulate(dialog.node, 'keydown', { keyCode: 13 });
          expect((await prompt).button.accept).to.equal(true);
        });

        it('should cycle to the first button on a tab key', async () => {
          const prompt = dialog.launch();

          await waitForDialog();
          expect(document.activeElement.className).to.contain('jp-mod-accept');
          simulate(dialog.node, 'keydown', { keyCode: 9 });
          expect(document.activeElement.className).to.contain('jp-mod-reject');
          simulate(document.activeElement, 'click');
          expect((await prompt).button.accept).to.equal(false);
        });
      });

      context('contextmenu', () => {
        it('should cancel context menu events', () => {
          let promise = dialog.launch().then(result => {
            expect(result.button.accept).to.equal(false);
          });
          waitForDialog().then(() => {
            let node = document.body.getElementsByClassName('jp-Dialog')[0];
            let evt = generate('contextmenu');
            let cancelled = !node.dispatchEvent(evt);
            expect(cancelled).to.equal(true);
            simulate(node as HTMLElement, 'keydown', { keyCode: 27 });
          });
          return promise;
        });
      });

      context('click', () => {
        it('should prevent clicking outside of the content area', () => {
          let promise = dialog.launch();
          waitForDialog().then(() => {
            let evt = generate('click');
            let cancelled = !dialog.node.dispatchEvent(evt);
            expect(cancelled).to.equal(true);
            dialog.resolve();
          });
          return promise;
        });

        it('should resolve a clicked button', () => {
          let promise = dialog.launch().then(result => {
            expect(result.button.accept).to.equal(false);
          });
          waitForDialog().then(() => {
            let node = dialog.node.querySelector('.jp-mod-reject');
            simulate(node, 'click');
          });
          return promise;
        });
      });

      context('focus', () => {
        it('should focus the default button when focus leaves the dialog', () => {
          let target = document.createElement('div');
          target.tabIndex = -1;
          document.body.appendChild(target);
          let host = document.createElement('div');
          document.body.appendChild(host);
          dialog = new TestDialog({ host });
          let promise = dialog.launch();
          waitForDialog().then(() => {
            simulate(target, 'focus');
            expect(document.activeElement).to.not.equal(target);
            expect(document.activeElement.className).to.contain(
              'jp-mod-accept'
            );
            dialog.resolve();
          });
          return promise;
        });
      });
    });

    describe('#onAfterAttach()', () => {
      it('should attach event listeners', () => {
        Widget.attach(dialog, document.body);
        expect(dialog.methods).to.contain('onAfterAttach');
        let events = ['keydown', 'contextmenu', 'click', 'focus'];
        each(events, evt => {
          simulate(dialog.node, evt);
          expect(dialog.events).to.contain(evt);
        });
      });

      it('should focus the default button', () => {
        Widget.attach(dialog, document.body);
        expect(document.activeElement.className).to.contain('jp-mod-accept');
      });

      it('should focus the primary element', () => {
        let body = (
          <div>
            <input type={'text'} />
          </div>
        );
        dialog = new TestDialog({ body, focusNodeSelector: 'input' });
        Widget.attach(dialog, document.body);
        expect((document.activeElement as HTMLElement).localName).to.equal(
          'input'
        );
      });
    });

    describe('#onAfterDetach()', () => {
      it('should remove event listeners', () => {
        Widget.attach(dialog, document.body);
        Widget.detach(dialog);
        expect(dialog.methods).to.contain('onAfterDetach');
        dialog.events = [];
        let events = ['keydown', 'contextmenu', 'click', 'focus'];
        each(events, evt => {
          simulate(dialog.node, evt);
          expect(dialog.events).to.not.contain(evt);
        });
      });

      it('should return focus to the original focused element', () => {
        let input = document.createElement('input');
        document.body.appendChild(input);
        input.focus();
        Widget.attach(dialog, document.body);
        Widget.detach(dialog);
        expect(document.activeElement).to.equal(input);
        document.body.removeChild(input);
      });
    });

    describe('#onCloseRequest()', () => {
      it('should reject an existing promise', () => {
        let promise = dialog.launch().then(result => {
          expect(result.button.accept).to.equal(false);
        });
        waitForDialog().then(() => {
          dialog.close();
        });
        return promise;
      });
    });

    describe('.defaultRenderer', () => {
      it('should be an instance of a Renderer', () => {
        expect(Dialog.defaultRenderer).to.be.an.instanceof(Dialog.Renderer);
      });
    });

    describe('.Renderer', () => {
      const renderer = Dialog.defaultRenderer;

      const data: Dialog.IButton = {
        label: 'foo',
        iconClass: 'bar',
        iconLabel: 'foo',
        caption: 'hello',
        className: 'baz',
        accept: false,
        displayType: 'warn'
      };

      describe('#createHeader()', () => {
        it('should create the header of the dialog', () => {
          let widget = renderer.createHeader('foo');
          expect(widget.hasClass('jp-Dialog-header')).to.equal(true);
        });
      });

      describe('#createBody()', () => {
        it('should create the body from a string', () => {
          let widget = renderer.createBody('foo');
          expect(widget.hasClass('jp-Dialog-body')).to.equal(true);
          let node = widget.node.firstChild;
          expect(node.textContent).to.equal('foo');
        });

        it('should create the body from a virtual node', () => {
          let vnode = (
            <div>
              <input type={'text'} />
              <select>
                <option value={'foo'}>foo</option>
              </select>
              <button />
            </div>
          );
          let widget = renderer.createBody(vnode);
          Widget.attach(widget, document.body);
          let button = widget.node.querySelector('button');
          expect(button.className).to.contain('jp-mod-styled');
          let input = widget.node.querySelector('input');
          expect(input.className).to.contain('jp-mod-styled');
          let select = widget.node.querySelector('select');
          expect(select.className).to.contain('jp-mod-styled');
          widget.dispose();
        });

        it('should create the body from a widget', () => {
          let body = new Widget();
          renderer.createBody(body);
          expect(body.hasClass('jp-Dialog-body')).to.equal(true);
        });
      });

      describe('#createFooter()', () => {
        it('should create the footer of the dialog', () => {
          let buttons = [Dialog.okButton, { label: 'foo' }] as Dialog.IButton[];
          let nodes = toArray(
            map(buttons, button => {
              return renderer.createButtonNode(button);
            })
          );
          let footer = renderer.createFooter(nodes);
          expect(footer.hasClass('jp-Dialog-footer')).to.equal(true);
          expect(footer.node.contains(nodes[0])).to.equal(true);
          expect(footer.node.contains(nodes[1])).to.equal(true);
          let buttonNodes = footer.node.querySelectorAll('button');
          // tslint:disable-next-line
          expect(buttonNodes.length).to.be.ok;
          each(buttonNodes, (node: Element) => {
            expect(node.className).to.contain('jp-mod-styled');
          });
        });
      });

      describe('#createButtonNode()', () => {
        it('should create a button node for the dialog', () => {
          let node = renderer.createButtonNode(data);
          expect(node.className).to.contain('jp-Dialog-button');
          // tslint:disable-next-line
          expect(node.querySelector('.jp-Dialog-buttonIcon')).to.be.ok;
          // tslint:disable-next-line
          expect(node.querySelector('.jp-Dialog-buttonLabel')).to.be.ok;
        });
      });

      describe('#renderIcon()', () => {
        it('should render an icon element for a dialog item', () => {
          let node = renderer.renderIcon(data);
          expect(node.className).to.contain('jp-Dialog-buttonIcon');
          expect(node.textContent).to.equal('foo');
        });
      });

      describe('#createItemClass()', () => {
        it('should create the class name for the button', () => {
          let value = renderer.createItemClass(data);
          expect(value).to.contain('jp-Dialog-button');
          expect(value).to.contain('jp-mod-reject');
          expect(value).to.contain(data.className);
        });
      });

      describe('#createIconClass()', () => {
        it('should create the class name for the button icon', () => {
          let value = renderer.createIconClass(data);
          expect(value).to.contain('jp-Dialog-buttonIcon');
          expect(value).to.contain(data.iconClass);
        });
      });

      describe('#renderLabel()', () => {
        it('should render a label element for a button', () => {
          let node = renderer.renderLabel(data);
          expect(node.className).to.equal('jp-Dialog-buttonLabel');
          expect(node.title).to.equal(data.caption);
          expect(node.textContent).to.equal(data.label);
        });
      });
    });
  });

  describe('showDialog()', () => {
    it('should accept zero arguments', async () => {
      const dialog = showDialog();

      await dismissDialog();
      expect((await dialog).button.accept).to.equal(false);
    });

    it('should accept dialog options', () => {
      let node = document.createElement('div');
      document.body.appendChild(node);
      let options = {
        title: 'foo',
        body: 'Hello',
        host: node,
        defaultButton: 0,
        buttons: [Dialog.cancelButton(), Dialog.okButton()]
      };
      let promise = showDialog(options).then(result => {
        expect(result.button.accept).to.equal(false);
        expect(result.value).to.equal(null);
      });
      acceptDialog();
      return promise;
    });

    it('should accept a virtualdom body', () => {
      let body = (
        <div>
          <input />
          <select />
        </div>
      );
      let promise = showDialog({ body }).then(result => {
        expect(result.button.accept).to.equal(true);
        expect(result.value).to.equal(null);
      });
      acceptDialog();
      return promise;
    });

    it('should accept a widget body', () => {
      let body = new Widget();
      let promise = showDialog({ body }).then(result => {
        expect(result.button.accept).to.equal(true);
        expect(result.value).to.equal(null);
      });
      acceptDialog();
      return promise;
    });

    it('should give the value from the widget', () => {
      let body = new ValueWidget();
      let promise = showDialog({ body }).then(result => {
        expect(result.button.accept).to.equal(true);
        expect(result.value).to.equal('foo');
      });
      acceptDialog();
      return promise;
    });
  });
});
