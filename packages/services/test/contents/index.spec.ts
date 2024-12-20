// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Signal } from '@lumino/signaling';
import {
  expectFailure,
  JupyterServer,
  signalToPromise
} from '@jupyterlab/testing';
import {
  Contents,
  ContentsManager,
  Drive,
  IContentProvider,
  ServerConnection
} from '../../src';
import { DEFAULT_FILE, handleRequest, makeSettings } from '../utils';

const DEFAULT_DIR: Contents.IModel = {
  name: 'bar',
  path: 'foo/bar',
  type: 'directory',
  created: 'yesterday',
  last_modified: 'today',
  writable: false,
  mimetype: '',
  content: [
    { name: 'buzz.txt', path: 'foo/bar/buzz.txt' },
    { name: 'bazz.py', path: 'foo/bar/bazz.py' }
  ],
  format: 'json'
};

const DEFAULT_CP: Contents.ICheckpointModel = {
  id: '1234',
  last_modified: 'yesterday'
};

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
}, 30000);

afterAll(async () => {
  await server.shutdown();
});

describe('contents', () => {
  let contents: ContentsManager;
  let serverSettings: ServerConnection.ISettings;

  beforeEach(() => {
    serverSettings = makeSettings();
    contents = new ContentsManager({ serverSettings });
  });

  afterEach(() => {
    contents.dispose();
  });

  describe('#constructor()', () => {
    it('should accept no options', () => {
      const contents = new ContentsManager();
      expect(contents).toBeInstanceOf(ContentsManager);
    });

    it('should accept options', () => {
      const contents = new ContentsManager({
        defaultDrive: new Drive()
      });
      expect(contents).toBeInstanceOf(ContentsManager);
    });
  });

  describe('#fileChanged', () => {
    it('should be emitted when a file changes', async () => {
      handleRequest(contents, 201, DEFAULT_FILE);
      let called = false;
      contents.fileChanged.connect((sender, args) => {
        expect(sender).toBe(contents);
        expect(args.type).toBe('new');
        expect(args.oldValue).toBeNull();
        expect(args.newValue!.path).toBe(DEFAULT_FILE.path);
        called = true;
      });
      await contents.newUntitled();
      expect(called).toBe(true);
    });

    it('should include the full path for additional drives', async () => {
      const drive = new Drive({ name: 'other', serverSettings });
      contents.addDrive(drive);
      handleRequest(drive, 201, DEFAULT_FILE);
      let called = false;
      contents.fileChanged.connect((sender, args) => {
        expect(args.newValue!.path).toBe('other:' + DEFAULT_FILE.path);
        called = true;
      });
      await contents.newUntitled({ path: 'other:' });
      expect(called).toBe(true);
    });
  });

  describe('#isDisposed', () => {
    it('should test whether the manager is disposed', () => {
      expect(contents.isDisposed).toBe(false);
      contents.dispose();
      expect(contents.isDisposed).toBe(true);
    });
  });

  describe('#dispose()', () => {
    it('should dispose of the resources used by the manager', () => {
      expect(contents.isDisposed).toBe(false);
      contents.dispose();
      expect(contents.isDisposed).toBe(true);
      contents.dispose();
      expect(contents.isDisposed).toBe(true);
    });
  });

  describe('#addDrive()', () => {
    it('should add a new drive to the manager', async () => {
      contents.addDrive(new Drive({ name: 'other' }));
      handleRequest(contents, 200, DEFAULT_FILE);
      await expect(contents.get('other:')).resolves.not.toThrow();
    });
  });

  describe('#localPath()', () => {
    it('should parse the local part of a path', () => {
      contents.addDrive(new Drive({ name: 'other' }));
      contents.addDrive(new Drive({ name: 'alternative' }));

      expect(contents.localPath('other:foo/bar/example.txt')).toBe(
        'foo/bar/example.txt'
      );

      expect(contents.localPath('alternative:/foo/bar/example.txt')).toBe(
        'foo/bar/example.txt'
      );
    });

    it('should allow the ":" character in other parts of the path', () => {
      contents.addDrive(new Drive({ name: 'other' }));

      expect(
        contents.localPath('other:foo/odd:directory/example:file.txt')
      ).toBe('foo/odd:directory/example:file.txt');
    });

    it('should leave alone names with ":" that are not drive names', () => {
      contents.addDrive(new Drive({ name: 'other' }));

      expect(
        contents.localPath('which:foo/odd:directory/example:file.txt')
      ).toBe('which:foo/odd:directory/example:file.txt');
    });
  });

  describe('#resolvePath', () => {
    const root = 'do/re';
    const rootEmpty = '';
    const rootSlash = '/';
    const rootAbs = `//////${root}`;
    const rootDrive = `other:${root}`;
    const rootDriveAbs = `other:${rootAbs}`;

    const testPath = 'foo/bar/baz';
    const testPathAbs = `/${testPath}`;

    it('should not prepend root path to an absolute path', () => {
      contents.addDrive(new Drive({ name: 'other' }));

      let result = contents.resolvePath(root, testPathAbs);
      expect(result).toBe(testPath);
    });

    it('should not have any affect on path relative to empty root', () => {
      contents.addDrive(new Drive({ name: 'other' }));

      let result = contents.resolvePath(rootEmpty, testPath);
      expect(result).toBe(testPath);
    });

    it('should not have any affect on path relative to "/"', () => {
      contents.addDrive(new Drive({ name: 'other' }));

      let result = contents.resolvePath(rootSlash, testPath);
      expect(result).toBe(testPath);
    });

    it('should join root drive, root path, and path', () => {
      contents.addDrive(new Drive({ name: 'other' }));

      let result = contents.resolvePath(rootDrive, testPath);
      expect(result).toBe(`${rootDrive}/${testPath}`);
    });

    it('should remove all leading slashes from result path', () => {
      contents.addDrive(new Drive({ name: 'other' }));

      let result = contents.resolvePath(rootDriveAbs, testPath);
      expect(result).toBe(`${rootDrive}/${testPath}`);
    });
  });

  describe('#driveName()', () => {
    it('should parse the drive name a path', () => {
      contents.addDrive(new Drive({ name: 'other' }));
      contents.addDrive(new Drive({ name: 'alternative' }));

      expect(contents.driveName('other:foo/bar/example.txt')).toBe('other');

      expect(contents.driveName('alternative:/foo/bar/example.txt')).toBe(
        'alternative'
      );
    });

    it('should allow the ":" character in other parts of the path', () => {
      contents.addDrive(new Drive({ name: 'other' }));

      expect(
        contents.driveName('other:foo/odd:directory/example:file.txt')
      ).toBe('other');
    });

    it('should leave alone names with ":" that are not drive names', () => {
      contents.addDrive(new Drive({ name: 'other' }));

      expect(
        contents.driveName('which:foo/odd:directory/example:file.txt')
      ).toBe('');
    });
  });

  describe('#get()', () => {
    it('should get a file', async () => {
      handleRequest(contents, 200, DEFAULT_FILE);
      const options: Contents.IFetchOptions = { type: 'file' };
      const model = await contents.get('/foo', options);
      expect(model.path).toBe('foo');
    });

    it('should get a directory', async () => {
      handleRequest(contents, 200, DEFAULT_DIR);
      const options: Contents.IFetchOptions = { type: 'directory' };
      const model = await contents.get('/foo', options);
      expect(model.content[0].path).toBe(DEFAULT_DIR.content[0].path);
    });

    it('should get a file from an additional drive', async () => {
      const drive = new Drive({ name: 'other', serverSettings });
      contents.addDrive(drive);
      handleRequest(drive, 200, DEFAULT_FILE);
      const options: Contents.IFetchOptions = { type: 'file' };
      const model = await contents.get('other:/foo', options);
      expect(model.path).toBe('other:foo');
    });

    it('should get a directory from an additional drive', async () => {
      const drive = new Drive({ name: 'other', serverSettings });
      contents.addDrive(drive);
      handleRequest(drive, 200, DEFAULT_DIR);
      const options: Contents.IFetchOptions = { type: 'directory' };
      const model = await contents.get('other:/foo', options);
      expect(model.content[0].path).toBe('other:foo/bar/buzz.txt');
    });

    it('should fail for an incorrect response', async () => {
      handleRequest(contents, 201, DEFAULT_DIR);
      const get = contents.get('/foo');
      await expect(get).rejects.toThrow(/Invalid response: 201/);
    });

    it('should store original server path for directory', async () => {
      const drive = new Drive({ name: 'other', serverSettings });
      contents.addDrive(drive);
      handleRequest(drive, 200, DEFAULT_DIR);
      const options: Contents.IFetchOptions = { type: 'directory' };
      const model = await contents.get('other:/foo', options);
      expect(model.serverPath).toBe('foo/bar');
    });

    it('should store original server path for a file', async () => {
      const drive = new Drive({ name: 'other', serverSettings });
      contents.addDrive(drive);
      handleRequest(drive, 200, DEFAULT_FILE);
      const options: Contents.IFetchOptions = { type: 'file' };
      const model = await contents.get('other:/foo', options);
      expect(model.serverPath).toBe('foo/test');
    });
  });

  describe('#getDownloadUrl()', () => {
    const settings = ServerConnection.makeSettings({
      baseUrl: 'http://foo'
    });

    it('should get the url of a file', async () => {
      const drive = new Drive({ serverSettings: settings });
      const contents = new ContentsManager({ defaultDrive: drive });
      const test1 = contents.getDownloadUrl('bar.txt');
      const test2 = contents.getDownloadUrl('fizz/buzz/bar.txt');
      const test3 = contents.getDownloadUrl('/bar.txt');
      const urls = await Promise.all([test1, test2, test3]);
      expect(urls[0]).toBe('http://foo/files/bar.txt');
      expect(urls[1]).toBe('http://foo/files/fizz/buzz/bar.txt');
      expect(urls[2]).toBe('http://foo/files/bar.txt');
    });

    it('should encode characters', async () => {
      const drive = new Drive({ serverSettings: settings });
      const contents = new ContentsManager({ defaultDrive: drive });
      const url = await contents.getDownloadUrl('b ar?3.txt');
      expect(url).toBe('http://foo/files/b%20ar%3F3.txt');
    });

    it('should handle relative paths', async () => {
      const drive = new Drive({ serverSettings: settings });
      const contents = new ContentsManager({ defaultDrive: drive });
      const url = await contents.getDownloadUrl('fizz/../bar.txt');
      expect(url).toBe('http://foo/files/bar.txt');
    });

    it('should get the url of a file from an additional drive', async () => {
      const contents = new ContentsManager();
      const other = new Drive({ name: 'other', serverSettings: settings });
      contents.addDrive(other);
      const test1 = contents.getDownloadUrl('other:bar.txt');
      const test2 = contents.getDownloadUrl('other:fizz/buzz/bar.txt');
      const test3 = contents.getDownloadUrl('other:/bar.txt');
      const urls = await Promise.all([test1, test2, test3]);
      expect(urls[0]).toBe('http://foo/files/bar.txt');
      expect(urls[1]).toBe('http://foo/files/fizz/buzz/bar.txt');
      expect(urls[2]).toBe('http://foo/files/bar.txt');
    });
  });

  describe('#newUntitled()', () => {
    it('should create a file', async () => {
      handleRequest(contents, 201, DEFAULT_FILE);
      const model = await contents.newUntitled({ path: '/foo' });
      expect(model.path).toBe('foo/test');
    });

    it('should create a directory', async () => {
      handleRequest(contents, 201, DEFAULT_DIR);
      const options: Contents.ICreateOptions = {
        path: '/foo',
        type: 'directory'
      };
      const model = await contents.newUntitled(options);
      expect(model.content[0].path).toBe(DEFAULT_DIR.content[0].path);
    });

    it('should create a file on an additional drive', async () => {
      const other = new Drive({ name: 'other', serverSettings });
      contents.addDrive(other);
      handleRequest(other, 201, DEFAULT_FILE);
      const model = await contents.newUntitled({ path: 'other:/foo' });
      expect(model.path).toBe('other:foo/test');
    });

    it('should create a directory on an additional drive', async () => {
      const other = new Drive({ name: 'other', serverSettings });
      contents.addDrive(other);
      handleRequest(other, 201, DEFAULT_DIR);
      const options: Contents.ICreateOptions = {
        path: 'other:/foo',
        type: 'directory'
      };
      const model = await contents.newUntitled(options);
      expect(model.path).toBe('other:' + DEFAULT_DIR.path);
    });

    it('should emit the fileChanged signal', async () => {
      handleRequest(contents, 201, DEFAULT_FILE);
      let called = false;
      contents.fileChanged.connect((sender, args) => {
        expect(args.type).toBe('new');
        expect(args.oldValue).toBeNull();
        expect(args.newValue!.path).toBe(DEFAULT_FILE.path);
        called = true;
      });
      await contents.newUntitled({ type: 'file', ext: 'test' });
      expect(called).toBe(true);
    });

    it('should fail for an incorrect model', async () => {
      const dir = JSON.parse(JSON.stringify(DEFAULT_DIR));
      dir.name = 1;
      handleRequest(contents, 201, dir);
      const options: Contents.ICreateOptions = {
        path: '/foo',
        type: 'file',
        ext: 'py'
      };
      const newFile = contents.newUntitled(options);
      await expect(newFile).rejects.toThrow();
    });

    it('should fail for an incorrect response', async () => {
      handleRequest(contents, 200, DEFAULT_DIR);
      const newDir = contents.newUntitled();
      await expect(newDir).rejects.toThrow(/Invalid response: 200/);
    });
  });

  describe('#delete()', () => {
    it('should delete a file', async () => {
      handleRequest(contents, 204, {});
      await expect(contents.delete('/foo/bar.txt')).resolves.not.toThrow();
    });

    it('should delete a file on an additional drive', async () => {
      const other = new Drive({ name: 'other', serverSettings });
      contents.addDrive(other);
      handleRequest(other, 204, {});
      await expect(
        contents.delete('other:/foo/bar.txt')
      ).resolves.not.toThrow();
    });

    it('should emit the fileChanged signal', async () => {
      const path = '/foo/bar.txt';
      handleRequest(contents, 204, { path });
      let called = false;
      contents.fileChanged.connect((sender, args) => {
        expect(args.type).toBe('delete');
        expect(args.oldValue!.path).toBe('foo/bar.txt');
        called = true;
      });
      await contents.delete(path);
      expect(called).toBe(true);
    });

    it('should fail for an incorrect response', async () => {
      handleRequest(contents, 200, {});
      const del = contents.delete('/foo/bar.txt');
      await expect(del).rejects.toThrow(/Invalid response: 200/);
    });

    it('should throw a specific error', async () => {
      handleRequest(contents, 400, {});
      const del = contents.delete('/foo/');
      await expect(del).rejects.toThrow();
    });

    it('should throw a general error', async () => {
      handleRequest(contents, 500, {});
      const del = contents.delete('/foo/');
      await expect(del).rejects.toThrow();
    });
  });

  describe('#rename()', () => {
    it('should rename a file', async () => {
      handleRequest(contents, 200, DEFAULT_FILE);
      const rename = contents.rename('/foo/bar.txt', '/foo/baz.txt');
      const model = await rename;
      expect(model.created).toBe(DEFAULT_FILE.created);
    });

    it('should rename a file on an additional drive', async () => {
      const other = new Drive({ name: 'other', serverSettings });
      contents.addDrive(other);
      handleRequest(other, 200, DEFAULT_FILE);
      const rename = contents.rename(
        'other:/foo/bar.txt',
        'other:/foo/baz.txt'
      );
      const model = await rename;
      expect(model.created).toBe(DEFAULT_FILE.created);
    });

    it('should emit the fileChanged signal', async () => {
      handleRequest(contents, 200, DEFAULT_FILE);
      let called = false;
      contents.fileChanged.connect((sender, args) => {
        expect(args.type).toBe('rename');
        expect(args.oldValue!.path).toBe('foo/bar.txt');
        expect(args.newValue!.path).toBe('foo/test');
        called = true;
      });
      await contents.rename('/foo/bar.txt', '/foo/baz.txt');
      expect(called).toBe(true);
    });

    it('should fail for an incorrect model', async () => {
      const dir = JSON.parse(JSON.stringify(DEFAULT_FILE));
      delete dir.path;
      handleRequest(contents, 200, dir);
      const rename = contents.rename('/foo/bar.txt', '/foo/baz.txt');
      await expect(rename).rejects.toThrow();
    });

    it('should fail for an incorrect response', async () => {
      handleRequest(contents, 201, DEFAULT_FILE);
      const rename = contents.rename('/foo/bar.txt', '/foo/baz.txt');
      await expect(rename).rejects.toThrow(/Invalid response: 201/);
    });
  });

  describe('#save()', () => {
    it('should save a file', async () => {
      handleRequest(contents, 200, DEFAULT_FILE);
      const save = contents.save('/foo', { type: 'file', name: 'test' });
      const model = await save;
      expect(model.created).toBe(DEFAULT_FILE.created);
    });

    it('should save a file on an additional drive', async () => {
      const other = new Drive({ name: 'other', serverSettings });
      contents.addDrive(other);
      handleRequest(contents, 200, DEFAULT_FILE);
      const save = contents.save('other:/foo', { type: 'file', name: 'test' });
      const model = await save;
      expect(model.path).toBe('other:foo');
    });

    it('should create a new file', async () => {
      handleRequest(contents, 201, DEFAULT_FILE);
      const save = contents.save('/foo', { type: 'file', name: 'test' });
      const model = await save;
      expect(model.created).toBe(DEFAULT_FILE.created);
    });

    it('should emit the fileChanged signal', async () => {
      handleRequest(contents, 201, DEFAULT_FILE);
      let called = false;
      contents.fileChanged.connect((sender, args) => {
        expect(args.type).toBe('save');
        expect(args.oldValue).toBeNull();
        expect(args.newValue!.path).toBe(DEFAULT_FILE.path);
        called = true;
      });
      await contents.save('/foo', { type: 'file', name: 'test' });
      expect(called).toBe(true);
    });

    it('should fail for an incorrect model', async () => {
      const file = JSON.parse(JSON.stringify(DEFAULT_FILE));
      delete file.format;
      handleRequest(contents, 200, file);
      const save = contents.save('/foo', { type: 'file', name: 'test' });
      await expect(save).rejects.toThrow();
    });

    it('should fail for an incorrect response', async () => {
      handleRequest(contents, 204, DEFAULT_FILE);
      const save = contents.save('/foo', { type: 'file', name: 'test' });
      await expect(save).rejects.toThrow(/Invalid response: 204/);
    });
  });

  describe('#copy()', () => {
    it('should copy a file', async () => {
      handleRequest(contents, 201, DEFAULT_FILE);
      const model = await contents.copy('/foo/bar.txt', '/baz');
      expect(model.created).toBe(DEFAULT_FILE.created);
    });

    it('should copy a file on an additional drive', async () => {
      const other = new Drive({ serverSettings, name: 'other' });
      contents.addDrive(other);
      handleRequest(other, 201, DEFAULT_FILE);
      const model = await contents.copy('other:/foo/test', 'other:/baz');
      expect(model.path).toBe('other:foo/test');
    });

    it('should emit the fileChanged signal', async () => {
      handleRequest(contents, 201, DEFAULT_FILE);
      let called = false;
      contents.fileChanged.connect((sender, args) => {
        expect(args.type).toBe('new');
        expect(args.oldValue).toBeNull();
        expect(args.newValue!.path).toBe(DEFAULT_FILE.path);
        called = true;
      });
      await contents.copy('/foo/bar.txt', '/baz');
      expect(called).toBe(true);
    });

    it('should fail for an incorrect model', async () => {
      const file = JSON.parse(JSON.stringify(DEFAULT_FILE));
      delete file.type;
      handleRequest(contents, 201, file);
      const copy = contents.copy('/foo/bar.txt', '/baz');
      await expect(copy).rejects.toThrow();
    });

    it('should fail for an incorrect response', async () => {
      handleRequest(contents, 200, DEFAULT_FILE);
      const copy = contents.copy('/foo/bar.txt', '/baz');
      await expect(copy).rejects.toThrow(/Invalid response: 200/);
    });
  });

  describe('#createCheckpoint()', () => {
    it('should create a checkpoint', async () => {
      handleRequest(contents, 201, DEFAULT_CP);
      const checkpoint = contents.createCheckpoint('/foo/bar.txt');
      const model = await checkpoint;
      expect(model.last_modified).toBe(DEFAULT_CP.last_modified);
    });

    it('should create a checkpoint on an additional drive', async () => {
      const other = new Drive({ name: 'other', serverSettings });
      contents.addDrive(other);
      handleRequest(other, 201, DEFAULT_CP);
      const checkpoint = contents.createCheckpoint('other:/foo/bar.txt');
      const model = await checkpoint;
      expect(model.last_modified).toBe(DEFAULT_CP.last_modified);
    });

    it('should fail for an incorrect model', async () => {
      const cp = JSON.parse(JSON.stringify(DEFAULT_CP));
      delete cp.last_modified;
      handleRequest(contents, 201, cp);
      const checkpoint = contents.createCheckpoint('/foo/bar.txt');
      await expect(checkpoint).rejects.toThrow();
    });

    it('should fail for an incorrect response', async () => {
      handleRequest(contents, 200, DEFAULT_CP);
      const checkpoint = contents.createCheckpoint('/foo/bar.txt');
      await expect(checkpoint).rejects.toThrow(/Invalid response: 200/);
    });
  });

  describe('#listCheckpoints()', () => {
    it('should list the checkpoints', async () => {
      handleRequest(contents, 200, [DEFAULT_CP, DEFAULT_CP]);
      const checkpoints = contents.listCheckpoints('/foo/bar.txt');
      const models = await checkpoints;
      expect(models[0].last_modified).toBe(DEFAULT_CP.last_modified);
    });

    it('should list the checkpoints on an additional drive', async () => {
      const other = new Drive({ name: 'other', serverSettings });
      contents.addDrive(other);
      handleRequest(other, 200, [DEFAULT_CP, DEFAULT_CP]);
      const checkpoints = contents.listCheckpoints('other:/foo/bar.txt');
      const models = await checkpoints;
      expect(models[0].last_modified).toBe(DEFAULT_CP.last_modified);
    });

    it('should fail for an incorrect model', async () => {
      const cp = JSON.parse(JSON.stringify(DEFAULT_CP));
      delete cp.id;
      handleRequest(contents, 200, [cp, DEFAULT_CP]);
      const checkpoints = contents.listCheckpoints('/foo/bar.txt');
      await expectFailure(checkpoints);
      handleRequest(contents, 200, DEFAULT_CP);
      const newCheckpoints = contents.listCheckpoints('/foo/bar.txt');
      await expect(newCheckpoints).rejects.toThrow(/Invalid Checkpoint list/);
    });

    it('should fail for an incorrect response', async () => {
      handleRequest(contents, 201, {});
      const checkpoints = contents.listCheckpoints('/foo/bar.txt');
      await expect(checkpoints).rejects.toThrow(/Invalid response: 201/);
    });
  });

  describe('#restoreCheckpoint()', () => {
    it('should restore a checkpoint', async () => {
      handleRequest(contents, 204, {});
      const checkpoint = contents.restoreCheckpoint(
        '/foo/bar.txt',
        DEFAULT_CP.id
      );
      await expect(checkpoint).resolves.not.toThrow();
    });

    it('should restore a checkpoint on an additional drive', async () => {
      const other = new Drive({ name: 'other', serverSettings });
      contents.addDrive(other);
      handleRequest(other, 204, {});
      const checkpoint = contents.restoreCheckpoint(
        'other:/foo/bar.txt',
        DEFAULT_CP.id
      );
      await expect(checkpoint).resolves.not.toThrow();
    });

    it('should fail for an incorrect response', async () => {
      handleRequest(contents, 200, {});
      const checkpoint = contents.restoreCheckpoint(
        '/foo/bar.txt',
        DEFAULT_CP.id
      );
      await expect(checkpoint).rejects.toThrow(/Invalid response: 200/);
    });
  });

  describe('#deleteCheckpoint()', () => {
    it('should delete a checkpoint', async () => {
      handleRequest(contents, 204, {});
      await expect(
        contents.deleteCheckpoint('/foo/bar.txt', DEFAULT_CP.id)
      ).resolves.not.toThrow();
    });

    it('should delete a checkpoint on an additional drive', async () => {
      const other = new Drive({ name: 'other', serverSettings });
      contents.addDrive(other);
      handleRequest(other, 204, {});
      await expect(
        contents.deleteCheckpoint('other:/foo/bar.txt', DEFAULT_CP.id)
      ).resolves.not.toThrow();
    });

    it('should fail for an incorrect response', async () => {
      handleRequest(contents, 200, {});
      const checkpoint = contents.deleteCheckpoint(
        '/foo/bar.txt',
        DEFAULT_CP.id
      );
      await expect(checkpoint).rejects.toThrow(/Invalid response: 200/);
    });
  });
});

