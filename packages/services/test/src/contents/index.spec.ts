// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Contents, ContentsManager, Drive, ServerConnection
} from '../../../lib';

import {
  DEFAULT_FILE, makeSettings, expectFailure, handleRequest
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
      handleRequest(contents, 201, DEFAULT_FILE);
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
      let drive = new Drive({ name: 'other' });
      contents.addDrive(drive);
      handleRequest(drive, 201, DEFAULT_FILE);
      contents.fileChanged.connect((sender, args) => {
        expect(args.newValue.path).to.be('other:' + DEFAULT_FILE.path);
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

    it('should add a new drive to the manager', () => {
      let contents = new ContentsManager();
      contents.addDrive(new Drive({ name: 'other' }));
      handleRequest(contents, 200, DEFAULT_FILE);
      return contents.get('other:');
    });

  });

  describe('#localPath()', () => {

    it('should parse the local part of a path', () => {
      const contents = new ContentsManager();
      contents.addDrive(new Drive({ name: 'other' }));
      contents.addDrive(new Drive({ name: 'alternative' }));

      expect(contents.localPath('other:foo/bar/example.txt'))
      .to.be('foo/bar/example.txt');

      expect(contents.localPath('alternative:/foo/bar/example.txt'))
      .to.be('foo/bar/example.txt');
    });

    it('should allow the ":" character in other parts of the path', () => {
      const contents = new ContentsManager();
      contents.addDrive(new Drive({ name: 'other' }));

      expect(contents.localPath('other:foo/odd:directory/example:file.txt'))
      .to.be('foo/odd:directory/example:file.txt');
    });

    it('should leave alone names with ":" that are not drive names', () => {
      const contents = new ContentsManager();
      contents.addDrive(new Drive({ name: 'other' }));

      expect(contents.localPath('which:foo/odd:directory/example:file.txt'))
      .to.be('which:foo/odd:directory/example:file.txt');
    });

  });

  describe('.driveName()', () => {

    it('should parse the drive name a path', () => {
      const contents = new ContentsManager();
      contents.addDrive(new Drive({ name: 'other' }));
      contents.addDrive(new Drive({ name: 'alternative' }));

      expect(contents.driveName('other:foo/bar/example.txt'))
      .to.be('other');

      expect(contents.driveName('alternative:/foo/bar/example.txt'))
      .to.be('alternative');
    });

    it('should allow the ":" character in other parts of the path', () => {
      const contents = new ContentsManager();
      contents.addDrive(new Drive({ name: 'other' }));

      expect(contents.driveName('other:foo/odd:directory/example:file.txt'))
      .to.be('other');
    });

    it('should leave alone names with ":" that are not drive names', () => {
      const contents = new ContentsManager();
      contents.addDrive(new Drive({ name: 'other' }));

      expect(contents.driveName('which:foo/odd:directory/example:file.txt'))
      .to.be('');
    });

  });

  describe('#get()', () => {

    it('should get a file', () => {
      let contents = new ContentsManager();
      handleRequest(contents, 200, DEFAULT_FILE);
      let options: Contents.IFetchOptions = { type: 'file' };
      return contents.get('/foo', options).then(model => {
        expect(model.path).to.be('foo');
      });
    });

    it('should get a directory', () => {
      let contents = new ContentsManager();
      handleRequest(contents, 200, DEFAULT_DIR);
      let options: Contents.IFetchOptions = { type: 'directory' };
      return contents.get('/foo', options).then(model => {
        expect(model.content[0].path).to.be(DEFAULT_DIR.content[0].path);
      });
    });

    it('should get a file from an additional drive', () => {
      let contents = new ContentsManager();
      let drive = new Drive({ name: 'other' });
      contents.addDrive(drive);
      handleRequest(drive, 200, DEFAULT_FILE);
      let options: Contents.IFetchOptions = { type: 'file' };
      return contents.get('other:/foo', options).then(model => {
        expect(model.path).to.be('other:foo');
      });
    });

    it('should get a directory from an additional drive', () => {
      let contents = new ContentsManager();
      let drive = new Drive({ name: 'other' });
      contents.addDrive(drive);
      handleRequest(drive, 200, DEFAULT_DIR);
      let options: Contents.IFetchOptions = { type: 'directory' };
      return contents.get('other:/foo', options).then(model => {
        expect(model.content[0].path).to.be('other:foo/bar/buzz.txt');
      });
    });

    it('should fail for an incorrect response', (done) => {
      let contents = new ContentsManager();
      handleRequest(contents, 201, DEFAULT_DIR);
      let get = contents.get('/foo');
      expectFailure(get, done, 'Invalid response: 201 Created');
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

    it('should create a file', () => {
      let contents = new ContentsManager();
      handleRequest(contents, 201, DEFAULT_FILE);
      return contents.newUntitled({ path: '/foo' }).then(model => {
        expect(model.path).to.be('foo/test');
      });
    });

    it('should create a directory', () => {
      let contents = new ContentsManager();
      handleRequest(contents, 201, DEFAULT_DIR);
      let options: Contents.ICreateOptions = {
        path: '/foo',
        type: 'directory'
      };
      return contents.newUntitled(options).then(model => {
        expect(model.content[0].path).to.be(DEFAULT_DIR.content[0].path);
      });
    });

    it('should create a file on an additional drive', () => {
      let contents = new ContentsManager();
      let other = new Drive({ name: 'other' });
      contents.addDrive(other);
      handleRequest(other, 201, DEFAULT_FILE);
      return contents.newUntitled({ path: 'other:/foo' }).then(model => {
        expect(model.path).to.be('other:foo/test');
      });
    });

    it('should create a directory on an additional drive', () => {
      let contents = new ContentsManager();
      let other = new Drive({ name: 'other' });
      contents.addDrive(other);
      handleRequest(other, 201, DEFAULT_DIR);
      let options: Contents.ICreateOptions = {
        path: 'other:/foo',
        type: 'directory'
      };
      return contents.newUntitled(options).then(model => {
        expect(model.path).to.be('other:' + DEFAULT_DIR.path);
      });
    });

    it('should emit the fileChanged signal', (done) => {
      let contents = new ContentsManager();
      handleRequest(contents, 201, DEFAULT_FILE);
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
      handleRequest(contents, 201, dir);
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
      handleRequest(contents, 200, DEFAULT_DIR);
      let newDir = contents.newUntitled();
      expectFailure(newDir, done, 'Invalid response: 200 OK');
    });

  });

  describe('#delete()', () => {

    it('should delete a file', () => {
      let contents = new ContentsManager();
      handleRequest(contents, 204, { });
      return contents.delete('/foo/bar.txt');
    });

    it('should delete a file on an additional drive', () => {
      let contents = new ContentsManager();
      let other = new Drive({ name: 'other' });
      contents.addDrive(other);
      handleRequest(other, 204, {});
      return contents.delete('other:/foo/bar.txt');
    });

    it('should emit the fileChanged signal', (done) => {
      let contents = new ContentsManager();
      let path = '/foo/bar.txt';
      handleRequest(contents, 204, { path });
      contents.fileChanged.connect((sender, args) => {
        expect(args.type).to.be('delete');
        expect(args.oldValue.path).to.be('foo/bar.txt');
        done();
      });
      contents.delete(path).catch(done);
    });

    it('should fail for an incorrect response', (done) => {
      let contents = new ContentsManager();
      handleRequest(contents, 200, { });
      let del = contents.delete('/foo/bar.txt');
      expectFailure(del, done, 'Invalid response: 200 OK');
    });

    it('should throw a specific error', (done) => {
      let contents = new ContentsManager();
      handleRequest(contents, 400, { });
      let del = contents.delete('/foo/');
      expectFailure(del, done, '');
    });

    it('should throw a general error', (done) => {
      let contents = new ContentsManager();
      handleRequest(contents, 500, { });
      let del = contents.delete('/foo/');
      expectFailure(del, done, '');
    });

  });

  describe('#rename()', () => {

    it('should rename a file', () => {
      let contents = new ContentsManager();
      handleRequest(contents, 200, DEFAULT_FILE);
      let rename = contents.rename('/foo/bar.txt', '/foo/baz.txt');
      return rename.then(model => {
        expect(model.created).to.be(DEFAULT_FILE.created);
      });
    });

    it('should rename a file on an additional drive', () => {
      let contents = new ContentsManager();
      let other = new Drive({ name: 'other' });
      contents.addDrive(other);
      handleRequest(other, 200, DEFAULT_FILE);
      let rename = contents.rename('other:/foo/bar.txt', 'other:/foo/baz.txt');
      return rename.then(model => {
        expect(model.created).to.be(DEFAULT_FILE.created);
      });
    });

    it('should emit the fileChanged signal', (done) => {
      let contents = new ContentsManager();
      handleRequest(contents, 200, DEFAULT_FILE);
      contents.fileChanged.connect((sender, args) => {
        expect(args.type).to.be('rename');
        expect(args.oldValue.path).to.be('foo/bar.txt');
        expect(args.newValue.path).to.be('foo/test');
        done();
      });
      contents.rename('/foo/bar.txt', '/foo/baz.txt').catch(done);
    });

    it('should fail for an incorrect model', (done) => {
      let contents = new ContentsManager();
      let dir = JSON.parse(JSON.stringify(DEFAULT_FILE));
      delete dir.path;
      handleRequest(contents, 200, dir);
      let rename = contents.rename('/foo/bar.txt', '/foo/baz.txt');
      expectFailure(rename, done);
    });

    it('should fail for an incorrect response', (done) => {
      let contents = new ContentsManager();
      handleRequest(contents, 201, DEFAULT_FILE);
      let rename = contents.rename('/foo/bar.txt', '/foo/baz.txt');
      expectFailure(rename, done, 'Invalid response: 201 Created');
    });

  });

  describe('#save()', () => {

    it('should save a file', () => {
      let contents = new ContentsManager();
      handleRequest(contents, 200, DEFAULT_FILE);
      let save = contents.save('/foo', { type: 'file', name: 'test' });
      return save.then(model => {
        expect(model.created).to.be(DEFAULT_FILE.created);
      });
    });

    it('should save a file on an additional drive', () => {
      let contents = new ContentsManager();
      let other = new Drive({ name: 'other' });
      contents.addDrive(other);
      handleRequest(contents, 200, DEFAULT_FILE);
      let save = contents.save('other:/foo', { type: 'file', name: 'test' });
      return save.then(model => {
        expect(model.path).to.be('other:foo');
      });
    });

    it('should create a new file', () => {
      let contents = new ContentsManager();
      handleRequest(contents, 201, DEFAULT_FILE);
      let save = contents.save('/foo', { type: 'file', name: 'test' });
      return save.then(model => {
        expect(model.created).to.be(DEFAULT_FILE.created);
      });
    });

    it('should emit the fileChanged signal', (done) => {
      let contents = new ContentsManager();
      handleRequest(contents, 201, DEFAULT_FILE);
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
      handleRequest(contents, 200, file);
      let save = contents.save('/foo', { type: 'file', name: 'test' });
      expectFailure(save, done);
    });

    it('should fail for an incorrect response', (done) => {
      let contents = new ContentsManager();
      handleRequest(contents, 204, DEFAULT_FILE);
      let save = contents.save('/foo', { type: 'file', name: 'test' });
      expectFailure(save, done, 'Invalid response: 204 No Content');
    });

  });

  describe('#copy()', () => {

    it('should copy a file', () => {
      let contents = new ContentsManager();
      handleRequest(contents, 201, DEFAULT_FILE);
      return contents.copy('/foo/bar.txt', '/baz').then(model => {
        expect(model.created).to.be(DEFAULT_FILE.created);
      });
    });

    it('should copy a file on an additional drive', () => {
      let contents = new ContentsManager();
      let other = new Drive({ name: 'other' });
      contents.addDrive(other);
      handleRequest(other, 201, DEFAULT_FILE);
      return contents.copy('other:/foo/test', 'other:/baz').then(model => {
        expect(model.path).to.be('other:foo/test');
      });
    });

    it('should emit the fileChanged signal', (done) => {
      let contents = new ContentsManager();
      handleRequest(contents, 201, DEFAULT_FILE);
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
      handleRequest(contents, 201, file);
      let copy = contents.copy('/foo/bar.txt', '/baz');
      expectFailure(copy, done);
    });

    it('should fail for an incorrect response', (done) => {
      let contents = new ContentsManager();
      handleRequest(contents, 200, DEFAULT_FILE);
      let copy = contents.copy('/foo/bar.txt', '/baz');
      expectFailure(copy, done, 'Invalid response: 200 OK');
    });

  });

  describe('#createCheckpoint()', () => {

    it('should create a checkpoint', () => {
      let contents = new ContentsManager();
      handleRequest(contents, 201, DEFAULT_CP);
      let checkpoint = contents.createCheckpoint('/foo/bar.txt');
      return checkpoint.then(model => {
        expect(model.last_modified).to.be(DEFAULT_CP.last_modified);
      });
    });

    it('should create a checkpoint on an additional drive', () => {
      let contents = new ContentsManager();
      let other = new Drive({ name: 'other' });
      contents.addDrive(other);
      handleRequest(other, 201, DEFAULT_CP);
      let checkpoint = contents.createCheckpoint('other:/foo/bar.txt');
      return checkpoint.then(model => {
        expect(model.last_modified).to.be(DEFAULT_CP.last_modified);
      });
    });

    it('should fail for an incorrect model', (done) => {
      let contents = new ContentsManager();
      let cp = JSON.parse(JSON.stringify(DEFAULT_CP));
      delete cp.last_modified;
      handleRequest(contents, 201, cp);
      let checkpoint = contents.createCheckpoint('/foo/bar.txt');
      expectFailure(checkpoint, done);
    });

    it('should fail for an incorrect response', (done) => {
      let contents = new ContentsManager();
      handleRequest(contents, 200, DEFAULT_CP);
      let checkpoint = contents.createCheckpoint('/foo/bar.txt');
      expectFailure(checkpoint, done, 'Invalid response: 200 OK');
    });

  });

  describe('#listCheckpoints()', () => {

    it('should list the checkpoints', () => {
      let contents = new ContentsManager();
      handleRequest(contents, 200, [DEFAULT_CP, DEFAULT_CP]);
      let checkpoints = contents.listCheckpoints('/foo/bar.txt');
      return checkpoints.then(models => {
        expect(models[0].last_modified).to.be(DEFAULT_CP.last_modified);
      });
    });

    it('should list the checkpoints on an additional drive', () => {
      let contents = new ContentsManager();
      let other = new Drive({ name: 'other' });
      contents.addDrive(other);
      handleRequest(other, 200, [DEFAULT_CP, DEFAULT_CP]);
      let checkpoints = contents.listCheckpoints('other:/foo/bar.txt');
      return checkpoints.then(models => {
        expect(models[0].last_modified).to.be(DEFAULT_CP.last_modified);
      });
    });

    it('should fail for an incorrect model', (done) => {
      let contents = new ContentsManager();
      let cp = JSON.parse(JSON.stringify(DEFAULT_CP));
      delete cp.id;
      handleRequest(contents, 200, [cp, DEFAULT_CP]);
      let checkpoints = contents.listCheckpoints('/foo/bar.txt');
      let second = () => {
        handleRequest(contents, 200, DEFAULT_CP);
        let newCheckpoints = contents.listCheckpoints('/foo/bar.txt');
        expectFailure(newCheckpoints, done, 'Invalid Checkpoint list');
      };

      expectFailure(checkpoints, second);
    });

    it('should fail for an incorrect response', (done) => {
      let contents = new ContentsManager();
      handleRequest(contents, 201, { });
      let checkpoints = contents.listCheckpoints('/foo/bar.txt');
      expectFailure(checkpoints, done, 'Invalid response: 201 Created');
    });

  });

  describe('#restoreCheckpoint()', () => {

    it('should restore a checkpoint', () => {
      let contents = new ContentsManager();
      handleRequest(contents, 204, { });
      let checkpoint = contents.restoreCheckpoint('/foo/bar.txt',
                                                  DEFAULT_CP.id);
      return checkpoint;
    });

    it('should restore a checkpoint on an additional drive', () => {
      let contents = new ContentsManager();
      let other = new Drive({ name: 'other' });
      contents.addDrive(other);
      handleRequest(other, 204, { });
      let checkpoint = contents.restoreCheckpoint('other:/foo/bar.txt',
                                                  DEFAULT_CP.id);
      return checkpoint;
    });

    it('should fail for an incorrect response', (done) => {
      let contents = new ContentsManager();
      handleRequest(contents, 200, { });
      let checkpoint = contents.restoreCheckpoint('/foo/bar.txt',
                                                  DEFAULT_CP.id);
      expectFailure(checkpoint, done, 'Invalid response: 200 OK');
    });

  });

  describe('#deleteCheckpoint()', () => {

    it('should delete a checkpoint', () => {
      let contents = new ContentsManager();
      handleRequest(contents, 204, { });
      return contents.deleteCheckpoint('/foo/bar.txt', DEFAULT_CP.id);
    });

    it('should delete a checkpoint on an additional drive', () => {
      let contents = new ContentsManager();
      let other = new Drive({ name: 'other' });
      contents.addDrive(other);
      handleRequest(other, 204, { });
      return contents.deleteCheckpoint('other:/foo/bar.txt', DEFAULT_CP.id);
    });

    it('should fail for an incorrect response', (done) => {
      let contents = new ContentsManager();
      handleRequest(contents, 200, { });
      let checkpoint = contents.deleteCheckpoint('/foo/bar.txt',
                                                  DEFAULT_CP.id);
      expectFailure(checkpoint, done, 'Invalid response: 200 OK');
    });

  });

});


describe('drive', () => {

  let serverSettings = makeSettings();

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
      handleRequest(drive, 201, DEFAULT_FILE);
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

    it('should get a file', () => {
      let drive = new Drive();
      handleRequest(drive, 200, DEFAULT_FILE);
      let options: Contents.IFetchOptions = { type: 'file' };
      let get = drive.get('/foo', options);
      return get.then(model => {
        expect(model.path).to.be(DEFAULT_FILE.path);
      });
    });

    it('should get a directory', () => {
      let drive = new Drive();
      handleRequest(drive, 200, DEFAULT_DIR);
      let options: Contents.IFetchOptions = { type: 'directory' };
      let get = drive.get('/foo', options);
      return get.then(model => {
        expect(model.content[0].path).to.be(DEFAULT_DIR.content[0].path);
      });
    });

    it('should accept server settings', () => {
      let drive = new Drive({ serverSettings });
      handleRequest(drive, 200, DEFAULT_DIR);
      let options: Contents.IFetchOptions = { type: 'directory' };
      let get = drive.get('/foo', options);
      return get.then(model => {
        expect(model.content[0].path).to.be(DEFAULT_DIR.content[0].path);
      });
    });

    it('should fail for an incorrect response', (done) => {
      let drive = new Drive();
      handleRequest(drive, 201, DEFAULT_DIR);
      let get = drive.get('/foo');
      expectFailure(get, done, 'Invalid response: 201 Created');
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

    it('should create a file', () => {
      let drive = new Drive();
      handleRequest(drive, 201, DEFAULT_FILE);
      return drive.newUntitled({ path: '/foo' }).then(model => {
        expect(model.path).to.be(DEFAULT_FILE.path);
      });
    });

    it('should create a directory', () => {
      let drive = new Drive();
      handleRequest(drive, 201, DEFAULT_DIR);
      let options: Contents.ICreateOptions = {
        path: '/foo',
        type: 'directory'
      };
      let newDir = drive.newUntitled(options);
      return newDir.then(model => {
        expect(model.content[0].path).to.be(DEFAULT_DIR.content[0].path);
      });
    });

    it('should emit the fileChanged signal', (done) => {
      let drive = new Drive();
      handleRequest(drive, 201, DEFAULT_FILE);
      drive.fileChanged.connect((sender, args) => {
        expect(args.type).to.be('new');
        expect(args.oldValue).to.be(null);
        expect(args.newValue.path).to.be(DEFAULT_FILE.path);
        done();
      });
      drive.newUntitled({ type: 'file', ext: 'test' }).catch(done);
    });

    it('should accept server settings', () => {
      let drive = new Drive({ serverSettings });
      handleRequest(drive, 201, DEFAULT_DIR);
      let options: Contents.ICreateOptions = {
        path: '/foo',
        type: 'file',
        ext: 'txt'
      };
      return drive.newUntitled(options).then(model => {
        expect(model.content[0].path).to.be(DEFAULT_DIR.content[0].path);
      });
    });

    it('should fail for an incorrect model', (done) => {
      let drive = new Drive();
      let dir = JSON.parse(JSON.stringify(DEFAULT_DIR));
      dir.name = 1;
      handleRequest(drive, 201, dir);
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
      handleRequest(drive, 200, DEFAULT_DIR);
      let newDir = drive.newUntitled();
      expectFailure(newDir, done, 'Invalid response: 200 OK');
    });

  });

  describe('#delete()', () => {

    it('should delete a file', () => {
      let drive = new Drive();
      handleRequest(drive, 204, { });
      return drive.delete('/foo/bar.txt');
    });

    it('should emit the fileChanged signal', (done) => {
      let drive = new Drive();
      let path = '/foo/bar.txt';
      handleRequest(drive, 204, { path });
      drive.fileChanged.connect((sender, args) => {
        expect(args.type).to.be('delete');
        expect(args.oldValue.path).to.be('/foo/bar.txt');
        done();
      });
      drive.delete(path).catch(done);
    });

    it('should accept server settings', () => {
      let drive = new Drive({ serverSettings });
      handleRequest(drive, 204, { });
      drive.delete('/foo/bar.txt');
    });

    it('should fail for an incorrect response', (done) => {
      let drive = new Drive();
      handleRequest(drive, 200, { });
      let del = drive.delete('/foo/bar.txt');
      expectFailure(del, done, 'Invalid response: 200 OK');
    });

    it('should throw a specific error', (done) => {
      let drive = new Drive();
      handleRequest(drive, 400, { });
      let del = drive.delete('/foo/');
      expectFailure(del, done, '');
    });

    it('should throw a general error', (done) => {
      let drive = new Drive();
      handleRequest(drive, 500, { });
      let del = drive.delete('/foo/');
      expectFailure(del, done, '');
    });

  });

  describe('#rename()', () => {

    it('should rename a file', () => {
      let drive = new Drive();
      handleRequest(drive, 200, DEFAULT_FILE);
      let rename = drive.rename('/foo/bar.txt', '/foo/baz.txt');
      return rename.then(model => {
        expect(model.created).to.be(DEFAULT_FILE.created);
      });
    });

    it('should emit the fileChanged signal', (done) => {
      let drive = new Drive();
      handleRequest(drive, 200, DEFAULT_FILE);
      drive.fileChanged.connect((sender, args) => {
        expect(args.type).to.be('rename');
        expect(args.oldValue.path).to.be('/foo/bar.txt');
        expect(args.newValue.path).to.be('foo/test');
        done();
      });
      drive.rename('/foo/bar.txt', '/foo/baz.txt').catch(done);
    });

    it('should accept server settings', () => {
      let drive = new Drive({ serverSettings });
      handleRequest(drive, 200, DEFAULT_FILE);
      let rename = drive.rename('/foo/bar.txt', '/foo/baz.txt');
      return rename.then(model => {
        expect(model.created).to.be(DEFAULT_FILE.created);
      });
    });

    it('should fail for an incorrect model', (done) => {
      let drive = new Drive();
      let dir = JSON.parse(JSON.stringify(DEFAULT_FILE));
      delete dir.path;
      handleRequest(drive, 200, dir);
      let rename = drive.rename('/foo/bar.txt', '/foo/baz.txt');
      expectFailure(rename, done);
    });

    it('should fail for an incorrect response', (done) => {
      let drive = new Drive();
      handleRequest(drive, 201, DEFAULT_FILE);
      let rename = drive.rename('/foo/bar.txt', '/foo/baz.txt');
      expectFailure(rename, done, 'Invalid response: 201 Created');
    });

  });

  describe('#save()', () => {

    it('should save a file', () => {
      let drive = new Drive();
      handleRequest(drive, 200, DEFAULT_FILE);
      let save = drive.save('/foo', { type: 'file', name: 'test' });
      return save.then(model => {
        expect(model.created).to.be(DEFAULT_FILE.created);
      });
    });

    it('should create a new file', () => {
      let drive = new Drive();
      handleRequest(drive, 201, DEFAULT_FILE);
      let save = drive.save('/foo', { type: 'file', name: 'test' });
      return save.then(model => {
        expect(model.created).to.be(DEFAULT_FILE.created);
      });
    });

    it('should emit the fileChanged signal', (done) => {
      let drive = new Drive();
      handleRequest(drive, 201, DEFAULT_FILE);
      drive.fileChanged.connect((sender, args) => {
        expect(args.type).to.be('save');
        expect(args.oldValue).to.be(null);
        expect(args.newValue.path).to.be(DEFAULT_FILE.path);
        done();
      });
      drive.save('/foo', { type: 'file', name: 'test' }).catch(done);
    });

    it('should accept server settings', () => {
      let drive = new Drive({ serverSettings });
      handleRequest(drive, 200, DEFAULT_FILE);
      let save = drive.save('/foo', { type: 'file', name: 'test' });
      return save.then(model => {
        expect(model.created).to.be(DEFAULT_FILE.created);
      });
    });

    it('should fail for an incorrect model', (done) => {
      let drive = new Drive();
      let file = JSON.parse(JSON.stringify(DEFAULT_FILE));
      delete file.format;
      handleRequest(drive, 200, file);
      let save = drive.save('/foo', { type: 'file', name: 'test' });
      expectFailure(save, done);
    });

    it('should fail for an incorrect response', (done) => {
      let drive = new Drive();
      handleRequest(drive, 204, DEFAULT_FILE);
      let save = drive.save('/foo', { type: 'file', name: 'test' });
      expectFailure(save, done, 'Invalid response: 204 No Content');
    });

  });

  describe('#copy()', () => {

    it('should copy a file', () => {
      let drive = new Drive();
      handleRequest(drive, 201, DEFAULT_FILE);
      return drive.copy('/foo/bar.txt', '/baz').then(model => {
        expect(model.created).to.be(DEFAULT_FILE.created);
      });
    });

    it('should emit the fileChanged signal', (done) => {
      let drive = new Drive();
      handleRequest(drive, 201, DEFAULT_FILE);
      drive.fileChanged.connect((sender, args) => {
        expect(args.type).to.be('new');
        expect(args.oldValue).to.be(null);
        expect(args.newValue.path).to.be(DEFAULT_FILE.path);
        done();
      });
      drive.copy('/foo/bar.txt', '/baz').catch(done);
    });

    it('should accept server settings', () => {
      let drive = new Drive({ serverSettings });
      handleRequest(drive, 201, DEFAULT_FILE);
      return drive.copy('/foo/bar.txt', '/baz').then(model => {
        expect(model.created).to.be(DEFAULT_FILE.created);
      });
    });

    it('should fail for an incorrect model', (done) => {
      let drive = new Drive();
      let file = JSON.parse(JSON.stringify(DEFAULT_FILE));
      delete file.type;
      handleRequest(drive, 201, file);
      let copy = drive.copy('/foo/bar.txt', '/baz');
      expectFailure(copy, done);
    });

    it('should fail for an incorrect response', (done) => {
      let drive = new Drive();
      handleRequest(drive, 200, DEFAULT_FILE);
      let copy = drive.copy('/foo/bar.txt', '/baz');
      expectFailure(copy, done, 'Invalid response: 200 OK');
    });

  });

  describe('#createCheckpoint()', () => {

    it('should create a checkpoint', () => {
      let drive = new Drive();
      handleRequest(drive, 201, DEFAULT_CP);
      let checkpoint = drive.createCheckpoint('/foo/bar.txt');
      return checkpoint.then(model => {
        expect(model.last_modified).to.be(DEFAULT_CP.last_modified);
      });
    });

    it('should accept server settings', () => {
      let drive = new Drive({ serverSettings });
      handleRequest(drive, 201, DEFAULT_CP);
      let checkpoint = drive.createCheckpoint('/foo/bar.txt');
      return checkpoint.then(model => {
        expect(model.last_modified).to.be(DEFAULT_CP.last_modified);
      });
    });

    it('should fail for an incorrect model', (done) => {
      let drive = new Drive();
      let cp = JSON.parse(JSON.stringify(DEFAULT_CP));
      delete cp.last_modified;
      handleRequest(drive, 201, cp);
      let checkpoint = drive.createCheckpoint('/foo/bar.txt');
      expectFailure(checkpoint, done);
    });

    it('should fail for an incorrect response', (done) => {
      let drive = new Drive();
      handleRequest(drive, 200, DEFAULT_CP);
      let checkpoint = drive.createCheckpoint('/foo/bar.txt');
      expectFailure(checkpoint, done, 'Invalid response: 200 OK');
    });

  });

  describe('#listCheckpoints()', () => {

    it('should list the checkpoints', () => {
      let drive = new Drive();
      handleRequest(drive, 200, [DEFAULT_CP, DEFAULT_CP]);
      let checkpoints = drive.listCheckpoints('/foo/bar.txt');
      return checkpoints.then(models => {
        expect(models[0].last_modified).to.be(DEFAULT_CP.last_modified);
      });
    });

    it('should accept server settings', () => {
      let drive = new Drive({ serverSettings });
      handleRequest(drive, 200, [DEFAULT_CP, DEFAULT_CP]);
      let checkpoints = drive.listCheckpoints('/foo/bar.txt');
      return checkpoints.then(models => {
        expect(models[0].last_modified).to.be(DEFAULT_CP.last_modified);
      });
    });

    it('should fail for an incorrect model', (done) => {
      let drive = new Drive();
      let cp = JSON.parse(JSON.stringify(DEFAULT_CP));
      delete cp.id;
      handleRequest(drive, 200, [cp, DEFAULT_CP]);
      let checkpoints = drive.listCheckpoints('/foo/bar.txt');
      let second = () => {
        handleRequest(drive, 200, DEFAULT_CP);
        let newCheckpoints = drive.listCheckpoints('/foo/bar.txt');
        expectFailure(newCheckpoints, done, 'Invalid Checkpoint list');
      };

      expectFailure(checkpoints, second);
    });

    it('should fail for an incorrect response', (done) => {
      let drive = new Drive();
      handleRequest(drive, 201, { });
      let checkpoints = drive.listCheckpoints('/foo/bar.txt');
      expectFailure(checkpoints, done, 'Invalid response: 201 Created');
    });

  });

  describe('#restoreCheckpoint()', () => {

    it('should restore a checkpoint', () => {
      let drive = new Drive();
      handleRequest(drive, 204, { });
      let checkpoint = drive.restoreCheckpoint('/foo/bar.txt',
                                                  DEFAULT_CP.id);
      return checkpoint;
    });

    it('should accept server settings', () => {
      let drive = new Drive({ serverSettings });
      handleRequest(drive, 204, { });
      let checkpoint = drive.restoreCheckpoint('/foo/bar.txt',
                                                  DEFAULT_CP.id);
      return checkpoint;
    });

    it('should fail for an incorrect response', (done) => {
      let drive = new Drive();
      handleRequest(drive, 200, { });
      let checkpoint = drive.restoreCheckpoint('/foo/bar.txt',
                                                  DEFAULT_CP.id);
      expectFailure(checkpoint, done, 'Invalid response: 200 OK');
    });

  });

  describe('#deleteCheckpoint()', () => {

    it('should delete a checkpoint', () => {
      let drive = new Drive();
      handleRequest(drive, 204, { });
      return drive.deleteCheckpoint('/foo/bar.txt', DEFAULT_CP.id);
    });

    it('should accept server settings', () => {
      let drive = new Drive({ serverSettings });
      handleRequest(drive, 204, { });
      return drive.deleteCheckpoint('/foo/bar.txt', DEFAULT_CP.id);
    });

    it('should fail for an incorrect response', (done) => {
      let drive = new Drive();
      handleRequest(drive, 200, { });
      let checkpoint = drive.deleteCheckpoint('/foo/bar.txt',
                                                  DEFAULT_CP.id);
      expectFailure(checkpoint, done, 'Invalid response: 200 OK');
    });

  });

  describe('integration tests', () => {

    it('should list a directory and get the file contents', () => {
      let contents = new ContentsManager();
      let content: Contents.IModel[];
      let path = '';
      return contents.get('src').then(listing => {
        content = listing.content as Contents.IModel[];
        for (let i = 0; i < content.length; i++) {
          if (content[i].type === 'file') {
            path = content[i].path;
            return contents.get(path, { type: 'file' });
          }
        }
      }).then(msg => {
        expect(msg.path).to.be(path);
      });
    });

    it('should create a new file, rename it, and delete it', () => {
      let contents = new ContentsManager();
      let options: Contents.ICreateOptions = { type: 'file', ext: '.ipynb' };
      return contents.newUntitled(options).then(model0 => {
        return contents.rename(model0.path, 'foo.ipynb');
      }).then(model1 => {
        expect(model1.path).to.be('foo.ipynb');
        return contents.delete('foo.ipynb');
      });
    });

    it('should create a file by name and delete it', () => {
      let contents = new ContentsManager();
      let options: Partial<Contents.IModel> = {
        type: 'file', content: '', format: 'text'
      };
      return contents.save('baz.txt', options).then(model0 => {
        return contents.delete('baz.txt');
      });
    });

    it('should exercise the checkpoint API', () => {
      let contents = new ContentsManager();
      let options: Partial<Contents.IModel> = {
        type: 'file', format: 'text', content: 'foo'
      };
      let checkpoint: Contents.ICheckpointModel;
      return contents.save('baz.txt', options).then(model0 => {
        expect(model0.name).to.be('baz.txt');
        return contents.createCheckpoint('baz.txt');
      }).then(value => {
        checkpoint = value;
        return contents.listCheckpoints('baz.txt');
      }).then(checkpoints => {
        expect(checkpoints[0]).to.eql(checkpoint);
        return contents.restoreCheckpoint('baz.txt', checkpoint.id);
      }).then(() => {
        return contents.deleteCheckpoint('baz.txt', checkpoint.id);
      }).then(() => {
        return contents.delete('baz.txt');
      });
    });

  });

});
