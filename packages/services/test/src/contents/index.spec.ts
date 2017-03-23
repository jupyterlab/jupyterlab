// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Contents, ContentsManager
} from '../../../lib/contents';

import {
  DEFAULT_FILE, RequestHandler, ajaxSettings, expectFailure, expectAjaxError
} from '../utils';


let DEFAULT_DIR: Contents.IModel = {
  name: 'bar',
  path: '/foo/bar',
  type: 'file',
  created: 'yesterday',
  last_modified: 'today',
  writable: false,
  mimetype: '',
  content: '["buzz.txt", "bazz.py"]',
  format: 'json'
};

let DEFAULT_CP: Contents.ICheckpointModel = {
  id: '1234',
  last_modified: 'yesterday'
};


describe('contents', () => {

  describe('#constructor()', () => {

    it('should accept no options', () => {
      let contents = new ContentsManager();
      expect(contents).to.be.a(ContentsManager);
    });

    it('should accept options', () => {
      let contents = new ContentsManager({
        baseUrl: 'foo',
        ajaxSettings: {}
      });
      expect(contents).to.be.a(ContentsManager);
    });

  });

  describe('#fileChanged', () => {

    it('should be emitted when a file changes', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_FILE);
      });
      contents.fileChanged.connect((sender, args) => {
        expect(sender).to.be(contents);
        expect(args.type).to.be('new');
        expect(args.oldValue).to.be(null);
        expect(args.newValue.path).to.be(DEFAULT_FILE.path);
        done();
      });
      contents.newUntitled().catch(done);
    });

  });

  describe('#isDisposed', () => {

    it('should test whether the manager is disposed', () => {
      let contents = new ContentsManager();
      expect(contents.isDisposed).to.be(false);
      contents.dispose();
      expect(contents.isDisposed).to.be(true);
    });

  });

  describe('#dispose()', () => {

    it('should dispose of the resources used by the manager', () => {
      let contents = new ContentsManager();
      expect(contents.isDisposed).to.be(false);
      contents.dispose();
      expect(contents.isDisposed).to.be(true);
      contents.dispose();
      expect(contents.isDisposed).to.be(true);
    });

  });

  describe('#get()', () => {

    it('should get a file', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(200, DEFAULT_FILE);
      });
      let options: Contents.IFetchOptions = { type: 'file' };
      let get = contents.get('/foo', options);
      get.then(model => {
        expect(model.path).to.be(DEFAULT_FILE.path);
        done();
      });
    });

    it('should get a directory', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(200, DEFAULT_DIR);
      });
      let options: Contents.IFetchOptions = { type: 'directory' };
      let get = contents.get('/foo', options);
      get.then(model => {
        expect(model.content).to.be(DEFAULT_DIR.content);
        done();
      });
    });

    it('should accept ajax options', (done) => {
      let contents = new ContentsManager({ ajaxSettings });
      let handler = new RequestHandler(() => {
        handler.respond(200, DEFAULT_DIR);
      });
      let options: Contents.IFetchOptions = { type: 'directory' };
      let get = contents.get('/foo', options);
      get.then(model => {
        expect(model.content).to.be(DEFAULT_DIR.content);
        done();
      });
    });

    it('should fail for an incorrect response', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_DIR);
      });
      let get = contents.get('/foo');
      expectAjaxError(get, done, 'Invalid Status: 201');
    });

  });

  describe('#getDownloadUrl()', () => {

    it('should get the url of a file', () => {
      let contents = new ContentsManager({ baseUrl: 'http://foo', });
      let test1 = contents.getDownloadUrl('bar.txt');
      let test2 = contents.getDownloadUrl('fizz/buzz/bar.txt');
      let test3 = contents.getDownloadUrl('/bar.txt');
      return Promise.all([test1, test2, test3]).then(urls => {
        expect(urls[0]).to.be('http://foo/files/bar.txt');
        expect(urls[1]).to.be('http://foo/files/fizz/buzz/bar.txt');
        expect(urls[2]).to.be('http://foo/files/bar.txt');
      });
    });

    it('should encode characters', () => {
      let contents = new ContentsManager({ baseUrl: 'http://foo', });
      return contents.getDownloadUrl('b ar?3.txt').then(url => {
        expect(url).to.be('http://foo/files/b%20ar%3F3.txt');
      });
    });

    it('should not handle relative paths', () => {
      let contents = new ContentsManager({ baseUrl: 'http://foo', });
      return contents.getDownloadUrl('fizz/../bar.txt').then(url => {
        expect(url).to.be('http://foo/files/fizz/../bar.txt');
      });
    });

  });

  describe('#newUntitled()', () => {

    it('should create a file', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_FILE);
      });
      contents.newUntitled({ path: '/foo' }).then(model => {
        expect(model.path).to.be(DEFAULT_FILE.path);
        done();
      });
    });

    it('should create a directory', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_DIR);
      });
      let options: Contents.ICreateOptions = {
        path: '/foo',
        type: 'directory'
      };
      let newDir = contents.newUntitled(options);
      newDir.then(model => {
        expect(model.content).to.be(DEFAULT_DIR.content);
        done();
      });
    });

    it('should emit the fileChanged signal', () => {

    });

    it('should accept ajax options', (done) => {
      let contents = new ContentsManager({ ajaxSettings });
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_DIR);
      });
      let options: Contents.ICreateOptions = {
        path: '/foo',
        type: 'file',
        ext: 'txt'
      };
      contents.newUntitled(options).then(model => {
        expect(model.content).to.be(DEFAULT_DIR.content);
        done();
      });
    });

    it('should fail for an incorrect model', (done) => {
      let contents = new ContentsManager();
      let dir = JSON.parse(JSON.stringify(DEFAULT_DIR));
      dir.name = 1;
      let handler = new RequestHandler(() => {
        handler.respond(201, dir);
      });
      let options: Contents.ICreateOptions = {
        path: '/foo',
        type: 'file',
        ext: 'py'
      };
      let newFile = contents.newUntitled(options);
      expectFailure(newFile, done);
    });

    it('should fail for an incorrect response', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(200, DEFAULT_DIR);
      });
      let newDir = contents.newUntitled();
      expectAjaxError(newDir, done, 'Invalid Status: 200');
    });

  });

  describe('#delete()', () => {

    it('should delete a file', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(204, { });
      });
      contents.delete('/foo/bar.txt').then(() => {
        done();
      });
    });

    it('should emit the fileChanged signal', (done) => {
      let contents = new ContentsManager();
      let path = '/foo/bar.txt';
      let handler = new RequestHandler(() => {
        handler.respond(204, { path });
      });
      contents.fileChanged.connect((sender, args) => {
        expect(args.type).to.be('delete');
        expect(args.oldValue.path).to.be(path);
        done();
      });
      contents.delete(path).catch(done);
    });

    it('should accept ajax options', (done) => {
      let contents = new ContentsManager({ ajaxSettings });
      let handler = new RequestHandler(() => {
        handler.respond(204, { });
      });
      contents.delete('/foo/bar.txt').then(() => {
        done();
      });
    });

    it('should fail for an incorrect response', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(200, { });
      });
      let del = contents.delete('/foo/bar.txt');
      expectAjaxError(del, done, 'Invalid Status: 200');
    });

    it('should throw a specific error', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(400, { });
      });
      let del = contents.delete('/foo/');
      expectFailure(del, done, '');
    });

    it('should throw a general error', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(500, { });
      });
      let del = contents.delete('/foo/');
      expectFailure(del, done, '');
    });

  });

  describe('#rename()', () => {

    it('should rename a file', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(200, DEFAULT_FILE);
      });
      let rename = contents.rename('/foo/bar.txt', '/foo/baz.txt');
      rename.then(model => {
        expect(model.created).to.be(DEFAULT_FILE.created);
        done();
      });
    });

    it('should emit the fileChanged signal', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(200, DEFAULT_FILE);
      });
      contents.fileChanged.connect((sender, args) => {
        expect(args.type).to.be('rename');
        expect(args.oldValue.path).to.be('/foo/bar.txt');
        expect(args.newValue.path).to.be(DEFAULT_FILE.path);
        done();
      });
      contents.rename('/foo/bar.txt', '/foo/baz.txt').catch(done);
    });

    it('should accept ajax options', (done) => {
      let contents = new ContentsManager({ ajaxSettings });
      let handler = new RequestHandler(() => {
        handler.respond(200, DEFAULT_FILE);
      });
      let rename = contents.rename('/foo/bar.txt', '/foo/baz.txt');
      rename.then(model => {
        expect(model.created).to.be(DEFAULT_FILE.created);
        done();
      });
    });

    it('should fail for an incorrect model', (done) => {
      let contents = new ContentsManager();
      let dir = JSON.parse(JSON.stringify(DEFAULT_FILE));
      delete dir.path;
      let handler = new RequestHandler(() => {
        handler.respond(200, dir);
      });
      let rename = contents.rename('/foo/bar.txt', '/foo/baz.txt');
      expectFailure(rename, done);
    });

    it('should fail for an incorrect response', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_FILE);
      });
      let rename = contents.rename('/foo/bar.txt', '/foo/baz.txt');
      expectAjaxError(rename, done, 'Invalid Status: 201');
    });

  });

  describe('#save()', () => {

    it('should save a file', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(200, DEFAULT_FILE);
      });
      let save = contents.save('/foo', { type: 'file', name: 'test' });
      save.then(model => {
        expect(model.created).to.be(DEFAULT_FILE.created);
        done();
      });
    });

    it('should create a new file', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_FILE);
      });
      let save = contents.save('/foo', { type: 'file', name: 'test' });
      save.then(model => {
        expect(model.created).to.be(DEFAULT_FILE.created);
        done();
      });
    });

    it('should emit the fileChanged signal', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_FILE);
      });
      contents.fileChanged.connect((sender, args) => {
        expect(args.type).to.be('save');
        expect(args.oldValue).to.be(null);
        expect(args.newValue.path).to.be(DEFAULT_FILE.path);
        done();
      });
      contents.save('/foo', { type: 'file', name: 'test' }).catch(done);
    });

    it('should accept ajax options', (done) => {
      let contents = new ContentsManager({ ajaxSettings });
      let handler = new RequestHandler(() => {
        handler.respond(200, DEFAULT_FILE);
      });
      let save = contents.save('/foo', { type: 'file', name: 'test' });
      save.then(model => {
        expect(model.created).to.be(DEFAULT_FILE.created);
        done();
      });
    });

    it('should fail for an incorrect model', (done) => {
      let contents = new ContentsManager();
      let file = JSON.parse(JSON.stringify(DEFAULT_FILE));
      delete file.format;
      let handler = new RequestHandler(() => {
        handler.respond(200, file);
      });
      let save = contents.save('/foo', { type: 'file', name: 'test' });
      expectFailure(save, done);
    });

    it('should fail for an incorrect response', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(204, DEFAULT_FILE);
      });
      let save = contents.save('/foo', { type: 'file', name: 'test' });
      expectAjaxError(save, done, 'Invalid Status: 204');
    });

  });

  describe('#copy()', () => {

    it('should copy a file', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_FILE);
      });
      contents.copy('/foo/bar.txt', '/baz').then(model => {
        expect(model.created).to.be(DEFAULT_FILE.created);
        done();
      });
    });

    it('should emit the fileChanged signal', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_FILE);
      });
      contents.fileChanged.connect((sender, args) => {
        expect(args.type).to.be('new');
        expect(args.oldValue).to.be(null);
        expect(args.newValue.path).to.be(DEFAULT_FILE.path);
        done();
      });
      contents.copy('/foo/bar.txt', '/baz').catch(done);
    });

    it('should accept ajax options', (done) => {
      let contents = new ContentsManager({ ajaxSettings });
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_FILE);
      });
      contents.copy('/foo/bar.txt', '/baz').then(model => {
        expect(model.created).to.be(DEFAULT_FILE.created);
        done();
      });
    });

    it('should fail for an incorrect model', (done) => {
      let contents = new ContentsManager();
      let file = JSON.parse(JSON.stringify(DEFAULT_FILE));
      delete file.type;
      let handler = new RequestHandler(() => {
        handler.respond(201, file);
      });
      let copy = contents.copy('/foo/bar.txt', '/baz');
      expectFailure(copy, done);
    });

    it('should fail for an incorrect response', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(200, DEFAULT_FILE);
      });
      let copy = contents.copy('/foo/bar.txt', '/baz');
      expectAjaxError(copy, done, 'Invalid Status: 200');
    });

  });

  describe('#createCheckpoint()', () => {

    it('should create a checkpoint', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_CP);
      });
      let checkpoint = contents.createCheckpoint('/foo/bar.txt');
      checkpoint.then(model => {
        expect(model.last_modified).to.be(DEFAULT_CP.last_modified);
        done();
      });
    });

    it('should accept ajax options', (done) => {
      let contents = new ContentsManager({ ajaxSettings });
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_CP);
      });
      let checkpoint = contents.createCheckpoint('/foo/bar.txt');
      checkpoint.then(model => {
        expect(model.last_modified).to.be(DEFAULT_CP.last_modified);
        done();
      });
    });

    it('should fail for an incorrect model', (done) => {
      let contents = new ContentsManager();
      let cp = JSON.parse(JSON.stringify(DEFAULT_CP));
      delete cp.last_modified;
      let handler = new RequestHandler(() => {
        handler.respond(201, cp);
      });
      let checkpoint = contents.createCheckpoint('/foo/bar.txt');
      expectFailure(checkpoint, done);
    });

    it('should fail for an incorrect response', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(200, DEFAULT_CP);
      });
      let checkpoint = contents.createCheckpoint('/foo/bar.txt');
      expectAjaxError(checkpoint, done, 'Invalid Status: 200');
    });

  });

  describe('#listCheckpoints()', () => {

    it('should list the checkpoints', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(200, [DEFAULT_CP, DEFAULT_CP]);
      });
      let checkpoints = contents.listCheckpoints('/foo/bar.txt');
      checkpoints.then(models => {
        expect(models[0].last_modified).to.be(DEFAULT_CP.last_modified);
        done();
      });
    });

    it('should accept ajax options', (done) => {
      let contents = new ContentsManager({ ajaxSettings });
      let handler = new RequestHandler(() => {
        handler.respond(200, [DEFAULT_CP, DEFAULT_CP]);
      });
      let checkpoints = contents.listCheckpoints('/foo/bar.txt');
      checkpoints.then(models => {
        expect(models[0].last_modified).to.be(DEFAULT_CP.last_modified);
        done();
      });
    });

    it('should fail for an incorrect model', (done) => {
      let contents = new ContentsManager();
      let cp = JSON.parse(JSON.stringify(DEFAULT_CP));
      delete cp.id;
      let handler = new RequestHandler(() => {
        handler.respond(200, [cp, DEFAULT_CP]);
      });
      let checkpoints = contents.listCheckpoints('/foo/bar.txt');
      let second = () => {
        handler.onRequest = () => {
          handler.respond(200, DEFAULT_CP);
        };
        let newCheckpoints = contents.listCheckpoints('/foo/bar.txt');
        expectAjaxError(newCheckpoints, done, 'Invalid Checkpoint list');
      };

      expectFailure(checkpoints, second);
    });

    it('should fail for an incorrect response', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(201, { });
      });
      let checkpoints = contents.listCheckpoints('/foo/bar.txt');
      expectAjaxError(checkpoints, done, 'Invalid Status: 201');
    });

  });

  describe('#restoreCheckpoint()', () => {

    it('should create a checkpoint', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(204, { });
      });
      let checkpoint = contents.restoreCheckpoint('/foo/bar.txt',
                                                  DEFAULT_CP.id);
      checkpoint.then(() => {
        done();
      });
    });

    it('should accept ajax options', (done) => {
      let contents = new ContentsManager({ ajaxSettings });
      let handler = new RequestHandler(() => {
        handler.respond(204, { });
      });
      let checkpoint = contents.restoreCheckpoint('/foo/bar.txt',
                                                  DEFAULT_CP.id);
      checkpoint.then(() => {
        done();
      });
    });

    it('should fail for an incorrect response', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(200, { });
      });
      let checkpoint = contents.restoreCheckpoint('/foo/bar.txt',
                                                  DEFAULT_CP.id);
      expectAjaxError(checkpoint, done, 'Invalid Status: 200');
    });

  });

  describe('#deleteCheckpoint()', () => {

    it('should delete a checkpoint', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(204, { });
      });
      contents.deleteCheckpoint('/foo/bar.txt', DEFAULT_CP.id)
      .then(() => { done(); });
    });

    it('should accept ajax options', (done) => {
      let contents = new ContentsManager({ ajaxSettings });
      let handler = new RequestHandler(() => {
        handler.respond(204, { });
      });
      contents.deleteCheckpoint('/foo/bar.txt', DEFAULT_CP.id)
      .then(() => { done(); });
    });

    it('should fail for an incorrect response', (done) => {
      let contents = new ContentsManager();
      let handler = new RequestHandler(() => {
        handler.respond(200, { });
      });
      let checkpoint = contents.deleteCheckpoint('/foo/bar.txt',
                                                  DEFAULT_CP.id);
      expectAjaxError(checkpoint, done, 'Invalid Status: 200');
    });

  });

});
