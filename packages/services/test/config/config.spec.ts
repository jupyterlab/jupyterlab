// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expectFailure, JupyterServer } from '@jupyterlab/testing';
import { JSONObject, UUID } from '@lumino/coreutils';
import { ConfigSectionManager, ConfigWithDefaults } from '../../src';
import { getRequestHandler, handleRequest, makeSettings } from '../utils';

/**
 * Generate a random config section name.
 *
 * #### Notes
 * Config sections cannot have dashes (see
 * https://github.com/jupyter/notebook/blob/b2edf8963cc017733f264cca35fd6584f328c8b6/notebook/services/config/handlers.py#L36),
 * so we remove the dashes.
 */
function randomName() {
  return UUID.uuid4().replace(/-/g, '');
}

const server = new JupyterServer();
let configSectionManager: ConfigSectionManager;

beforeAll(async () => {
  await server.start();
  const serverSettings = makeSettings();
  configSectionManager = new ConfigSectionManager({ serverSettings });
}, 30000);

afterAll(async () => {
  await server.shutdown();
});

describe('config', () => {
  describe('ConfigSectionManager', () => {
    it('should load a config', async () => {
      const config = await configSectionManager.create({ name: randomName() });
      expect(Object.keys(config.data).length).toBe(0);
    });

    it('should accept server settings', async () => {
      const config = await configSectionManager.create({
        name: randomName()
      });
      expect(Object.keys(config.data).length).toBe(0);
    });

    it('should fail for an incorrect response', async () => {
      const settings = getRequestHandler(201, {});
      const manager = new ConfigSectionManager({ serverSettings: settings });
      const configPromise = manager.create({
        name: randomName()
      });
      await expect(configPromise).rejects.toThrow(/Invalid response: 201/);
    });
  });

  describe('#update()', () => {
    it('should update a config', async () => {
      const config = await configSectionManager.create({ name: randomName() });
      const data: any = await config.update({ foo: 'baz', spam: 'eggs' });
      expect(data.foo).toBe('baz');
      expect(config.data['foo']).toBe('baz');
      expect(data['spam']).toBe('eggs');
      expect(config.data['spam']).toBe('eggs');
    });

    it('should accept server settings', async () => {
      const config = await configSectionManager.create({
        name: randomName()
      });
      const data: any = await config.update({ foo: 'baz', spam: 'eggs' });
      expect(data.foo).toBe('baz');
      expect(config.data['foo']).toBe('baz');
      expect(data['spam']).toBe('eggs');
      expect(config.data['spam']).toBe('eggs');
    });

    it('should fail for an incorrect response', async () => {
      const config = await configSectionManager.create({ name: randomName() });
      handleRequest(config, 201, {});
      const update = config.update({ foo: 'baz' });
      await expect(update).rejects.toThrow(/Invalid response: 201/);
    });
  });
});

describe('jupyter.services - ConfigWithDefaults', () => {
  describe('#constructor()', () => {
    it('should complete properly', async () => {
      const defaults: JSONObject = { spam: 'eggs' };
      const className = 'testclass';
      const section = await configSectionManager.create({
        name: randomName()
      });
      const config = new ConfigWithDefaults({
        section,
        defaults,
        className
      });
      expect(config).toBeInstanceOf(ConfigWithDefaults);
    });
  });

  describe('#get()', () => {
    it('should get a new config value', async () => {
      const defaults: JSONObject = { foo: 'bar' };
      const className = 'testclass';
      const section = await configSectionManager.create({
        name: randomName()
      });
      const config = new ConfigWithDefaults({
        section,
        defaults,
        className
      });
      const data = config.get('foo');
      expect(data).toBe('bar');
    });

    it('should get a default config value', async () => {
      const defaults: JSONObject = { spam: 'eggs' };
      const className = 'testclass';
      const section = await configSectionManager.create({
        name: randomName()
      });
      const config = new ConfigWithDefaults({
        section,
        defaults,
        className
      });
      const data = config.get('spam');
      expect(data).toBe('eggs');
    });

    it('should get a default config value with no class', async () => {
      const defaults: JSONObject = { spam: 'eggs' };
      const className = 'testclass';
      const section = await configSectionManager.create({
        name: randomName()
      });
      const config = new ConfigWithDefaults({
        section,
        defaults,
        className
      });
      const data = config.get('spam');
      expect(data).toBe('eggs');
    });

    it('should get a falsey value', async () => {
      const defaults: JSONObject = { foo: true };
      const className = 'testclass';
      const settings = getRequestHandler(200, { foo: false });
      const manager = new ConfigSectionManager({ serverSettings: settings });
      const section = await manager.create({
        name: randomName()
      });
      const config = new ConfigWithDefaults({
        section,
        defaults,
        className
      });
      const data = config.get('foo');
      expect(data).toBeFalsy();
    });
  });

  describe('#set()', () => {
    it('should set a value in a class immediately', async () => {
      const className = 'testclass';
      const section = await configSectionManager.create({ name: randomName() });
      const config = new ConfigWithDefaults({ section, className });
      let data: any = await config.set('foo', 'bar');
      data = section.data['testclass'] as JSONObject;
      expect(data['foo']).toBe('bar');
    });

    it('should set a top level value', async () => {
      const section = await configSectionManager.create({ name: randomName() });
      const config = new ConfigWithDefaults({ section });
      const set = config.set('foo', 'bar');
      expect(section.data['foo']).toBe('bar');
      await set;
      expect(section.data['foo']).toBe('bar');
    });

    it('should fail for an invalid response', async () => {
      const section = await configSectionManager.create({
        name: randomName()
      });
      handleRequest(section, 201, { foo: 'bar' });
      const config = new ConfigWithDefaults({ section });
      const set = config.set('foo', 'bar');
      expect(section.data['foo']).toBe('bar');
      await expectFailure(set, 'Invalid response: 201');
    });
  });
});
