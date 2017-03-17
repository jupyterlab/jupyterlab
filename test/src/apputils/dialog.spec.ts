// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect
} from 'chai';

import {
  each, map, toArray
} from '@phosphor/algorithm';

import {
  Message
} from '@phosphor/messaging';

import {
  VirtualDOM, h
} from '@phosphor/virtualdom';

import {
  Widget
} from '@phosphor/widgets';

import {
  generate, simulate
} from 'simulate-event';

import {
  Dialog, showDialog
} from '@jupyterlab/apputils';


/**
 * Accept a dialog.
 */
function acceptDialog(host: HTMLElement = document.body): void {
  let node = host.getElementsByClassName('jp-Dialog')[0];
  simulate(node as HTMLElement, 'keydown', { keyCode: 13 });
}


/**
 * Reject a dialog.
 */
function rejectDialog(host: HTMLElement = document.body): void {
  let node = host.getElementsByClassName('jp-Dialog')[0];
  simulate(node as HTMLElement, 'keydown', { keyCode: 27 });
}


class TestDialog extends Dialog {
  methods: string[] = [];
  events: string[] = [];

  handleEvent(event: Event): void {
    super.handleEvent(event);
    this.events.push(event.type);
  }

  protected onBeforeAttach(msg: Message): void {
    super.onBeforeAttach(msg);
    this.methods.push('onBeforeAttach');
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


describe('@jupyterlab/domutils', () => {

  describe('showDialog()', () => {

    it('should accept zero arguments', () => {
      let promise = showDialog().then(result => {
        expect(result.accept).to.equal(false);
      });
      rejectDialog();
      return promise;
    });

    it('should accept dialog options', () => {
      let node = document.createElement('div');
      document.body.appendChild(node);
      let options = {
        title: 'foo',
        body: 'Hello',
        host: node,
        buttons: [Dialog.okButton()],
      };
      let promise = showDialog(options).then(result => {
        expect(result.accept).to.equal(false);
      });
      rejectDialog();
      return promise;
    });

    it('should accept an html body', () => {
      let body = document.createElement('div');
      let input = document.createElement('input');
      let select = document.createElement('select');
      body.appendChild(input);
      body.appendChild(select);
      let promise = showDialog({ body }).then(result => {
        expect(result.accept).to.equal(true);
      });
      acceptDialog();
      return promise;
    });

    it('should accept a widget body', () => {
      let body = new Widget();
      let promise = showDialog({ body }).then(result => {
        expect(result.accept).to.equal(true);
      });
      acceptDialog();
      return promise;
    });


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
          dialog = new TestDialog({
            title: 'foo',
            body: 'Hello',
            buttons: [Dialog.okButton()]
          });
          expect(dialog).to.be.an.instanceof(Dialog);
        });

      });

      describe('#launch()', () => {

        it('should attach the dialog to the host', () => {
          let host = document.createElement('div');
          document.body.appendChild(host);
          dialog = new TestDialog({ host });
          dialog.launch();
          expect(host.firstChild).to.equal(dialog.node);
          dialog.dispose();
          document.body.removeChild(host);
        });

        it('should resolve with `true` when accepted', () => {
          let promise = dialog.launch().then(result => {
            expect(result.accept).to.equal(true);
          });
          dialog.resolve();
          return promise;
        });

        it('should resolve with `false` when accepted', () => {
          let promise = dialog.launch().then(result => {
            expect(result.accept).to.equal(false);
          });
          dialog.reject();
          return promise;
        });

        it('should resolve with `false` when closed', () => {
          let promise = dialog.launch().then(result => {
            expect(result.accept).to.equal(false);
          });
          dialog.close();
          return promise;
        });

        it('should return focus to the original focused element', () => {
          let input = document.createElement('input');
          document.body.appendChild(input);
          input.focus();
          expect(document.activeElement).to.equal(input);
          let promise = dialog.launch().then(() => {
            expect(document.activeElement).to.equal(input);
            document.body.removeChild(input);
          });
          expect(document.activeElement).to.not.equal(input);
          dialog.resolve();
          return promise;
        });

      });

      describe('#resolve()', () => {

        it('should resolve with the default item', () => {
          let promise = dialog.launch().then(result => {
            expect(result.accept).to.equal(true);
          });
          dialog.resolve();
          return promise;
        });

        it('should resolve with the item at the given index', () => {
          let promise = dialog.launch().then(result => {
            expect(result.accept).to.equal(false);
          });
          dialog.resolve(0);
          return promise;
        });

      });

      describe('#reject()', () => {

        it('should reject with the default reject item', () => {
          let promise = dialog.launch().then(result => {
            expect(result.label).to.equal('CANCEL');
            expect(result.accept).to.equal(false);
          });
          dialog.reject();
          return promise;
        });

      });

      describe('#handleEvent()', () => {

        context('keydown', () => {

          it('should reject on escape key', () => {
            let promise = dialog.launch().then(result => {
              expect(result.accept).to.equal(false);
            });
            simulate(dialog.node, 'keydown', { keyCode: 27 });
            return promise;
          });

          it('should accept on enter key', () => {
            let promise = dialog.launch().then(result => {
              expect(result.accept).to.equal(true);
            });
            simulate(dialog.node, 'keydown', { keyCode: 13 });
            return promise;
          });

          it('should cycle to the first button on a tab key', () => {
            let promise = dialog.launch().then(result => {
              expect(result.accept).to.equal(false);
            });
            let node = document.activeElement;
            expect(node.className).to.contain('jp-mod-accept');
            simulate(dialog.node, 'keydown', { keyCode: 9 });
            node = document.activeElement;
            expect(node.className).to.contain('jp-mod-reject');
            simulate(node, 'click');
            return promise;
          });

        });

        context('contextmenu', () => {

          it('should cancel context menu events', () => {
            let promise = dialog.launch().then(result => {
              expect(result.accept).to.equal(false);
            });
            let node = document.body.getElementsByClassName('jp-Dialog')[0];
            let evt = generate('contextmenu');
            let cancelled = !node.dispatchEvent(evt);
            expect(cancelled).to.equal(true);
            simulate(node as HTMLElement, 'keydown', { keyCode: 27 });
            return promise;
          });

        });

        context('click', () => {

          it('should prevent clicking outside of the content area', () => {
            let promise = dialog.launch();
            let evt = generate('click');
            let cancelled = !dialog.node.dispatchEvent(evt);
            expect(cancelled).to.equal(true);
            dialog.resolve();
            return promise;
          });

          it('should resolve a clicked button', () => {
            let promise = dialog.launch().then(result => {
              expect(result.accept).to.equal(false);
            });
            let node = dialog.node.querySelector('.jp-mod-reject');
            simulate(node, 'click');
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
            simulate(target, 'focus');
            expect(document.activeElement).to.not.equal(target);
            expect(document.activeElement.className).to.contain('jp-mod-accept');
            dialog.resolve();
            return promise;
          });

        });

      });

      describe('#onBeforeAttach()', () => {

        it('should attach event listeners', () => {
          Widget.attach(dialog, document.body);
          expect(dialog.methods).to.contain('onBeforeAttach');
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
          let body = document.createElement('input');
          dialog = new TestDialog({ body, primaryElement: body });
          Widget.attach(dialog, document.body);
          expect(document.activeElement).to.equal(body);
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
        });

      });

      describe('#onCloseRequest()', () => {

        it('should reject an existing promise', () => {
          let promise = dialog.launch().then(result => {
            expect(result.accept).to.equal(false);
          });
          dialog.close();
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
          icon: 'bar',
          caption: 'hello',
          className: 'baz',
          accept: false,
          displayType: 'warn'
        };

        describe('#createHeader()', () => {

          it('should create the header of the dialog', () => {
            let widget = renderer.createHeader('foo');
            expect(widget.hasClass('jp-Dialog-header')).to.equal(true);
            let node = widget.node.querySelector('.jp-Dialog-title');
            expect(node.textContent).to.equal('foo');
          });

        });

        describe('#createBody()', () => {

          it('should create the body from a string', () => {
            let widget = renderer.createBody('foo');
            expect(widget.hasClass('jp-Dialog-body')).to.equal(true);
            let node = widget.node.firstChild;
            expect(node.textContent).to.equal('foo');
          });

          it('should create the body from an element', () => {
            let vnode = h.div({}, [h.input(), h.select(), h.button()]);
            let widget = renderer.createBody(VirtualDOM.realize(vnode));
            let button = widget.node.querySelector('button');
            expect(button.className).to.contain('jp-mod-styled');
            let input = widget.node.querySelector('input');
            expect(input.className).to.contain('jp-mod-styled');
            let select = widget.node.querySelector('select');
            expect(select.className).to.contain('jp-mod-styled');
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
            let nodes = toArray(map(buttons, button => {
              return renderer.createButtonNode(button);
            }));
            let footer = renderer.createFooter(nodes);
            expect(footer.hasClass('jp-Dialog-footer')).to.equal(true);
            expect(footer.node.contains(nodes[0])).to.equal(true);
            expect(footer.node.contains(nodes[1])).to.equal(true);
            let buttonNodes = footer.node.querySelectorAll('button');
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
            expect(node.querySelector('.jp-Dialog-buttonIcon')).to.be.ok;
            expect(node.querySelector('.jp-Dialog-buttonLabel')).to.be.ok;
          });

        });

        describe('#renderIcon()', () => {

          it('should render an icon element for a dialog item', () => {
            let node = VirtualDOM.realize(renderer.renderIcon(data));
            expect(node.className).to.contain('jp-Dialog-buttonIcon');
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
            expect(value).to.contain(data.icon);
          });

        });

        describe('#renderLabel()', () => {

          it('should render a label element for a button', () => {
            let node = VirtualDOM.realize(renderer.renderLabel(data));
            expect(node.className).to.equal('jp-Dialog-buttonLabel');
            expect(node.title).to.equal(data.caption);
            expect(node.textContent).to.equal(data.label);
          });

        });

      });

    });

  });

});
