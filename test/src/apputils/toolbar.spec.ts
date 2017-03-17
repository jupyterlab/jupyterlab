// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Kernel
} from '@jupyterlab/services';

import {
  toArray
} from '@phosphor/algorithm';

import {
  Message
} from '@phosphor/messaging';

import {
  Signal
} from '@phosphor/signaling';

import {
  Widget
} from '@phosphor/widgets';

import {
  simulate
} from 'simulate-event';

import {
  Toolbar, ToolbarButton
} from '@jupyterlab/apputils';


class LogToolbarButton extends ToolbarButton {

  events: string[] = [];

  methods: string[] = [];

  handleEvent(event: Event): void {
    super.handleEvent(event);
    this.events.push(event.type);
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.methods.push('onAfterAttach');
  }

  protected onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    this.methods.push('onBeforeDetach');
  }
}


class KernelOwner extends Widget implements Toolbar.IKernelOwner {
  kernelChanged = new Signal<this, Kernel.IKernel>(this);
  kernel: Kernel.IKernel | null = null;

  startKernel(): Promise<void> {
    return Kernel.startNew().then(k => {
      this.kernel = k;
      this.kernelChanged.emit(k);
      this.kernel.terminated.connect(this._onTerminated, this);
    });
  }

  private _onTerminated(): void {
    this.kernel = null;
    this.kernelChanged.emit(null);
  }
}


