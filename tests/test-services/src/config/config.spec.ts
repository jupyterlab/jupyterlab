// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { UUID } from '@lumino/coreutils';

import { JSONObject } from '@lumino/coreutils';

import { ConfigSection, ConfigWithDefaults } from '@jupyterlab/services';

import { expectFailure } from '@jupyterlab/testutils';

import { handleRequest, makeSettings, getRequestHandler } from '../utils';

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

describe('config', () => {
  describe('ConfigSection.create()', () => {
    it('should load a config', async () => {
      const config = await ConfigSection.create({ name: randomName() });
      expect(Object.keys(config.data).length).to.equal(0);
    });

    it('should accept server settings', async () => {
      const serverSettings = makeSettings();
      const config = await ConfigSection.create({
        name: randomName(),
        serverSettings
      });
      expect(Object.keys(config.data).length).to.equal(0);
    });

    it('should fail for an incorrect response', async () => {
      const serverSettings = getRequestHandler(201, {});
      const configPromise = ConfigSection.create({
        name: randomName(),
        serverSettings
      });
      await expectFailure(configPromise, 'Invalid response: 201 Created');
    });
  });

  describe('#update()', () => {
    it('should update a config', async () => {
      const config = await ConfigSection.create({ name: randomName() });
      const data: any = await config.update({ foo: 'baz', spam: 'eggs' });
      expect(data.foo).to.equal('baz');
      expect(config.data['foo']).to.equal('baz');
      expect(data['spam']).to.equal('eggs');
      expect(config.data['spam']).to.equal('eggs');
    });

    it('should accept server settings', async () => {
      const serverSettings = makeSettings();
      const config = await ConfigSection.create({
        name: randomName(),
        serverSettings
      });
      const data: any = await config.update({ foo: 'baz', spam: 'eggs' });
      expect(data.foo).to.equal('baz');
      expect(config.data['foo']).to.equal('baz');
      expect(data['spam']).to.equal('eggs');
      expect(config.data['spam']).to.equal('eggs');
    });

    it('should fail for an incorrect response', async () => {
      const config = await ConfigSection.create({ name: randomName() });
      handleRequest(config, 201, {});
      const update = config.update({ foo: 'baz' });
      await expectFailure(update, 'Invalid response: 201 Created');
    });
  });
});

describe('jupyter.services - ConfigWithDefaults', () => {
  describe('#constructor()', () => {
    it('should complete properly', async () => {
      const defaults: JSONObject = { spam: 'eggs' };
      const className = 'testclass';
      const section = await ConfigSection.create({
        name: randomName()
      });
      const config = new ConfigWithDefaults({
        section,
        defaults,
        className
      });
      expect(config).to.be.an.instanceof(ConfigWithDefaults);
    });
  });

  describe('#get()', () => {
    it('should get a new config value', async () => {
      const defaults: JSONObject = { foo: 'bar' };
      const className = 'testclass';
      const section = await ConfigSection.create({
        name: randomName()
      });
      const config = new ConfigWithDefaults({
        section,
        defaults,
        className
      });
      const data = config.get('foo');
      expect(data).to.equal('bar');
    });

    it('should get a default config value', async () => {
      const defaults: JSONObject = { spam: 'eggs' };
      const className = 'testclass';
      const section = await ConfigSection.create({
        name: randomName()
      });
      const config = new ConfigWithDefaults({
        section,
        defaults,
        className
      });
      const data = config.get('spam');
      expect(data).to.equal('eggs');
    });

    it('should get a default config value with no class', async () => {
      const defaults: JSONObject = { spam: 'eggs' };
      const className = 'testclass';
      const section = await ConfigSection.create({
        name: randomName()
      });
      const config = new ConfigWithDefaults({
        section,
        defaults,
        className
      });
      const data = config.get('spam');
      expect(data).to.equal('eggs');
    });

    it('should get a falsey value', async () => {
      const defaults: JSONObject = { foo: true };
      const className = 'testclass';
      const serverSettings = getRequestHandler(200, { foo: false });
      const section = await ConfigSection.create({
        name: randomName(),
        serverSettings
      });
      const config = new ConfigWithDefaults({
        section,
        defaults,
        className
      });
      const data = config.get('foo');
      expect(data).to.not.be.ok;
    });
  });

  describe('#set()', () => {
    it('should set a value in a class immediately', async () => {
      const className = 'testclass';
      const section = await ConfigSection.create({ name: randomName() });
      const config = new ConfigWithDefaults({ section, className });
      let data: any = await config.set('foo', 'bar');
      data = section.data['testclass'] as JSONObject;
      expect(data['foo']).to.equal('bar');
    });

    it('should set a top level value', async () => {
      const section = await ConfigSection.create({ name: randomName() });
      const config = new ConfigWithDefaults({ section });
      const set = config.set('foo', 'bar');
      expect(section.data['foo']).to.equal('bar');
      await set;
      expect(section.data['foo']).to.equal('bar');
    });

    it('should fail for an invalid response', async () => {
      const serverSettings = getRequestHandler(200, {});
      const section = await ConfigSection.create({
        name: randomName(),
        serverSettings
      });
      handleRequest(section, 201, { foo: 'bar' });
      const config = new ConfigWithDefaults({ section });
      const set = config.set('foo', 'bar');
      expect(section.data['foo']).to.equal('bar');
      await expectFailure(set, 'Invalid response: 201 Created');
    });
  });
});
