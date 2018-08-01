// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { UUID } from '@phosphor/coreutils';

import { JSONObject } from '@phosphor/coreutils';

import {
  ConfigSection,
  ConfigWithDefaults,
  IConfigSection
} from '../../../lib/config';

import {
  expectFailure,
  handleRequest,
  makeSettings,
  getRequestHandler
} from '../utils';

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
    it('should load a config', () => {
      return ConfigSection.create({ name: randomName() }).then(config => {
        expect(Object.keys(config.data).length).to.equal(0);
      });
    });

    it('should load a config', () => {
      return ConfigSection.create({ name: randomName() }).then(config => {
        expect(Object.keys(config.data).length).to.equal(0);
      });
    });

    it('should accept server settings', () => {
      const serverSettings = makeSettings();
      return ConfigSection.create({
        name: randomName(),
        serverSettings
      }).then(config => {
        expect(Object.keys(config.data).length).to.equal(0);
      });
    });

    it('should fail for an incorrect response', async () => {
      const serverSettings = getRequestHandler(201, {});
      const configPromise = ConfigSection.create({
        name: randomName(),
        serverSettings
      });
      expectFailure(configPromise, done, 'Invalid response: 201 Created');
    });
  });

  describe('#update()', () => {
    it('should update a config', () => {
      const config: IConfigSection;
      return ConfigSection.create({ name: randomName() })
        .then(c => {
          config = c;
          return config.update({ foo: 'baz', spam: 'eggs' });
        })
        .then((data: any) => {
          expect(data.foo).to.equal('baz');
          expect(config.data['foo']).to.equal('baz');
          expect(data['spam']).to.equal('eggs');
          expect(config.data['spam']).to.equal('eggs');
        });
    });

    it('should accept server settings', () => {
      const config: IConfigSection;
      const serverSettings = makeSettings();
      return ConfigSection.create({ name: randomName(), serverSettings })
        .then(c => {
          config = c;
          return config.update({ foo: 'baz', spam: 'eggs' });
        })
        .then((data: any) => {
          expect(data.foo).to.equal('baz');
          expect(config.data['foo']).to.equal('baz');
          expect(data['spam']).to.equal('eggs');
          expect(config.data['spam']).to.equal('eggs');
        });
    });

    it('should fail for an incorrect response', async () => {
      ConfigSection.create({ name: randomName() })
        .then(config => {
          handleRequest(config, 201, {});
          const update = config.update({ foo: 'baz' });
          expectFailure(update, done, 'Invalid response: 201 Created');
        })
        .catch(done);
    });
  });
});

describe('jupyter.services - ConfigWithDefaults', () => {
  describe('#constructor()', () => {
    it('should complete properly', () => {
      const defaults: JSONObject = { spam: 'eggs' };
      const className = 'testclass';
      return ConfigSection.create({
        name: randomName()
      }).then(section => {
        const config = new ConfigWithDefaults({
          section,
          defaults,
          className
        });
        expect(config).to.be.an.instanceof(ConfigWithDefaults);
      });
    });
  });

  describe('#get()', () => {
    it('should get a new config value', () => {
      const defaults: JSONObject = { foo: 'bar' };
      const className = 'testclass';
      return ConfigSection.create({
        name: randomName()
      }).then(section => {
        const config = new ConfigWithDefaults({
          section,
          defaults,
          className
        });
        const data = config.get('foo');
        expect(data).to.equal('bar');
      });
    });

    it('should get a default config value', () => {
      const defaults: JSONObject = { spam: 'eggs' };
      const className = 'testclass';
      return ConfigSection.create({
        name: randomName()
      }).then(section => {
        const config = new ConfigWithDefaults({
          section,
          defaults,
          className
        });
        const data = config.get('spam');
        expect(data).to.equal('eggs');
      });
    });

    it('should get a default config value with no class', () => {
      const defaults: JSONObject = { spam: 'eggs' };
      const className = 'testclass';
      return ConfigSection.create({
        name: randomName()
      }).then(section => {
        const config = new ConfigWithDefaults({
          section,
          defaults,
          className
        });
        const data = config.get('spam');
        expect(data).to.equal('eggs');
      });
    });

    it('should get a falsey value', () => {
      const defaults: JSONObject = { foo: true };
      const className = 'testclass';
      const serverSettings = getRequestHandler(200, { foo: false });
      return ConfigSection.create({
        name: randomName(),
        serverSettings
      }).then(section => {
        const config = new ConfigWithDefaults({
          section,
          defaults,
          className
        });
        const data = config.get('foo');
        expect(data).to.not.be.ok;
      });
    });
  });

  describe('#set()', () => {
    it('should set a value in a class immediately', () => {
      const className = 'testclass';
      const section: IConfigSection;
      return ConfigSection.create({ name: randomName() })
        .then(s => {
          section = s;
          const config = new ConfigWithDefaults({ section, className });
          return config.set('foo', 'bar');
        })
        .then(() => {
          const data = section.data['testclass'] as JSONObject;
          expect(data['foo']).to.equal('bar');
        });
    });

    it('should set a top level value', () => {
      const section: IConfigSection;
      return ConfigSection.create({ name: randomName() })
        .then(s => {
          section = s;
          const config = new ConfigWithDefaults({ section });
          const set = config.set('foo', 'bar');
          expect(section.data['foo']).to.equal('bar');
          return set;
        })
        .then(data => {
          expect(section.data['foo']).to.equal('bar');
        });
    });

    it('should fail for an invalid response', async () => {
      const serverSettings = getRequestHandler(200, {});
      ConfigSection.create({ name: randomName(), serverSettings })
        .then(section => {
          handleRequest(section, 201, { foo: 'bar' });
          const config = new ConfigWithDefaults({ section });
          const set = config.set('foo', 'bar');
          expect(section.data['foo']).to.equal('bar');
          expectFailure(set, done, 'Invalid response: 201 Created');
        })
        .catch(done);
    });
  });
});
