// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  JSONExt
} from '@phosphor/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  Chatbox, ChatEntry 
} from '@jupyterlab/chatbox';

import {
  editorServices
} from '@jupyterlab/codemirror';

import {
  MarkdownCell, MarkdownCellModel
} from '@jupyterlab/cells';

import {
  DocumentModel
} from '@jupyterlab/docregistry';

import {
  ModelDB, ObservableMap, ObservableList, ICollaborator
} from '@jupyterlab/coreutils';

import {
  defaultRenderMime
} from '../utils';


/**
 * Factory stuff.
 */
const editorFactory = editorServices.factoryService.newInlineEditor.bind(
    editorServices.factoryService);
const contentFactory = new Chatbox.ContentFactory({ editorFactory });
const rendermime = defaultRenderMime();

/**
 * Create a dummy collaborator map.
 */
class DummyCollaboratorMap extends ObservableMap<ICollaborator> {
  type: 'Map';

  readonly localCollaborator: ICollaborator = {
    userId: '1234',
    sessionId: '5678',
    displayName: 'A. U. Thor',
    color: '#00FF33',
    shortName: 'AU'
  }
}

/**
 * Create a dummy collaborative ModelDB.
 */
class DummyCollaborativeDB extends ModelDB {
  readonly isCollaborative: boolean = true;

  readonly collaborators = new DummyCollaboratorMap();
} 


