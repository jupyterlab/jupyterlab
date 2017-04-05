// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ServiceManager
} from '@jupyterlab/services';

import {
  Message, MessageLoop
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  simulate
} from 'simulate-event';

import {
  BreadCrumbs, FileBrowserModel
} from '@jupyterlab/filebrowser';



const ITEM_CLASS = 'jp-BreadCrumbs-item';


class LogCrumbs extends BreadCrumbs {
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

  protected onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    this.methods.push('onBeforeDetach');
  }

  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    this.methods.push('onUpdateRequest');
  }
}


describe('filebrowser/model', () => {

  let manager: ServiceManager.IManager;
  let model: FileBrowserModel;
  let crumbs: LogCrumbs;
  let first: string;
  let second: string;
  let third: string;
  let path: string;

  before((done) => {
    manager = new ServiceManager();
    let contents = manager.contents;
    contents.newUntitled({ type: 'directory' }).then(cModel => {
      first = cModel.name;
      return contents.newUntitled({ path: cModel.path, type: 'directory' });
    }).then(cModel => {
      second = cModel.name;
      return contents.newUntitled({ path: cModel.path, type: 'directory' });
    }).then(cModel => {
      third = cModel.name;
      path = cModel.path;
    }).then(done, done);
  });

  beforeEach((done) => {
    model = new FileBrowserModel({ manager });
    model.cd(path).then(() => {
      crumbs = new LogCrumbs({ model });
    }).then(done, done);
  });

  afterEach(() => {
    model.dispose();
  });

  describe('BreadCrumbs', () => {

    describe('#constructor()', () => {

      it('should create a new BreadCrumbs instance', () => {
        let bread = new BreadCrumbs({ model });
        expect(bread).to.be.a(BreadCrumbs);
        let items = crumbs.node.getElementsByClassName(ITEM_CLASS);
        expect(items.length).to.be(1);
      });

      it('should add the jp-BreadCrumbs class', () => {
        expect(crumbs.hasClass('jp-BreadCrumbs')).to.be(true);
      });

    });

    describe('#handleEvent()', () => {

      context('click', () => {

        it('should switch to the parent directory', (done) => {
          Widget.attach(crumbs, document.body);
          MessageLoop.sendMessage(crumbs, Widget.Msg.UpdateRequest);
          let items = crumbs.node.getElementsByClassName(ITEM_CLASS);
          expect(items.length).to.be(4);
          model.pathChanged.connect(() => {
            MessageLoop.sendMessage(crumbs, Widget.Msg.UpdateRequest);
            items = crumbs.node.getElementsByClassName(ITEM_CLASS);
            expect(items.length).to.be(3);
            done();
          });
          expect(items[2].textContent).to.be(second);
          simulate(items[2], 'click');
        });

        it('should switch to the home directory', (done) => {
          Widget.attach(crumbs, document.body);
          MessageLoop.sendMessage(crumbs, Widget.Msg.UpdateRequest);
          let items = crumbs.node.getElementsByClassName(ITEM_CLASS);
          model.pathChanged.connect(() => {
            MessageLoop.sendMessage(crumbs, Widget.Msg.UpdateRequest);
            items = crumbs.node.getElementsByClassName(ITEM_CLASS);
            expect(items.length).to.be(1);
            expect(model.path).to.be('');
            done();
          });
          simulate(items[0], 'click');
        });

        it('should switch to the grandparent directory', (done) => {
          Widget.attach(crumbs, document.body);
          MessageLoop.sendMessage(crumbs, Widget.Msg.UpdateRequest);
          let items = crumbs.node.getElementsByClassName(ITEM_CLASS);
          model.pathChanged.connect(() => {
            MessageLoop.sendMessage(crumbs, Widget.Msg.UpdateRequest);
            items = crumbs.node.getElementsByClassName(ITEM_CLASS);
            expect(items.length).to.be(2);
            expect(model.path).to.be(first);
            done();
          });
          simulate(items[1], 'click');
        });

        it('should refresh the current directory', (done) => {
          Widget.attach(crumbs, document.body);
          MessageLoop.sendMessage(crumbs, Widget.Msg.UpdateRequest);
          let items = crumbs.node.getElementsByClassName(ITEM_CLASS);
          model.refreshed.connect(() => {
            MessageLoop.sendMessage(crumbs, Widget.Msg.UpdateRequest);
            items = crumbs.node.getElementsByClassName(ITEM_CLASS);
            expect(items.length).to.be(4);
            expect(model.path).to.be(path);
            done();
          });
          expect(items[3].textContent).to.be(third);
          simulate(items[3], 'click');
        });

      });

    });

    describe('#onAfterAttach()', () => {

      it('should post an update request', (done) => {
        Widget.attach(crumbs, document.body);
        expect(crumbs.methods).to.contain('onAfterAttach');
        requestAnimationFrame(() => {
          expect(crumbs.methods).to.contain('onUpdateRequest');
          done();
        });
      });

      it('should add event listeners', () => {
        Widget.attach(crumbs, document.body);
        simulate(crumbs.node, 'click');
        expect(crumbs.events).to.contain('click');
      });

    });

    describe('#onBeforeDetach()', () => {

      it('should remove event listeners', () => {
        Widget.attach(crumbs, document.body);
        Widget.detach(crumbs);
        simulate(crumbs.node, 'click');
        expect(crumbs.events).to.not.contain('click');
      });

    });

    describe('#onUpdateRequest()', () => {

      it('should be called when the model updates', (done) => {
        model.cd('..').then(() => {
          requestAnimationFrame(() => {
            expect(crumbs.methods).to.contain('onUpdateRequest');
            let items = crumbs.node.getElementsByClassName(ITEM_CLASS);
            expect(items.length).to.be(3);
            done();
          });
        }).catch(done);
      });

    });

  });

});
