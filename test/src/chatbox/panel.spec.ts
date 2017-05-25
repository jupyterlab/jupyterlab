// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Message, MessageLoop
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  editorServices
} from '@jupyterlab/codemirror';

import {
  Chatbox, ChatboxPanel, ChatboxDocumentInfo
} from '@jupyterlab/chatbox';

import {
  Context, DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  ServiceManager, Contents
} from '@jupyterlab/services';

import {
  uuid
} from '@jupyterlab/coreutils';


import {
  createFileContext, defaultRenderMime
} from '../utils';

/**
 * The common file model.
 */
const FILE: Contents.IModel = {
  path: uuid() + '.txt',
  type: 'file',
  mimetype: 'text/plain',
  content:  'Hello, world',
  format: 'text'
};


/**
 * Factory stuff.
 */
const editorFactory = editorServices.factoryService.newInlineEditor.bind(
    editorServices.factoryService);
const contentFactory = new ChatboxPanel.ContentFactory({ editorFactory });
const rendermime = defaultRenderMime();


describe('chatbox/panel', () => {

  let panel: ChatboxPanel;
  let context: Context<DocumentRegistry.IModel>;
  let manager: ServiceManager.IManager;

  before(() => {
    manager = new ServiceManager();
    return manager.ready.then(() => {
      return manager.contents.save(FILE.path, FILE);
    });
  });

  beforeEach(() => {
    panel = new ChatboxPanel({
      rendermime, contentFactory
    });
    context = createFileContext(FILE.path, manager);
  });

  afterEach(() => {
    panel.dispose();
  });

  describe('ChatboxPanel', () => {

    describe('#constructor()', () => {

      it('should create a new chatbox panel', () => {
        expect(panel).to.be.a(ChatboxPanel);
        expect(panel.node.classList).to.contain('jp-ChatboxPanel');
      });

    });

    describe('#chatbox', () => {

      it('should be a chatbox widget created at instantiation', () => {
        expect(panel.chatbox).to.be.a(Chatbox);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the panel', () => {
        panel.dispose();
        expect(panel.isDisposed).to.be(true);
        panel.dispose();
        expect(panel.isDisposed).to.be(true);
      });

    });

    describe('#context', () => {

      it('should get the document context for the widget', () => {
        expect(panel.context).to.be(null);
      });

      it('should set the document context for the widget', () => {
        panel.context = context
        expect(panel.context).to.be(context);
      });

    });


    describe('#onActivateRequest()', () => {

      it('should give the focus to the chatbox prompt', () => {
        Widget.attach(panel, document.body);
        MessageLoop.sendMessage(panel, Widget.Msg.ActivateRequest);
        expect(panel.chatbox.prompt.editor.hasFocus()).to.be(true);
      });

    });

    describe('#onCloseRequest()', () => {

      it('should dispose of the panel resources after closing', () => {
        Widget.attach(panel, document.body);
        expect(panel.isDisposed).to.be(false);
        MessageLoop.sendMessage(panel, Widget.Msg.CloseRequest);
        expect(panel.isDisposed).to.be(true);
      });

    });

    describe('.ContentFactory', () => {

      describe('#constructor', () => {

        it('should create a new chatbox factory', () => {
          let factory = new ChatboxPanel.ContentFactory({ editorFactory });
          expect(factory).to.be.a(ChatboxPanel.ContentFactory);
        });

      });

    });


  });

  describe('ChatboxDocumentInfo', () => {

    describe('#constructor', () => {

      it('should create a new chatbox document info widget', () => {
        let info = new ChatboxDocumentInfo();
        expect(info).to.be.a(ChatboxDocumentInfo);
      });

    });

    describe('#context', () => {

      it('should get the document context for the widget', () => {
        let info = new ChatboxDocumentInfo();
        expect(info.context).to.be(null);
      });

      it('should set the document context for the widget', () => {
        let info = new ChatboxDocumentInfo();
        info.context = context;
        expect(info.context).to.be(context);
      });

      it('should update the text content of the widget', () => {
        let info = new ChatboxDocumentInfo();
        expect(info.node.textContent).to.be('');
        info.context = context;
        expect(info.node.textContent).to.be(FILE.path);
      });

      it('should update the text content when the context changes names', (done) => {
        let info = new ChatboxDocumentInfo();
        info.context = context;
        expect(info.node.textContent).to.be(FILE.path);
        manager.contents.rename(context.path, 'rename.txt').then( () => {
          expect(info.node.textContent).to.be('rename.txt');
          done();
        });
      });

    });

  });

});
