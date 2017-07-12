// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Contents, ContentsManager, Drive, ServerConnection
} from '../../../lib';

import {
  DEFAULT_FILE, RequestHandler, serverSettings, expectFailure, expectAjaxError
} from '../utils';


let DEFAULT_DIR: Contents.IModel = {
  name: 'bar',
  path: 'foo/bar',
  type: 'directory',
  created: 'yesterday',
  last_modified: 'today',
  writable: false,
  mimetype: '',
  content: [
    { name: 'buzz.txt', path: 'foo/bar/buzz.txt'},
    { name: 'bazz.py', path: 'foo/bar/bazz.py'}
  ],
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
        defaultDrive: new Drive()
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

    it('should include the full path for additional drives', (done) => {
      let contents = new ContentsManager();
      contents.addDrive(new Drive({ name: 'other' }));
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_FILE);
      });
      contents.fileChanged.connect((sender, args) => {
        expect(args.newValue.path).to.be('other:'+DEFAULT_FILE.path);
        done();
      });
      contents.newUntitled({ path: 'other:' }).catch(done);
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

  describe('#addDrive()', () => {

    it('should add a new drive to the manager', (done) => {
      let contents = new ContentsManager();
      contents.addDrive(new Drive({ name: 'other' }));
      let handler = new RequestHandler(() => {
        handler.respond(200, DEFAULT_FILE);
      });
      contents.get('other:').then( () => {
        done();
      });
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
        expect(model.path).to.be('foo');
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
        expect(model.content[0].path).to.be(DEFAULT_DIR.content[0].path);
        done();
      });
    });

    it('should get a file from an additional drive', (done) => {
      let contents = new ContentsManager();
      contents.addDrive(new Drive({ name: 'other' }));
      let handler = new RequestHandler(() => {
        handler.respond(200, DEFAULT_FILE);
      });
      let options: Contents.IFetchOptions = { type: 'file' };
      let get = contents.get('other:/foo', options);
      get.then(model => {
        expect(model.path).to.be('other:foo');
        done();
      });
    });

    it('should get a directory from an additional drive', (done) => {
      let contents = new ContentsManager();
      contents.addDrive(new Drive({ name: 'other' }));
      let handler = new RequestHandler(() => {
        handler.respond(200, DEFAULT_DIR);
      });
      let options: Contents.IFetchOptions = { type: 'directory' };
      let get = contents.get('other:/foo', options);
      get.then(model => {
        console.error(model.content[0].path)
        expect(model.content[0].path).to.be('other:foo/bar/buzz.txt');
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

    let settings = ServerConnection.makeSettings({
      baseUrl: 'http://foo'
    });

    it('should get the url of a file', () => {
      let drive = new Drive({ serverSettings: settings });
      let contents = new ContentsManager({ defaultDrive: drive });
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
      let drive = new Drive({ serverSettings: settings });
      let contents = new ContentsManager({ defaultDrive: drive });
      return contents.getDownloadUrl('b ar?3.txt').then(url => {
        expect(url).to.be('http://foo/files/b%20ar%3F3.txt');
      });
    });

    it('should not handle relative paths', () => {
      let drive = new Drive({ serverSettings: settings });
      let contents = new ContentsManager({ defaultDrive: drive });
      return contents.getDownloadUrl('fizz/../bar.txt').then(url => {
        expect(url).to.be('http://foo/files/fizz/../bar.txt');
      });
    });

    it('should get the url of a file from an additional drive', () => {
      let contents = new ContentsManager();
      let other = new Drive({ name: 'other', serverSettings: settings });
      contents.addDrive(other);
      let test1 = contents.getDownloadUrl('other:bar.txt');
      let test2 = contents.getDownloadUrl('other:fizz/buzz/bar.txt');
      let test3 = contents.getDownloadUrl('other:/bar.txt');
      return Promise.all([test1, test2, test3]).then(urls => {
        expect(urls[0]).to.be('http://foo/files/bar.txt');
        expect(urls[1]).to.be('http://foo/files/fizz/buzz/bar.txt');
        expect(urls[2]).to.be('http://foo/files/bar.txt');
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
        expect(model.path).to.be('foo/test');
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
        expect(model.content[0].path).to.be(DEFAULT_DIR.content[0].path);
        done();
      });
    });

    it('should create a file on an additional drive', (done) => {
      let contents = new ContentsManager();
      let other = new Drive({ name: 'other' });
      contents.addDrive(other);
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_FILE);
      });
      contents.newUntitled({ path: 'other:/foo' }).then(model => {
        expect(model.path).to.be('other:foo/test');
        done();
      });
    });

    it('should create a directory on an additional drive', (done) => {
      let contents = new ContentsManager();
      let other = new Drive({ name: 'other' });
      contents.addDrive(other);
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_DIR);
      });
      let options: Contents.ICreateOptions = {
        path: 'other:/foo',
        type: 'directory'
      };
      let newDir = contents.newUntitled(options);
      newDir.then(model => {
        expect(model.path).to.be('other:'+DEFAULT_DIR.path);
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
      contents.newUntitled({ type: 'file', ext: 'test' }).catch(done);
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

    it('should delete a file on an additional drive', (done) => {
      let contents = new ContentsManager();
      let other = new Drive({ name: 'other' });
      contents.addDrive(other);
      let handler = new RequestHandler(() => {
        handler.respond(204, { });
      });
      contents.delete('other:/foo/bar.txt').then(() => {
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

    it('should rename a file on an additional drive', (done) => {
      let contents = new ContentsManager();
      let other = new Drive({ name: 'other' });
      contents.addDrive(other);
      let handler = new RequestHandler(() => {
        handler.respond(200, DEFAULT_FILE);
      });
      let rename = contents.rename('other:/foo/bar.txt', 'other:/foo/baz.txt');
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

    it('should save a file on an additional drive', (done) => {
      let contents = new ContentsManager();
      let other = new Drive({ name: 'other' });
      contents.addDrive(other);
      let handler = new RequestHandler(() => {
        handler.respond(200, DEFAULT_FILE);
      });
      let save = contents.save('other:/foo', { type: 'file', name: 'test' });
      save.then(model => {
        expect(model.path).to.be('other:foo');
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

    it('should copy a file on an additional drive', (done) => {
      let contents = new ContentsManager();
      let other = new Drive({ name: 'other' });
      contents.addDrive(other);
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_FILE);
      });
      contents.copy('other:/foo/test', 'other:/baz').then(model => {
        expect(model.path).to.be('other:foo/test');
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

    it('should create a checkpoint on an additional drive', (done) => {
      let contents = new ContentsManager();
      let other = new Drive({ name: 'other' });
      contents.addDrive(other);
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_CP);
      });
      let checkpoint = contents.createCheckpoint('other:/foo/bar.txt');
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

    it('should list the checkpoints on an additional drive', (done) => {
      let contents = new ContentsManager();
      let other = new Drive({ name: 'other' });
      contents.addDrive(other);
      let handler = new RequestHandler(() => {
        handler.respond(200, [DEFAULT_CP, DEFAULT_CP]);
      });
      let checkpoints = contents.listCheckpoints('other:/foo/bar.txt');
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

    it('should restore a checkpoint', (done) => {
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

    it('should restore a checkpoint on an additional drive', (done) => {
      let contents = new ContentsManager();
      let other = new Drive({ name: 'other' });
      contents.addDrive(other);
      let handler = new RequestHandler(() => {
        handler.respond(204, { });
      });
      let checkpoint = contents.restoreCheckpoint('other:/foo/bar.txt',
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

    it('should delete a checkpoint on an additional drive', (done) => {
      let contents = new ContentsManager();
      let other = new Drive({ name: 'other' });
      contents.addDrive(other);
      let handler = new RequestHandler(() => {
        handler.respond(204, { });
      });
      contents.deleteCheckpoint('other:/foo/bar.txt', DEFAULT_CP.id)
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


describe('drive', () => {

  describe('#constructor()', () => {

    it('should accept no options', () => {
      let drive = new Drive();
      expect(drive).to.be.a(Drive);
    });

    it('should accept options', () => {
      let drive = new Drive({
        name: 'name'
      });
      expect(drive).to.be.a(Drive);
    });

  });

  describe('#name', () => {
    it('should return the name of the drive', () => {
      let drive = new Drive({
        name: 'name'
      });
      expect(drive.name).to.be('name');
    });

  });

  describe('#fileChanged', () => {

    it('should be emitted when a file changes', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_FILE);
      });
      drive.fileChanged.connect((sender, args) => {
        expect(sender).to.be(drive);
        expect(args.type).to.be('new');
        expect(args.oldValue).to.be(null);
        expect(args.newValue.path).to.be(DEFAULT_FILE.path);
        done();
      });
      drive.newUntitled().catch(done);
    });

  });

  describe('#isDisposed', () => {

    it('should test whether the drive is disposed', () => {
      let drive = new Drive();
      expect(drive.isDisposed).to.be(false);
      drive.dispose();
      expect(drive.isDisposed).to.be(true);
    });

  });

  describe('#dispose()', () => {

    it('should dispose of the resources used by the drive', () => {
      let drive = new Drive();
      expect(drive.isDisposed).to.be(false);
      drive.dispose();
      expect(drive.isDisposed).to.be(true);
      drive.dispose();
      expect(drive.isDisposed).to.be(true);
    });

  });

  describe('#get()', () => {

    it('should get a file', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(200, DEFAULT_FILE);
      });
      let options: Contents.IFetchOptions = { type: 'file' };
      let get = drive.get('/foo', options);
      get.then(model => {
        expect(model.path).to.be(DEFAULT_FILE.path);
        done();
      });
    });

    it('should get a directory', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(200, DEFAULT_DIR);
      });
      let options: Contents.IFetchOptions = { type: 'directory' };
      let get = drive.get('/foo', options);
      get.then(model => {
        expect(model.content[0].path).to.be(DEFAULT_DIR.content[0].path);
        done();
      });
    });

    it('should accept server settings', (done) => {
      let drive = new Drive({ serverSettings });
      let handler = new RequestHandler(() => {
        handler.respond(200, DEFAULT_DIR);
      });
      let options: Contents.IFetchOptions = { type: 'directory' };
      let get = drive.get('/foo', options);
      get.then(model => {
        expect(model.content[0].path).to.be(DEFAULT_DIR.content[0].path);
        done();
      });
    });

    it('should fail for an incorrect response', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_DIR);
      });
      let get = drive.get('/foo');
      expectAjaxError(get, done, 'Invalid Status: 201');
    });

  });

  describe('#getDownloadUrl()', () => {

    let settings = ServerConnection.makeSettings({
      baseUrl: 'http://foo'
    });

    it('should get the url of a file', () => {
      let drive = new Drive({ serverSettings: settings });
      let test1 = drive.getDownloadUrl('bar.txt');
      let test2 = drive.getDownloadUrl('fizz/buzz/bar.txt');
      let test3 = drive.getDownloadUrl('/bar.txt');
      return Promise.all([test1, test2, test3]).then(urls => {
        expect(urls[0]).to.be('http://foo/files/bar.txt');
        expect(urls[1]).to.be('http://foo/files/fizz/buzz/bar.txt');
        expect(urls[2]).to.be('http://foo/files/bar.txt');
      });
    });

    it('should encode characters', () => {
      let drive = new Drive({ serverSettings: settings });
      return drive.getDownloadUrl('b ar?3.txt').then(url => {
        expect(url).to.be('http://foo/files/b%20ar%3F3.txt');
      });
    });

    it('should not handle relative paths', () => {
      let drive = new Drive({ serverSettings: settings });
      return drive.getDownloadUrl('fizz/../bar.txt').then(url => {
        expect(url).to.be('http://foo/files/fizz/../bar.txt');
      });
    });

  });

  describe('#newUntitled()', () => {

    it('should create a file', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_FILE);
      });
      drive.newUntitled({ path: '/foo' }).then(model => {
        expect(model.path).to.be(DEFAULT_FILE.path);
        done();
      });
    });

    it('should create a directory', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_DIR);
      });
      let options: Contents.ICreateOptions = {
        path: '/foo',
        type: 'directory'
      };
      let newDir = drive.newUntitled(options);
      newDir.then(model => {
        expect(model.content[0].path).to.be(DEFAULT_DIR.content[0].path);
        done();
      });
    });

    it('should emit the fileChanged signal', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_FILE);
      });
      drive.fileChanged.connect((sender, args) => {
        expect(args.type).to.be('new');
        expect(args.oldValue).to.be(null);
        expect(args.newValue.path).to.be(DEFAULT_FILE.path);
        done();
      });
      drive.newUntitled({ type: 'file', ext: 'test' }).catch(done);
    });

    it('should accept server settings', (done) => {
      let drive = new Drive({ serverSettings });
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_DIR);
      });
      let options: Contents.ICreateOptions = {
        path: '/foo',
        type: 'file',
        ext: 'txt'
      };
      drive.newUntitled(options).then(model => {
        expect(model.content[0].path).to.be(DEFAULT_DIR.content[0].path);
        done();
      });
    });

    it('should fail for an incorrect model', (done) => {
      let drive = new Drive();
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
      let newFile = drive.newUntitled(options);
      expectFailure(newFile, done);
    });

    it('should fail for an incorrect response', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(200, DEFAULT_DIR);
      });
      let newDir = drive.newUntitled();
      expectAjaxError(newDir, done, 'Invalid Status: 200');
    });

  });

  describe('#delete()', () => {

    it('should delete a file', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(204, { });
      });
      drive.delete('/foo/bar.txt').then(() => {
        done();
      });
    });

    it('should emit the fileChanged signal', (done) => {
      let drive = new Drive();
      let path = '/foo/bar.txt';
      let handler = new RequestHandler(() => {
        handler.respond(204, { path });
      });
      drive.fileChanged.connect((sender, args) => {
        expect(args.type).to.be('delete');
        expect(args.oldValue.path).to.be(path);
        done();
      });
      drive.delete(path).catch(done);
    });

    it('should accept server settings', (done) => {
      let drive = new Drive({ serverSettings });
      let handler = new RequestHandler(() => {
        handler.respond(204, { });
      });
      drive.delete('/foo/bar.txt').then(() => {
        done();
      });
    });

    it('should fail for an incorrect response', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(200, { });
      });
      let del = drive.delete('/foo/bar.txt');
      expectAjaxError(del, done, 'Invalid Status: 200');
    });

    it('should throw a specific error', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(400, { });
      });
      let del = drive.delete('/foo/');
      expectFailure(del, done, '');
    });

    it('should throw a general error', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(500, { });
      });
      let del = drive.delete('/foo/');
      expectFailure(del, done, '');
    });

  });

  describe('#rename()', () => {

    it('should rename a file', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(200, DEFAULT_FILE);
      });
      let rename = drive.rename('/foo/bar.txt', '/foo/baz.txt');
      rename.then(model => {
        expect(model.created).to.be(DEFAULT_FILE.created);
        done();
      });
    });

    it('should emit the fileChanged signal', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(200, DEFAULT_FILE);
      });
      drive.fileChanged.connect((sender, args) => {
        expect(args.type).to.be('rename');
        expect(args.oldValue.path).to.be('/foo/bar.txt');
        expect(args.newValue.path).to.be(DEFAULT_FILE.path);
        done();
      });
      drive.rename('/foo/bar.txt', '/foo/baz.txt').catch(done);
    });

    it('should accept server settings', (done) => {
      let drive = new Drive({ serverSettings });
      let handler = new RequestHandler(() => {
        handler.respond(200, DEFAULT_FILE);
      });
      let rename = drive.rename('/foo/bar.txt', '/foo/baz.txt');
      rename.then(model => {
        expect(model.created).to.be(DEFAULT_FILE.created);
        done();
      });
    });

    it('should fail for an incorrect model', (done) => {
      let drive = new Drive();
      let dir = JSON.parse(JSON.stringify(DEFAULT_FILE));
      delete dir.path;
      let handler = new RequestHandler(() => {
        handler.respond(200, dir);
      });
      let rename = drive.rename('/foo/bar.txt', '/foo/baz.txt');
      expectFailure(rename, done);
    });

    it('should fail for an incorrect response', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_FILE);
      });
      let rename = drive.rename('/foo/bar.txt', '/foo/baz.txt');
      expectAjaxError(rename, done, 'Invalid Status: 201');
    });

  });

  describe('#save()', () => {

    it('should save a file', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(200, DEFAULT_FILE);
      });
      let save = drive.save('/foo', { type: 'file', name: 'test' });
      save.then(model => {
        expect(model.created).to.be(DEFAULT_FILE.created);
        done();
      });
    });

    it('should create a new file', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_FILE);
      });
      let save = drive.save('/foo', { type: 'file', name: 'test' });
      save.then(model => {
        expect(model.created).to.be(DEFAULT_FILE.created);
        done();
      });
    });

    it('should emit the fileChanged signal', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_FILE);
      });
      drive.fileChanged.connect((sender, args) => {
        expect(args.type).to.be('save');
        expect(args.oldValue).to.be(null);
        expect(args.newValue.path).to.be(DEFAULT_FILE.path);
        done();
      });
      drive.save('/foo', { type: 'file', name: 'test' }).catch(done);
    });

    it('should accept server settings', (done) => {
      let drive = new Drive({ serverSettings });
      let handler = new RequestHandler(() => {
        handler.respond(200, DEFAULT_FILE);
      });
      let save = drive.save('/foo', { type: 'file', name: 'test' });
      save.then(model => {
        expect(model.created).to.be(DEFAULT_FILE.created);
        done();
      });
    });

    it('should fail for an incorrect model', (done) => {
      let drive = new Drive();
      let file = JSON.parse(JSON.stringify(DEFAULT_FILE));
      delete file.format;
      let handler = new RequestHandler(() => {
        handler.respond(200, file);
      });
      let save = drive.save('/foo', { type: 'file', name: 'test' });
      expectFailure(save, done);
    });

    it('should fail for an incorrect response', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(204, DEFAULT_FILE);
      });
      let save = drive.save('/foo', { type: 'file', name: 'test' });
      expectAjaxError(save, done, 'Invalid Status: 204');
    });

  });

  describe('#copy()', () => {

    it('should copy a file', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_FILE);
      });
      drive.copy('/foo/bar.txt', '/baz').then(model => {
        expect(model.created).to.be(DEFAULT_FILE.created);
        done();
      });
    });

    it('should emit the fileChanged signal', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_FILE);
      });
      drive.fileChanged.connect((sender, args) => {
        expect(args.type).to.be('new');
        expect(args.oldValue).to.be(null);
        expect(args.newValue.path).to.be(DEFAULT_FILE.path);
        done();
      });
      drive.copy('/foo/bar.txt', '/baz').catch(done);
    });

    it('should accept server settings', (done) => {
      let drive = new Drive({ serverSettings });
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_FILE);
      });
      drive.copy('/foo/bar.txt', '/baz').then(model => {
        expect(model.created).to.be(DEFAULT_FILE.created);
        done();
      });
    });

    it('should fail for an incorrect model', (done) => {
      let drive = new Drive();
      let file = JSON.parse(JSON.stringify(DEFAULT_FILE));
      delete file.type;
      let handler = new RequestHandler(() => {
        handler.respond(201, file);
      });
      let copy = drive.copy('/foo/bar.txt', '/baz');
      expectFailure(copy, done);
    });

    it('should fail for an incorrect response', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(200, DEFAULT_FILE);
      });
      let copy = drive.copy('/foo/bar.txt', '/baz');
      expectAjaxError(copy, done, 'Invalid Status: 200');
    });

  });

  describe('#createCheckpoint()', () => {

    it('should create a checkpoint', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_CP);
      });
      let checkpoint = drive.createCheckpoint('/foo/bar.txt');
      checkpoint.then(model => {
        expect(model.last_modified).to.be(DEFAULT_CP.last_modified);
        done();
      });
    });

    it('should accept server settings', (done) => {
      let drive = new Drive({ serverSettings });
      let handler = new RequestHandler(() => {
        handler.respond(201, DEFAULT_CP);
      });
      let checkpoint = drive.createCheckpoint('/foo/bar.txt');
      checkpoint.then(model => {
        expect(model.last_modified).to.be(DEFAULT_CP.last_modified);
        done();
      });
    });

    it('should fail for an incorrect model', (done) => {
      let drive = new Drive();
      let cp = JSON.parse(JSON.stringify(DEFAULT_CP));
      delete cp.last_modified;
      let handler = new RequestHandler(() => {
        handler.respond(201, cp);
      });
      let checkpoint = drive.createCheckpoint('/foo/bar.txt');
      expectFailure(checkpoint, done);
    });

    it('should fail for an incorrect response', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(200, DEFAULT_CP);
      });
      let checkpoint = drive.createCheckpoint('/foo/bar.txt');
      expectAjaxError(checkpoint, done, 'Invalid Status: 200');
    });

  });

  describe('#listCheckpoints()', () => {

    it('should list the checkpoints', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(200, [DEFAULT_CP, DEFAULT_CP]);
      });
      let checkpoints = drive.listCheckpoints('/foo/bar.txt');
      checkpoints.then(models => {
        expect(models[0].last_modified).to.be(DEFAULT_CP.last_modified);
        done();
      });
    });

    it('should accept server settings', (done) => {
      let drive = new Drive({ serverSettings });
      let handler = new RequestHandler(() => {
        handler.respond(200, [DEFAULT_CP, DEFAULT_CP]);
      });
      let checkpoints = drive.listCheckpoints('/foo/bar.txt');
      checkpoints.then(models => {
        expect(models[0].last_modified).to.be(DEFAULT_CP.last_modified);
        done();
      });
    });

    it('should fail for an incorrect model', (done) => {
      let drive = new Drive();
      let cp = JSON.parse(JSON.stringify(DEFAULT_CP));
      delete cp.id;
      let handler = new RequestHandler(() => {
        handler.respond(200, [cp, DEFAULT_CP]);
      });
      let checkpoints = drive.listCheckpoints('/foo/bar.txt');
      let second = () => {
        handler.onRequest = () => {
          handler.respond(200, DEFAULT_CP);
        };
        let newCheckpoints = drive.listCheckpoints('/foo/bar.txt');
        expectAjaxError(newCheckpoints, done, 'Invalid Checkpoint list');
      };

      expectFailure(checkpoints, second);
    });

    it('should fail for an incorrect response', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(201, { });
      });
      let checkpoints = drive.listCheckpoints('/foo/bar.txt');
      expectAjaxError(checkpoints, done, 'Invalid Status: 201');
    });

  });

  describe('#restoreCheckpoint()', () => {

    it('should restore a checkpoint', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(204, { });
      });
      let checkpoint = drive.restoreCheckpoint('/foo/bar.txt',
                                                  DEFAULT_CP.id);
      checkpoint.then(() => {
        done();
      });
    });

    it('should accept server settings', (done) => {
      let drive = new Drive({ serverSettings });
      let handler = new RequestHandler(() => {
        handler.respond(204, { });
      });
      let checkpoint = drive.restoreCheckpoint('/foo/bar.txt',
                                                  DEFAULT_CP.id);
      checkpoint.then(() => {
        done();
      });
    });

    it('should fail for an incorrect response', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(200, { });
      });
      let checkpoint = drive.restoreCheckpoint('/foo/bar.txt',
                                                  DEFAULT_CP.id);
      expectAjaxError(checkpoint, done, 'Invalid Status: 200');
    });

  });

  describe('#deleteCheckpoint()', () => {

    it('should delete a checkpoint', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(204, { });
      });
      drive.deleteCheckpoint('/foo/bar.txt', DEFAULT_CP.id)
      .then(() => { done(); });
    });

    it('should accept server settings', (done) => {
      let drive = new Drive({ serverSettings });
      let handler = new RequestHandler(() => {
        handler.respond(204, { });
      });
      drive.deleteCheckpoint('/foo/bar.txt', DEFAULT_CP.id)
      .then(() => { done(); });
    });

    it('should fail for an incorrect response', (done) => {
      let drive = new Drive();
      let handler = new RequestHandler(() => {
        handler.respond(200, { });
      });
      let checkpoint = drive.deleteCheckpoint('/foo/bar.txt',
                                                  DEFAULT_CP.id);
      expectAjaxError(checkpoint, done, 'Invalid Status: 200');
    });

  });

});