describe('drive', () => {
  let serverSettings: ServerConnection.ISettings;

  let contents: ContentsManager;

  beforeEach(() => {
    serverSettings = makeSettings();
    contents = new ContentsManager({ serverSettings });
  });

  afterEach(() => {
    contents.dispose();
  });

  describe('#constructor()', () => {
    it('should accept no options', () => {
      const drive = new Drive();
      expect(drive).toBeInstanceOf(Drive);
    });

    it('should accept options', () => {
      const drive = new Drive({
        name: 'name'
      });
      expect(drive).toBeInstanceOf(Drive);
    });
  });

  describe('#name', () => {
    it('should return the name of the drive', () => {
      const drive = new Drive({
        name: 'name'
      });
      expect(drive.name).toBe('name');
    });
  });

  describe('#fileChanged', () => {
    it('should be emitted when a file changes', async () => {
      const drive = new Drive();
      handleRequest(drive, 201, DEFAULT_FILE);
      let called = false;
      drive.fileChanged.connect((sender, args) => {
        expect(sender).toBe(drive);
        expect(args.type).toBe('new');
        expect(args.oldValue).toBeNull();
        expect(args.newValue!.path).toBe(DEFAULT_FILE.path);
        called = true;
      });
      await drive.newUntitled();
      expect(called).toBe(true);
    });
  });

  describe('#isDisposed', () => {
    it('should test whether the drive is disposed', () => {
      const drive = new Drive();
      expect(drive.isDisposed).toBe(false);
      drive.dispose();
      expect(drive.isDisposed).toBe(true);
    });
  });

  describe('#dispose()', () => {
    it('should dispose of the resources used by the drive', () => {
      const drive = new Drive();
      expect(drive.isDisposed).toBe(false);
      drive.dispose();
      expect(drive.isDisposed).toBe(true);
      drive.dispose();
      expect(drive.isDisposed).toBe(true);
    });
  });

  describe('#get()', () => {
    it('should get a file', async () => {
      const drive = new Drive();
      handleRequest(drive, 200, DEFAULT_FILE);
      const options: Contents.IFetchOptions = { type: 'file' };
      const get = drive.get('/foo', options);
      const model = await get;
      expect(model.path).toBe(DEFAULT_FILE.path);
    });

    it('should get a directory', async () => {
      const drive = new Drive();
      handleRequest(drive, 200, DEFAULT_DIR);
      const options: Contents.IFetchOptions = { type: 'directory' };
      const get = drive.get('/foo', options);
      const model = await get;
      expect(model.content[0].path).toBe(DEFAULT_DIR.content[0].path);
    });

    it('should accept server settings', async () => {
      const drive = new Drive({ serverSettings });
      handleRequest(drive, 200, DEFAULT_DIR);
      const options: Contents.IFetchOptions = { type: 'directory' };
      const get = drive.get('/foo', options);
      const model = await get;
      expect(model.content[0].path).toBe(DEFAULT_DIR.content[0].path);
    });

    it('should fail for an incorrect response', async () => {
      const drive = new Drive();
      handleRequest(drive, 201, DEFAULT_DIR);
      const get = drive.get('/foo');
      await expect(get).rejects.toThrow(/Invalid response: 201/);
    });
  });

  describe('#getDownloadUrl()', () => {
    const settings = ServerConnection.makeSettings({
      baseUrl: 'http://foo'
    });

    it('should get the url of a file', async () => {
      const drive = new Drive({ serverSettings: settings });
      const test1 = drive.getDownloadUrl('bar.txt');
      const test2 = drive.getDownloadUrl('fizz/buzz/bar.txt');
      const test3 = drive.getDownloadUrl('/bar.txt');
      const urls = await Promise.all([test1, test2, test3]);
      expect(urls[0]).toBe('http://foo/files/bar.txt');
      expect(urls[1]).toBe('http://foo/files/fizz/buzz/bar.txt');
      expect(urls[2]).toBe('http://foo/files/bar.txt');
    });

    it('should encode characters', async () => {
      const drive = new Drive({ serverSettings: settings });
      const url = await drive.getDownloadUrl('b ar?3.txt');
      expect(url).toBe('http://foo/files/b%20ar%3F3.txt');
    });

    it('should handle relative paths', async () => {
      const drive = new Drive({ serverSettings: settings });
      const url = await drive.getDownloadUrl('fizz/../bar.txt');
      expect(url).toBe('http://foo/files/bar.txt');
    });
  });

  describe('#newUntitled()', () => {
    it('should create a file', async () => {
      const drive = new Drive();
      handleRequest(drive, 201, DEFAULT_FILE);
      const model = await drive.newUntitled({ path: '/foo' });
      expect(model.path).toBe(DEFAULT_FILE.path);
    });

    it('should create a directory', async () => {
      const drive = new Drive();
      handleRequest(drive, 201, DEFAULT_DIR);
      const options: Contents.ICreateOptions = {
        path: '/foo',
        type: 'directory'
      };
      const newDir = drive.newUntitled(options);
      const model = await newDir;
      expect(model.content[0].path).toBe(DEFAULT_DIR.content[0].path);
    });

    it('should emit the fileChanged signal', async () => {
      const drive = new Drive();
      handleRequest(drive, 201, DEFAULT_FILE);
      let called = false;
      drive.fileChanged.connect((sender, args) => {
        expect(args.type).toBe('new');
        expect(args.oldValue).toBeNull();
        expect(args.newValue!.path).toBe(DEFAULT_FILE.path);
        called = true;
      });
      await drive.newUntitled({ type: 'file', ext: 'test' });
      expect(called).toBe(true);
    });

    it('should accept server settings', async () => {
      const drive = new Drive({ serverSettings });
      handleRequest(drive, 201, DEFAULT_DIR);
      const options: Contents.ICreateOptions = {
        path: '/foo',
        type: 'file',
        ext: 'txt'
      };
      const model = await drive.newUntitled(options);
      expect(model.content[0].path).toBe(DEFAULT_DIR.content[0].path);
    });

    it('should fail for an incorrect model', async () => {
      const drive = new Drive();
      const dir = JSON.parse(JSON.stringify(DEFAULT_DIR));
      dir.name = 1;
      handleRequest(drive, 201, dir);
      const options: Contents.ICreateOptions = {
        path: '/foo',
        type: 'file',
        ext: 'py'
      };
      const newFile = drive.newUntitled(options);
      await expect(newFile).rejects.toThrow();
    });

    it('should fail for an incorrect response', async () => {
      const drive = new Drive();
      handleRequest(drive, 200, DEFAULT_DIR);
      const newDir = drive.newUntitled();
      await expect(newDir).rejects.toThrow(/Invalid response: 200/);
    });
  });

  describe('#delete()', () => {
    it('should delete a file', async () => {
      const drive = new Drive();
      handleRequest(drive, 204, {});
      await expect(drive.delete('/foo/bar.txt')).resolves.not.toThrow();
    });

    it('should emit the fileChanged signal', async () => {
      const drive = new Drive();
      const path = '/foo/bar.txt';
      handleRequest(drive, 204, { path });
      let called = false;
      drive.fileChanged.connect((sender, args) => {
        expect(args.type).toBe('delete');
        expect(args.oldValue!.path).toBe('/foo/bar.txt');
        called = true;
      });
      await drive.delete(path);
      expect(called).toBe(true);
    });

    it('should accept server settings', async () => {
      const drive = new Drive({ serverSettings });
      handleRequest(drive, 204, {});
      await expect(drive.delete('/foo/bar.txt')).resolves.not.toThrow();
    });

    it('should fail for an incorrect response', async () => {
      const drive = new Drive();
      handleRequest(drive, 200, {});
      const del = drive.delete('/foo/bar.txt');
      await expect(del).rejects.toThrow(/Invalid response: 200/);
    });

    it('should throw a specific error', async () => {
      const drive = new Drive();
      handleRequest(drive, 400, {});
      const del = drive.delete('/foo/');
      await expect(del).rejects.toThrow();
    });

    it('should throw a general error', async () => {
      const drive = new Drive();
      handleRequest(drive, 500, {});
      const del = drive.delete('/foo/');
      await expect(del).rejects.toThrow();
    });
  });

  describe('#rename()', () => {
    it('should rename a file', async () => {
      const drive = new Drive();
      handleRequest(drive, 200, DEFAULT_FILE);
      const rename = drive.rename('/foo/bar.txt', '/foo/baz.txt');
      const model = await rename;
      expect(model.created).toBe(DEFAULT_FILE.created);
    });

    it('should emit the fileChanged signal', async () => {
      const drive = new Drive();
      handleRequest(drive, 200, DEFAULT_FILE);
      let called = false;
      drive.fileChanged.connect((sender, args) => {
        expect(args.type).toBe('rename');
        expect(args.oldValue!.path).toBe('/foo/bar.txt');
        expect(args.newValue!.path).toBe('foo/test');
        called = true;
      });
      await drive.rename('/foo/bar.txt', '/foo/baz.txt');
      expect(called).toBe(true);
    });

    it('should accept server settings', async () => {
      const drive = new Drive({ serverSettings });
      handleRequest(drive, 200, DEFAULT_FILE);
      const rename = drive.rename('/foo/bar.txt', '/foo/baz.txt');
      const model = await rename;
      expect(model.created).toBe(DEFAULT_FILE.created);
    });

    it('should fail for an incorrect model', async () => {
      const drive = new Drive();
      const dir = JSON.parse(JSON.stringify(DEFAULT_FILE));
      delete dir.path;
      handleRequest(drive, 200, dir);
      const rename = drive.rename('/foo/bar.txt', '/foo/baz.txt');
      await expect(rename).rejects.toThrow();
    });

    it('should fail for an incorrect response', async () => {
      const drive = new Drive();
      handleRequest(drive, 201, DEFAULT_FILE);
      const rename = drive.rename('/foo/bar.txt', '/foo/baz.txt');
      await expect(rename).rejects.toThrow(/Invalid response: 201/);
    });
  });

  describe('#save()', () => {
    it('should save a file', async () => {
      const drive = new Drive();
      handleRequest(drive, 200, DEFAULT_FILE);
      const save = drive.save('/foo', { type: 'file', name: 'test' });
      const model = await save;
      expect(model.created).toBe(DEFAULT_FILE.created);
    });

    it('should create a new file', async () => {
      const drive = new Drive();
      handleRequest(drive, 201, DEFAULT_FILE);
      const save = drive.save('/foo', { type: 'file', name: 'test' });
      const model = await save;
      expect(model.created).toBe(DEFAULT_FILE.created);
    });

    it('should emit the fileChanged signal', async () => {
      const drive = new Drive();
      handleRequest(drive, 201, DEFAULT_FILE);
      let called = false;
      drive.fileChanged.connect((sender, args) => {
        expect(args.type).toBe('save');
        expect(args.oldValue).toBeNull();
        expect(args.newValue!.path).toBe(DEFAULT_FILE.path);
        called = true;
      });
      await drive.save('/foo', { type: 'file', name: 'test' });
      expect(called).toBe(true);
    });

    it('should accept server settings', async () => {
      const drive = new Drive({ serverSettings });
      handleRequest(drive, 200, DEFAULT_FILE);
      const save = drive.save('/foo', { type: 'file', name: 'test' });
      const model = await save;
      expect(model.created).toBe(DEFAULT_FILE.created);
    });

    it('should fail for an incorrect model', async () => {
      const drive = new Drive();
      const file = JSON.parse(JSON.stringify(DEFAULT_FILE));
      delete file.format;
      handleRequest(drive, 200, file);
      const save = drive.save('/foo', { type: 'file', name: 'test' });
      await expect(save).rejects.toThrow();
    });

    it('should fail for an incorrect response', async () => {
      const drive = new Drive();
      handleRequest(drive, 204, DEFAULT_FILE);
      const save = drive.save('/foo', { type: 'file', name: 'test' });
      await expect(save).rejects.toThrow(/Invalid response: 204/);
    });
  });

  describe('#copy()', () => {
    it('should copy a file', async () => {
      const drive = new Drive();
      handleRequest(drive, 201, DEFAULT_FILE);
      const model = await drive.copy('/foo/bar.txt', '/baz');
      expect(model.created).toBe(DEFAULT_FILE.created);
    });

    it('should emit the fileChanged signal', async () => {
      const drive = new Drive();
      handleRequest(drive, 201, DEFAULT_FILE);
      let called = false;
      drive.fileChanged.connect((sender, args) => {
        expect(args.type).toBe('new');
        expect(args.oldValue).toBeNull();
        expect(args.newValue!.path).toBe(DEFAULT_FILE.path);
        called = true;
      });
      await drive.copy('/foo/bar.txt', '/baz');
      expect(called).toBe(true);
    });

    it('should accept server settings', async () => {
      const drive = new Drive({ serverSettings });
      handleRequest(drive, 201, DEFAULT_FILE);
      const model = await drive.copy('/foo/bar.txt', '/baz');
      expect(model.created).toBe(DEFAULT_FILE.created);
    });

    it('should fail for an incorrect model', async () => {
      const drive = new Drive();
      const file = JSON.parse(JSON.stringify(DEFAULT_FILE));
      delete file.type;
      handleRequest(drive, 201, file);
      const copy = drive.copy('/foo/bar.txt', '/baz');
      await expect(copy).rejects.toThrow();
    });

    it('should fail for an incorrect response', async () => {
      const drive = new Drive();
      handleRequest(drive, 200, DEFAULT_FILE);
      const copy = drive.copy('/foo/bar.txt', '/baz');
      await expect(copy).rejects.toThrow(/Invalid response: 200/);
    });
  });

  describe('#createCheckpoint()', () => {
    it('should create a checkpoint', async () => {
      const drive = new Drive();
      handleRequest(drive, 201, DEFAULT_CP);
      const checkpoint = drive.createCheckpoint('/foo/bar.txt');
      const model = await checkpoint;
      expect(model.last_modified).toBe(DEFAULT_CP.last_modified);
    });

    it('should accept server settings', async () => {
      const drive = new Drive({ serverSettings });
      handleRequest(drive, 201, DEFAULT_CP);
      const checkpoint = drive.createCheckpoint('/foo/bar.txt');
      const model = await checkpoint;
      expect(model.last_modified).toBe(DEFAULT_CP.last_modified);
    });

    it('should fail for an incorrect model', async () => {
      const drive = new Drive();
      const cp = JSON.parse(JSON.stringify(DEFAULT_CP));
      delete cp.last_modified;
      handleRequest(drive, 201, cp);
      const checkpoint = drive.createCheckpoint('/foo/bar.txt');
      await expect(checkpoint).rejects.toThrow();
    });

    it('should fail for an incorrect response', async () => {
      const drive = new Drive();
      handleRequest(drive, 200, DEFAULT_CP);
      const checkpoint = drive.createCheckpoint('/foo/bar.txt');
      await expect(checkpoint).rejects.toThrow(/Invalid response: 200/);
    });
  });

  describe('#listCheckpoints()', () => {
    it('should list the checkpoints', async () => {
      const drive = new Drive();
      handleRequest(drive, 200, [DEFAULT_CP, DEFAULT_CP]);
      const checkpoints = drive.listCheckpoints('/foo/bar.txt');
      const models = await checkpoints;
      expect(models[0].last_modified).toBe(DEFAULT_CP.last_modified);
    });

    it('should accept server settings', async () => {
      const drive = new Drive({ serverSettings });
      handleRequest(drive, 200, [DEFAULT_CP, DEFAULT_CP]);
      const checkpoints = drive.listCheckpoints('/foo/bar.txt');
      const models = await checkpoints;
      expect(models[0].last_modified).toBe(DEFAULT_CP.last_modified);
    });

    it('should fail for an incorrect model', async () => {
      const drive = new Drive();
      const cp = JSON.parse(JSON.stringify(DEFAULT_CP));
      delete cp.id;
      handleRequest(drive, 200, [cp, DEFAULT_CP]);
      const checkpoints = drive.listCheckpoints('/foo/bar.txt');
      await expectFailure(checkpoints);
      handleRequest(drive, 200, DEFAULT_CP);
      const newCheckpoints = drive.listCheckpoints('/foo/bar.txt');
      await expect(newCheckpoints).rejects.toThrow(/Invalid Checkpoint list/);
    });

    it('should fail for an incorrect response', async () => {
      const drive = new Drive();
      handleRequest(drive, 201, {});
      const checkpoints = drive.listCheckpoints('/foo/bar.txt');
      await expect(checkpoints).rejects.toThrow(/Invalid response: 201/);
    });
  });

  describe('#restoreCheckpoint()', () => {
    it('should restore a checkpoint', async () => {
      const drive = new Drive();
      handleRequest(drive, 204, {});
      const checkpoint = drive.restoreCheckpoint('/foo/bar.txt', DEFAULT_CP.id);
      await expect(checkpoint).resolves.not.toThrow();
    });

    it('should accept server settings', async () => {
      const drive = new Drive({ serverSettings });
      handleRequest(drive, 204, {});
      const checkpoint = drive.restoreCheckpoint('/foo/bar.txt', DEFAULT_CP.id);
      await expect(checkpoint).resolves.not.toThrow();
    });

    it('should fail for an incorrect response', async () => {
      const drive = new Drive();
      handleRequest(drive, 200, {});
      const checkpoint = drive.restoreCheckpoint('/foo/bar.txt', DEFAULT_CP.id);
      await expect(checkpoint).rejects.toThrow(/Invalid response: 200/);
    });
  });

  describe('#deleteCheckpoint()', () => {
    it('should delete a checkpoint', async () => {
      const drive = new Drive();
      handleRequest(drive, 204, {});
      await expect(
        drive.deleteCheckpoint('/foo/bar.txt', DEFAULT_CP.id)
      ).resolves.not.toThrow();
    });

    it('should accept server settings', async () => {
      const drive = new Drive({ serverSettings });
      handleRequest(drive, 204, {});
      await expect(
        drive.deleteCheckpoint('/foo/bar.txt', DEFAULT_CP.id)
      ).resolves.not.toThrow();
    });

    it('should fail for an incorrect response', async () => {
      const drive = new Drive();
      handleRequest(drive, 200, {});
      const checkpoint = drive.deleteCheckpoint('/foo/bar.txt', DEFAULT_CP.id);
      await expect(checkpoint).rejects.toThrow(/Invalid response: 200/);
    });
  });

  describe('integration tests', () => {
    it('should list a directory and get the file contents', async () => {
      let content: Contents.IModel[];
      let path = '';
      const listing = await contents.get('src');
      content = listing.content as Contents.IModel[];
      let called = false;
      for (let i = 0; i < content.length; i++) {
        if (content[i].type === 'file') {
          path = content[i].path;
          const msg = await contents.get(path, { type: 'file' });
          // eslint-disable-next-line jest/no-conditional-expect
          expect(msg.path).toBe(path);
          called = true;
        }
      }
      expect(called).toBe(true);
    });

    it('should create a new file, rename it, and delete it', async () => {
      const options: Contents.ICreateOptions = { type: 'file', ext: '.ipynb' };
      const model0 = await contents.newUntitled(options);
      const model1 = await contents.rename(model0.path, 'foo.ipynb');
      expect(model1.path).toBe('foo.ipynb');
      return contents.delete('foo.ipynb');
    });

    it('should create a file by name and delete it', async () => {
      const options: Partial<Contents.IModel> = {
        type: 'file',
        content: '',
        format: 'text'
      };
      await contents.save('baz.txt', options);
      await expect(contents.delete('baz.txt')).resolves.not.toThrow();
    });

    it('should exercise the checkpoint API', async () => {
      const options: Partial<Contents.IModel> = {
        type: 'file',
        format: 'text',
        content: 'foo'
      };
      let checkpoint: Contents.ICheckpointModel;
      const model0 = await contents.save('baz.txt', options);
      expect(model0.name).toBe('baz.txt');
      const value = await contents.createCheckpoint('baz.txt');
      checkpoint = value;
      const checkpoints = await contents.listCheckpoints('baz.txt');
      expect(checkpoints[0]).toEqual(checkpoint);
      await contents.restoreCheckpoint('baz.txt', checkpoint.id);
      await contents.deleteCheckpoint('baz.txt', checkpoint.id);
      await contents.delete('baz.txt');
    });
  });

  describe('#contentProviderRegistry', () => {
    class DummyContentProvider implements IContentProvider {
      async get(
        localPath: string,
        options?: Contents.IFetchOptions
      ): Promise<Contents.IModel> {
        return {
          name: 'bar',
          path: '',
          type: '',
          writable: true,
          created: '',
          last_modified: '',
          mimetype: '',
          content: '',
          format: null
        };
      }

      async save(
        localPath: string,
        options: Partial<Contents.IModel> = {}
      ): Promise<Contents.IModel> {
        return {
          name: 'baz',
          path: '',
          type: '',
          writable: true,
          created: '',
          last_modified: '',
          mimetype: '',
          content: '',
          format: null
        };
      }

      drive: Contents.IDrive;
    }

    class ChangeEmittingContentProvider extends DummyContentProvider {
      readonly fileChanged: Signal<IContentProvider, Contents.IChangedArgs> =
        new Signal<IContentProvider, Contents.IChangedArgs>(this);
    }

    it('should use the registered content provider', async () => {
      const drive = new Drive();
      const contentProvider = new DummyContentProvider();
      drive.contentProviderRegistry.register('dummy', contentProvider);
      const model1 = await drive.get('foo', { contentProviderId: 'dummy' });
      const model2 = await drive.save('foo', { contentProviderId: 'dummy' });
      expect(model1.name).toBe('bar');
      expect(model2.name).toBe('baz');
    });

    it('integration test with ContentsManager', async () => {
      const drive = new Drive();
      const contents = new ContentsManager({ defaultDrive: drive });
      const contentProvider = new DummyContentProvider();
      drive.contentProviderRegistry.register('dummy', contentProvider);
      const model1 = await contents.get('foo', { contentProviderId: 'dummy' });
      expect(model1.name).toBe('bar');
    });

    it('should proxy `fileChanged` signals emitted by providers', async () => {
      const drive = new Drive();
      const contentProvider = new ChangeEmittingContentProvider();
      drive.contentProviderRegistry.register('dummy', contentProvider);
      const promise = signalToPromise(drive.fileChanged);
      contentProvider.fileChanged.emit({
        oldValue: null,
        newValue: 'test',
        type: 'save'
      } as Contents.IChangedArgs);
      const [_, change] = await promise;
      expect(change.newValue).toBe('test');
    });

    it('should throw when usage is attempted before registration or after disposal', async () => {
      const drive = new Drive();
      const options: Contents.IFetchOptions = {
        type: 'file',
        contentProviderId: 'dummy'
      };
      handleRequest(drive, 200, DEFAULT_FILE);
      await expect(drive.get('foo', options)).rejects.toThrow();

      const contentProvider = new DummyContentProvider();
      const disposable = drive.contentProviderRegistry.register(
        'dummy',
        contentProvider
      );

      handleRequest(drive, 200, DEFAULT_FILE);
      const whenRegistered = await drive.get('foo', options);
      expect(whenRegistered.name).toBe('bar');

      disposable.dispose();

      handleRequest(drive, 200, DEFAULT_FILE);
      await expect(drive.get('foo', options)).rejects.toThrow();
    });
  });
});
