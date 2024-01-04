// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DocumentManager, IDocumentManager } from '@jupyterlab/docmanager';
import { DocumentRegistry, TextModelFactory } from '@jupyterlab/docregistry';
import { DocumentWidgetOpenerMock } from '@jupyterlab/docregistry/lib/testutils';
import { ServiceManager } from '@jupyterlab/services';
import { framePromise, signalToPromise } from '@jupyterlab/testing';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import { Message, MessageLoop } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import expect from 'expect';
import { simulate } from 'simulate-event';
import { BreadCrumbs, FileBrowserModel } from '../src';

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

  beforeAll(async () => {
    const opener = new DocumentWidgetOpenerMock();

    registry = new DocumentRegistry({
      textModelFactory: new TextModelFactory()
    });
    serviceManager = new ServiceManagerMock();
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
        expect(bread).toBeInstanceOf(BreadCrumbs);
        const items = crumbs.node.querySelectorAll(ITEM_QUERY);
        expect(items.length).toBe(1);
      });

      it('should add the jp-BreadCrumbs class', () => {
        expect(crumbs.hasClass('jp-BreadCrumbs')).toBe(true);
      });
    });

    describe('#handleEvent()', () => {
      describe('click', () => {
        it('should switch to the parent directory', async () => {
          Widget.attach(crumbs, document.body);
          MessageLoop.sendMessage(crumbs, Widget.Msg.UpdateRequest);
          let items = crumbs.node.querySelectorAll(ITEM_QUERY);
          expect(items.length).toBe(4);
          const promise = signalToPromise(model.pathChanged);
          expect(items[2].textContent).toBe(second);
          simulate(items[2], 'click');
          await promise;
          MessageLoop.sendMessage(crumbs, Widget.Msg.UpdateRequest);
          items = crumbs.node.querySelectorAll(ITEM_QUERY);
          expect(items.length).toBe(3);
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
          expect(items.length).toBe(1);
          expect(model.path).toBe('');
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
          expect(items.length).toBe(2);
          expect(model.path).toBe(first);
        });

        it('should refresh the current directory', async () => {
          Widget.attach(crumbs, document.body);
          MessageLoop.sendMessage(crumbs, Widget.Msg.UpdateRequest);
          let items = crumbs.node.querySelectorAll(ITEM_QUERY);
          const promise = signalToPromise(model.refreshed);
          expect(items[3].textContent).toBe(third);
          simulate(items[3], 'click');
          await promise;
          MessageLoop.sendMessage(crumbs, Widget.Msg.UpdateRequest);
          items = crumbs.node.querySelectorAll(ITEM_QUERY);
          expect(items.length).toBe(4);
          expect(model.path).toBe(path);
        });
      });
    });

    describe('#onAfterAttach()', () => {
      it('should post an update request', async () => {
        Widget.attach(crumbs, document.body);
        expect(crumbs.methods).toEqual(
          expect.arrayContaining(['onAfterAttach'])
        );
        await framePromise();
        expect(crumbs.methods).toEqual(
          expect.arrayContaining(['onUpdateRequest'])
        );
      });

      it('should add event listeners', () => {
        Widget.attach(crumbs, document.body);
        simulate(crumbs.node, 'click');
        expect(crumbs.events).toEqual(expect.arrayContaining(['click']));
      });
    });

    describe('#onBeforeDetach()', () => {
      it('should remove event listeners', () => {
        Widget.attach(crumbs, document.body);
        Widget.detach(crumbs);
        simulate(crumbs.node, 'click');
        expect(crumbs.events).not.toEqual(expect.arrayContaining(['click']));
      });
    });

    describe('#fullPath', () => {
      it('should show/hide full path', async () => {
        Widget.attach(crumbs, document.body);
        MessageLoop.sendMessage(crumbs, Widget.Msg.UpdateRequest);
        expect(crumbs.node.textContent).toMatch(
          /\/\/Untitled Folder.*?\/Untitled Folder.*?\//
        );
        crumbs.fullPath = true;
        MessageLoop.sendMessage(crumbs, Widget.Msg.UpdateRequest);
        await framePromise();
        expect(crumbs.node.textContent).toMatch(
          /\/Untitled Folder.*?\/Untitled Folder.*?\/Untitled Folder.*?\//
        );
      });
    });

    describe('#onUpdateRequest()', () => {
      it('should be called when the model updates', async () => {
        const model = new FileBrowserModel({ manager });
        await model.cd(path);
        crumbs = new LogCrumbs({ model });
        await model.cd('..');
        await framePromise();

        expect(crumbs.methods).toEqual(
          expect.arrayContaining(['onUpdateRequest'])
        );
        const items = crumbs.node.querySelectorAll(ITEM_QUERY);
        expect(items.length).toBe(3);
        model.dispose();
      });

      it('should trigger DOM updates if state changes', async () => {
        const model = new FileBrowserModel({ manager });
        crumbs = new LogCrumbs({ model });
        let modifications = 0;
        const observer = new MutationObserver(() => modifications++);
        observer.observe(crumbs.node, {
          attributes: true,
          childList: true,
          subtree: true
        });

        // Should modify the DOM once
        await model.cd(path);
        crumbs.update();
        await framePromise();
        expect(modifications).toBe(1);

        // Should modify the DOM once
        await model.cd('..');
        crumbs.update();
        await framePromise();
        expect(modifications).toBe(2);

        observer.disconnect();
        model.dispose();
      });

      it('should not touch DOM if state is unchanged', async () => {
        const model = new FileBrowserModel({ manager });
        crumbs = new LogCrumbs({ model });
        let modifications = 0;
        const observer = new MutationObserver(() => modifications++);
        observer.observe(crumbs.node, {
          attributes: true,
          childList: true,
          subtree: true
        });

        // Should modify the DOM once
        await model.cd(path);
        crumbs.update();
        await framePromise();
        expect(modifications).toBe(1);

        // Should not increase the number of modifications
        crumbs.update();
        await framePromise();
        expect(modifications).toBe(1);

        observer.disconnect();
        model.dispose();
      });
    });
  });
});
