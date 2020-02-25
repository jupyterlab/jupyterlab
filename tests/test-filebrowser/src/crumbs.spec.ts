// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { DocumentManager, IDocumentManager } from '@jupyterlab/docmanager';

import { DocumentRegistry, TextModelFactory } from '@jupyterlab/docregistry';

import { BreadCrumbs, FileBrowserModel } from '@jupyterlab/filebrowser';

import { ServiceManager } from '@jupyterlab/services';

import { framePromise, signalToPromise } from '@jupyterlab/testutils';

import { Message, MessageLoop } from '@lumino/messaging';

import { Widget } from '@lumino/widgets';

import { simulate } from 'simulate-event';

const HOME_ITEM_CLASS = 'jp-BreadCrumbs-home';
const ITEM_CLASS = 'jp-BreadCrumbs-item';
const ITEM_QUERY = `.${HOME_ITEM_CLASS}, .${ITEM_CLASS}`;

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
  let manager: IDocumentManager;
  let serviceManager: ServiceManager.IManager;
  let registry: DocumentRegistry;
  let model: FileBrowserModel;
  let crumbs: LogCrumbs;
  let first: string;
  let second: string;
  let third: string;
  let path: string;

  before(async () => {
    const opener: DocumentManager.IWidgetOpener = {
      open: widget => {
        /* no op */
      }
    };

    registry = new DocumentRegistry({
      textModelFactory: new TextModelFactory()
    });
    serviceManager = new ServiceManager({ standby: 'never' });
    manager = new DocumentManager({
      registry,
      opener,
      manager: serviceManager
    });

    const contents = serviceManager.contents;
    let cModel = await contents.newUntitled({ type: 'directory' });
    first = cModel.name;
    cModel = await contents.newUntitled({
      path: cModel.path,
      type: 'directory'
    });
    second = cModel.name;
    cModel = await contents.newUntitled({
      path: cModel.path,
      type: 'directory'
    });
    third = cModel.name;
    path = cModel.path;
  });

  beforeEach(async () => {
    model = new FileBrowserModel({ manager });
    await model.cd(path);
    crumbs = new LogCrumbs({ model });
  });

  afterEach(() => {
    model.dispose();
  });

  describe('BreadCrumbs', () => {
    describe('#constructor()', () => {
      it('should create a new BreadCrumbs instance', () => {
        const bread = new BreadCrumbs({ model });
        expect(bread).to.be.an.instanceof(BreadCrumbs);
        const items = crumbs.node.querySelectorAll(ITEM_QUERY);
        expect(items.length).to.equal(1);
      });

      it('should add the jp-BreadCrumbs class', () => {
        expect(crumbs.hasClass('jp-BreadCrumbs')).to.equal(true);
      });
    });

    describe('#handleEvent()', () => {
      context('click', () => {
        it('should switch to the parent directory', async () => {
          Widget.attach(crumbs, document.body);
          MessageLoop.sendMessage(crumbs, Widget.Msg.UpdateRequest);
          let items = crumbs.node.querySelectorAll(ITEM_QUERY);
          expect(items.length).to.equal(4);
          const promise = signalToPromise(model.pathChanged);
          expect(items[2].textContent).to.equal(second);
          simulate(items[2], 'click');
          await promise;
          MessageLoop.sendMessage(crumbs, Widget.Msg.UpdateRequest);
          items = crumbs.node.querySelectorAll(ITEM_QUERY);
          expect(items.length).to.equal(3);
        });

        it('should switch to the home directory', async () => {
          Widget.attach(crumbs, document.body);
          MessageLoop.sendMessage(crumbs, Widget.Msg.UpdateRequest);
          let items = crumbs.node.querySelectorAll(ITEM_QUERY);
          const promise = signalToPromise(model.pathChanged);
          simulate(items[0], 'click');
          await promise;
          MessageLoop.sendMessage(crumbs, Widget.Msg.UpdateRequest);
          items = crumbs.node.querySelectorAll(ITEM_QUERY);
          expect(items.length).to.equal(1);
          expect(model.path).to.equal('');
        });

        it('should switch to the grandparent directory', async () => {
          Widget.attach(crumbs, document.body);
          MessageLoop.sendMessage(crumbs, Widget.Msg.UpdateRequest);
          let items = crumbs.node.querySelectorAll(ITEM_QUERY);
          const promise = signalToPromise(model.pathChanged);
          simulate(items[1], 'click');
          await promise;
          MessageLoop.sendMessage(crumbs, Widget.Msg.UpdateRequest);
          items = crumbs.node.querySelectorAll(ITEM_QUERY);
          expect(items.length).to.equal(2);
          expect(model.path).to.equal(first);
        });

        it('should refresh the current directory', async () => {
          Widget.attach(crumbs, document.body);
          MessageLoop.sendMessage(crumbs, Widget.Msg.UpdateRequest);
          let items = crumbs.node.querySelectorAll(ITEM_QUERY);
          const promise = signalToPromise(model.refreshed);
          expect(items[3].textContent).to.equal(third);
          simulate(items[3], 'click');
          await promise;
          MessageLoop.sendMessage(crumbs, Widget.Msg.UpdateRequest);
          items = crumbs.node.querySelectorAll(ITEM_QUERY);
          expect(items.length).to.equal(4);
          expect(model.path).to.equal(path);
        });
      });
    });

    describe('#onAfterAttach()', () => {
      it('should post an update request', async () => {
        Widget.attach(crumbs, document.body);
        expect(crumbs.methods).to.contain('onAfterAttach');
        await framePromise();
        expect(crumbs.methods).to.contain('onUpdateRequest');
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
      it('should be called when the model updates', async () => {
        const model = new FileBrowserModel({ manager });
        await model.cd(path);
        crumbs = new LogCrumbs({ model });
        await model.cd('..');
        await framePromise();

        expect(crumbs.methods).to.contain('onUpdateRequest');
        const items = crumbs.node.querySelectorAll(ITEM_QUERY);
        expect(items.length).to.equal(3);
        model.dispose();
      });
    });
  });
});