describe('chatbox/chatbox', () => {

  describe('Chatbox', () => {

    let chatbox: Chatbox;
    let docmodel: DocumentModel;
    let modelDB: DummyCollaborativeDB;

    beforeEach(() => {
      chatbox = new Chatbox({
        rendermime, contentFactory
      });
      modelDB = new DummyCollaborativeDB();
      docmodel = new DocumentModel('', modelDB);
      chatbox.model = docmodel;
    });

    afterEach(() => {
      chatbox.dispose();
      docmodel.dispose();
      modelDB.dispose();
    });

    describe('#constructor()', () => {

      it('should create a new chatbox content widget', () => {
        Widget.attach(chatbox, document.body);
        expect(chatbox).to.be.a(Chatbox);
        expect(chatbox.node.classList).to.contain('jp-Chatbox');
      });

    });

    describe('#prompt', () => {

      it('should be a markdown cell widget', () => {
        Widget.attach(chatbox, document.body);
        expect(chatbox.prompt).to.be.a(MarkdownCell);
      });

      it('should be replaced after posting', () => {
        Widget.attach(chatbox, document.body);
        let old = chatbox.prompt;
        expect(old).to.be.a(MarkdownCell);
        old.model.value.text = 'An entry';
        chatbox.post();
        expect(chatbox.prompt).to.be.a(MarkdownCell);
        expect(chatbox.prompt).to.not.be(old);

      });

    });

    describe('#contentFactory', () => {

      it('should be the content factory used by the widget', () => {
        expect(chatbox.contentFactory).to.be.a(Chatbox.ContentFactory);
      });

    });

    describe('#log', () => {

      it('should get the log of chat entries', () => {
        expect(chatbox.log).to.be.a(ObservableList);
      });

    });

    describe('#widgets', () => {

      it('should get the array of rendered chat widgets', () => {
        Widget.attach(chatbox, document.body);
        chatbox.prompt.model.value.text = 'An entry';
        chatbox.post();
        expect(chatbox.widgets[0]).to.be.a(Widget);
      });

    });

    describe('#model', () => {

      it('should get the current model of the chatbox', () => {
        Widget.attach(chatbox, document.body);
        expect(chatbox.model).to.be(docmodel);
      });

      it('should set the current model of the chatbox', () => {
        Widget.attach(chatbox, document.body);
        let newModel = new DocumentModel('', modelDB);
        chatbox.model = newModel;
        expect(chatbox.model).to.be(newModel);
      });

      it('should clear the chatbox if given an invalid model', () => {
        Widget.attach(chatbox, document.body);
        chatbox.model = null;
        expect(chatbox.model).to.be(null);
        expect(chatbox.log).to.be(null);
        expect(chatbox.widgets.length).to.be(0);
      });

      it('should be able to recall chat logs of other models', () => {
        Widget.attach(chatbox, document.body);
        let newModelDB = new DummyCollaborativeDB();
        let newModel = new DocumentModel('', newModelDB);
        chatbox.prompt.model.value.text = 'A: 1';
        chatbox.post();
        chatbox.prompt.model.value.text = 'A: 2';
        chatbox.post();
        chatbox.prompt.model.value.text = 'A: 3';
        chatbox.post();
        chatbox.model = newModel;
        chatbox.prompt.model.value.text = 'B: 1';
        chatbox.post();
        chatbox.prompt.model.value.text = 'B: 2';
        chatbox.post();
        chatbox.model = docmodel;
        expect(chatbox.log.length).to.be(3);
        expect(chatbox.log.back.text).to.be('A: 3');
        chatbox.model = newModel;
        expect(chatbox.log.length).to.be(2);
        expect(chatbox.log.back.text).to.be('B: 2');
      });

    });

    describe('#post()', () => {

      it('should add a new entry to the log', () => {
        Widget.attach(chatbox, document.body);
        chatbox.prompt.model.value.text = 'An entry';
        chatbox.post();
        let entry = chatbox.log.back;
        expect(entry.text).to.be('An entry');
        expect(JSONExt.deepEqual(entry.author,
               modelDB.collaborators.localCollaborator)).to.be(true);
      });

      it('should add a new entry widget to the panel', () => {
        Widget.attach(chatbox, document.body);
        chatbox.prompt.model.value.text = 'An entry';
        chatbox.post();
        let widget = chatbox.widgets[chatbox.widgets.length-1] as ChatEntry;
        expect(widget.model.text).to.be('An entry');
        expect(JSONExt.deepEqual(widget.model.author,
               modelDB.collaborators.localCollaborator)).to.be(true);
      });

      it('should not add an entry if the prompt has only whitespace', () => {
        Widget.attach(chatbox, document.body);
        chatbox.prompt.model.value.text = '   \n  ';
        chatbox.post();
        expect(chatbox.log.length).to.be(0);
        expect(chatbox.widgets.length).to.be(0);
      });

    });

    describe('#insertLineBreak()', () => {

      it('should insert a line break into the prompt', () => {
        Widget.attach(chatbox, document.body);

        let model = chatbox.prompt.model;
        expect(model.value.text).to.be.empty();
        chatbox.insertLinebreak();
        expect(model.value.text).to.be('\n');
      });

    });

    describe('#clear()', () => {

      it('should clear all of the content cells', () => {
        Widget.attach(chatbox, document.body);
        chatbox.prompt.model.value.text = 'An entry';
        chatbox.post();
        expect(chatbox.widgets.length).to.be.greaterThan(0);
        chatbox.clear();
        expect(chatbox.widgets.length).to.be(0);
        expect(chatbox.prompt.model.value.text).to.be('');
      });

    });

    describe('#dispose()', () => {

      it('should dispose the content widget', () => {
        Widget.attach(chatbox, document.body);
        expect(chatbox.isDisposed).to.be(false);
        chatbox.dispose();
        expect(chatbox.isDisposed).to.be(true);
      });

      it('should be safe to dispose multiple times', () => {
        Widget.attach(chatbox, document.body);
        expect(chatbox.isDisposed).to.be(false);
        chatbox.dispose();
        chatbox.dispose();
        expect(chatbox.isDisposed).to.be(true);
      });

    });

    describe('#onActivateRequest()', () => {

      it('should focus the prompt editor', done => {
        expect(chatbox.prompt).to.not.be.ok();
        Widget.attach(chatbox, document.body);
        requestAnimationFrame(() => {
          chatbox.activate();
          requestAnimationFrame(() => {
            expect(chatbox.prompt.editor.hasFocus()).to.be(true);
            done();
          });
        });
      });

    });

    describe('#onAfterAttach()', () => {

      it('should be called after attach, creating a prompt', () => {
        expect(chatbox.prompt).to.not.be.ok();
        Widget.attach(chatbox, document.body);
        expect(chatbox.prompt).to.be.ok();
      });

    });

  });

});
