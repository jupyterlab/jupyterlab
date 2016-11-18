// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ServiceManager
} from '@jupyterlab/services';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  BreadCrumbs, FileBrowserModel
} from '../../../lib/filebrowser';



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
  let crumbs: BreadCrumbs;
  let parent: string;
  let path: string;

  before((done) => {
    manager = new ServiceManager();
    let contents = manager.contents;
    contents.newUntitled({ type: 'directory' }).then(cModel => {
      parent = cModel.path;
      return contents.newUntitled({ path: cModel.path, type: 'directory' });
    }).then(cModel => {
      path = cModel.path;
    }).then(done, done);
  });

  beforeEach((done) => {
    model = new FileBrowserModel({ manager });
    model.cd(path).then(() => {
      crumbs = new BreadCrumbs({ model });
    }).then(done, done);
  });

  afterEach(() => {
    model.dispose();
  });

  describe('BreadCrumbs', () => {

    describe('#constructor()', () => {

      it('should create a new BreadCrumbs instance', () => {
        crumbs = new BreadCrumbs({ model });
        expect(crumbs).to.be.a(BreadCrumbs);
      });

      it('should add the jp-BreadCrumbs class', () => {
        expect(crumbs.hasClass('jp-BreadCrumbs')).to.be(true);
      });

    });

    describe('#handleEvent()', () => {

      context('click', () => {

        it('should switch to the child directory', () => {

        });

      });

      context('p-dragenter', () => {

      });

      context('p-dragleave', () => {

      });

      context('p-dragover', () => {

      });

      context('p-drop', () => {

      });

    });

    describe('#onAfterAttach()', () => {

    });

    describe('#onBeforeDetach()', () => {

    });

    describe('#onUpdateRequest()', () => {

    });

  });

});