describe('@jupyterlab/apputils', () => {

  describe('Toolbar', () => {

    describe('#constructor()', () => {

      it('should construct a new toolbar widget', () => {
        let widget = new Toolbar();
        expect(widget).to.be.a(Toolbar);
      });

      it('should add the `jp-Toolbar` class', () => {
        let widget = new Toolbar();
        expect(widget.hasClass('jp-Toolbar')).to.be(true);
      });

    });

    describe('#names()', () => {

      it('should get an ordered list the toolbar item names', () => {
        let widget = new Toolbar();
        widget.addItem('foo', new Widget());
        widget.addItem('bar', new Widget());
        widget.addItem('baz', new Widget());
        expect(toArray(widget.names())).to.eql(['foo', 'bar', 'baz']);
      });

    });

    describe('#addItem()', () => {

      it('should add an item to the toolbar', () => {
        let item = new Widget();
        let widget = new Toolbar();
        expect(widget.addItem('test', item)).to.be(true);
        expect(toArray(widget.names())).to.contain('test');
      });

      it('should add the `jp-Toolbar-item` class to the widget', () => {
        let item = new Widget();
        let widget = new Toolbar();
        widget.addItem('test', item);
        expect(item.hasClass('jp-Toolbar-item')).to.be(true);
      });

      it('should return false if the name is already used', () => {
        let widget = new Toolbar();
        widget.addItem('test', new Widget());
        expect(widget.addItem('test', new Widget())).to.be(false);
      });

    });

    describe('#insertItem()', () => {

      it('should insert the item into the toolbar', () => {
        let widget = new Toolbar();
        widget.addItem('a', new Widget());
        widget.addItem('b', new Widget());
        widget.insertItem(1, 'c', new Widget());
        expect(toArray(widget.names())).to.eql(['a', 'c', 'b']);
      });

      it('should clamp the bounds', () => {
        let widget = new Toolbar();
        widget.addItem('a', new Widget());
        widget.addItem('b', new Widget());
        widget.insertItem(10, 'c', new Widget());
        expect(toArray(widget.names())).to.eql(['a', 'b', 'c']);
      });

    });

    describe('#removeItem()', () => {

      it('should remove the item from the toolbar', () => {
        let widget = new Toolbar();
        widget.addItem('a', new Widget());
        let b = new Widget();
        widget.addItem('b', b);
        expect(widget.removeItem(b)).to.be(void 0);
      });

      it('should be a no-op the widget is not in the toolbar', () => {
        let widget = new Toolbar();
        widget.addItem('a', new Widget());
        expect(widget.removeItem(new Widget())).to.be(void 0);
      });

    });

    context('IKernelOwner', () => {

      let owner: KernelOwner;

      beforeEach(() => {
        owner = new KernelOwner();
      });

      afterEach(() => {
        if (owner.kernel) {
          return owner.kernel.shutdown().then(() => {
            owner.dispose();
          });
        }
        owner.dispose();
      });

      describe('.createInterruptButton()', () => {

        it('should have the `\'jp-StopIcon\'` class', () => {
          let button = Toolbar.createInterruptButton(owner);
          expect(button.hasClass('jp-StopIcon')).to.be(true);
        });

      });

      describe('.createRestartButton()', () => {

        it('should have the `\'jp-RefreshIcon\'` class', () => {
          let button = Toolbar.createRestartButton(owner);
          expect(button.hasClass('jp-RefreshIcon')).to.be(true);
        });

      });


      describe('.createKernelNameItem()', () => {

        it('should display the `\'display_name\'` of the kernel', () => {
          let item = Toolbar.createKernelNameItem(owner);
          return owner.startKernel().then(() => {
            return owner.kernel.getSpec();
          }).then(spec => {
            let name = spec.display_name;
            expect(item.node.textContent).to.be(name);
          });
        });

        it('should display `\'No Kernel!\'` if there is no kernel', () => {
          let item = Toolbar.createKernelNameItem(owner);
          expect(item.node.textContent).to.be('No Kernel!');
        });

      });

      describe('.createKernelStatusItem()', () => {

        beforeEach(() => {
          return owner.startKernel().then(kernel => {
            return owner.kernel.ready;
          });
        });

        it('should display a busy status if the kernel status is not idle', (done) => {
          let item = Toolbar.createKernelStatusItem(owner);
          let called = false;
          let future = owner.kernel.requestExecute({ code: 'a = 1' });
          future.onIOPub = msg => {
            if (owner.kernel.status === 'busy') {
              expect(item.hasClass('jp-mod-busy')).to.be(true);
              called = true;
            }
          };
          future.onDone = () => {
            expect(called).to.be(true);
            done();
          };
        });

        it('should show the current status in the node title', (done) => {
          let item = Toolbar.createKernelStatusItem(owner);
          let status = owner.kernel.status;
          expect(item.node.title.toLowerCase()).to.contain(status);
          let called = false;
          let future = owner.kernel.requestExecute({ code: 'a = 1' });
          future.onIOPub = msg => {
            if (owner.kernel.status === 'busy') {
              expect(item.node.title.toLowerCase()).to.contain('busy');
              called = true;
            }
          };
          future.onDone = () => {
            expect(called).to.be(true);
            done();
          };
        });

        it('should handle a null kernel', () => {
          let item = Toolbar.createKernelStatusItem(owner);
          return owner.kernel.shutdown().then(() => {
            expect(item.node.title).to.be('No Kernel!');
            expect(item.hasClass('jp-mod-busy')).to.be(true);
          });
        });

      });

    });

  });

  describe('ToolbarButton', () => {

    describe('#constructor()', () => {

      it('should accept no arguments', () => {
        let button = new ToolbarButton();
        expect(button).to.be.a(ToolbarButton);
      });

      it('should accept options', () => {
        let button = new ToolbarButton({
          className: 'foo',
          onClick: () => { return void 0; },
          tooltip: 'bar'
        });
        expect(button.hasClass('foo')).to.be(true);
        expect(button.node.title).to.be('bar');
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources used by the widget', () => {
        let button = new ToolbarButton();
        button.dispose();
        expect(button.isDisposed).to.be(true);
      });

      it('should be safe to call more than once', () => {
        let button = new ToolbarButton();
        button.dispose();
        button.dispose();
        expect(button.isDisposed).to.be(true);
      });

    });

    describe('#handleEvent()', () => {

      context('click', () => {

        it('should activate the callback', (done) => {
          let called = false;
          let button = new ToolbarButton({
            onClick: () => { called = true; },
          });
          Widget.attach(button, document.body);
          requestAnimationFrame(() => {
            simulate(button.node, 'click');
            expect(called).to.be(true);
            done();
          });
        });

      });

      context('mousedown', () => {

        it('should add the `jp-mod-pressed` class', (done) => {
          let button = new ToolbarButton();
          Widget.attach(button, document.body);
          requestAnimationFrame(() => {
            simulate(button.node, 'mousedown');
            expect(button.hasClass('jp-mod-pressed')).to.be(true);
            done();
          });
        });

      });

      context('mouseup', () => {

        it('should remove the `jp-mod-pressed` class', (done) => {
          let button = new ToolbarButton();
          Widget.attach(button, document.body);
          requestAnimationFrame(() => {
            simulate(button.node, 'mousedown');
            simulate(button.node, 'mouseup');
            expect(button.hasClass('jp-mod-pressed')).to.be(false);
            done();
          });
        });

      });

      context('mouseout', () => {

        it('should remove the `jp-mod-pressed` class', (done) => {
          let button = new ToolbarButton();
          Widget.attach(button, document.body);
          requestAnimationFrame(() => {
            simulate(button.node, 'mousedown');
            simulate(button.node, 'mouseout');
            expect(button.hasClass('jp-mod-pressed')).to.be(false);
            done();
          });
        });

      });

    });

    describe('#onAfterAttach()', () => {

      it('should add event listeners to the node', () => {
        let button = new LogToolbarButton();
        Widget.attach(button, document.body);
        expect(button.methods).to.contain('onAfterAttach');
        simulate(button.node, 'mousedown');
        simulate(button.node, 'mouseup');
        simulate(button.node, 'mouseout');
        expect(button.events).to.contain('mousedown');
        expect(button.events).to.contain('mouseup');
        expect(button.events).to.contain('mouseout');
      });

    });

    describe('#onBeforeDetach()', () => {

      it('should remove event listeners from the node', (done) => {
        let button = new LogToolbarButton();
        Widget.attach(button, document.body);
        requestAnimationFrame(() => {
          Widget.detach(button);
          expect(button.methods).to.contain('onBeforeDetach');
          simulate(button.node, 'mousedown');
          simulate(button.node, 'mouseup');
          simulate(button.node, 'mouseout');
          expect(button.events).to.not.contain('mousedown');
          expect(button.events).to.not.contain('mouseup');
          expect(button.events).to.not.contain('mouseout');
          done();
        });
      });

    });

  });

});
