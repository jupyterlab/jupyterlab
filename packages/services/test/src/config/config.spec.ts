// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

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
        expect(Object.keys(config.data).length).to.be(0);
      });
    });

    it('should load a config', () => {
      return ConfigSection.create({ name: randomName() }).then(config => {
        expect(Object.keys(config.data).length).to.be(0);
      });
    });

    it('should accept server settings', () => {
      let serverSettings = makeSettings();
      return ConfigSection.create({
        name: randomName(),
        serverSettings
      }).then(config => {
        expect(Object.keys(config.data).length).to.be(0);
      });
    });

    it('should fail for an incorrect response', done => {
      let serverSettings = getRequestHandler(201, {});
      let configPromise = ConfigSection.create({
        name: randomName(),
        serverSettings
      });
      expectFailure(configPromise, done, 'Invalid response: 201 Created');
    });
  });

  describe('#update()', () => {
    it('should update a config', () => {
      let config: IConfigSection;
      return ConfigSection.create({ name: randomName() })
        .then(c => {
          config = c;
          return config.update({ foo: 'baz', spam: 'eggs' });
        })
        .then((data: any) => {
          expect(data.foo).to.be('baz');
          expect(config.data['foo']).to.be('baz');
          expect(data['spam']).to.be('eggs');
          expect(config.data['spam']).to.be('eggs');
        });
    });

    it('should accept server settings', () => {
      let config: IConfigSection;
      let serverSettings = makeSettings();
      return ConfigSection.create({ name: randomName(), serverSettings })
        .then(c => {
          config = c;
          return config.update({ foo: 'baz', spam: 'eggs' });
        })
        .then((data: any) => {
          expect(data.foo).to.be('baz');
          expect(config.data['foo']).to.be('baz');
          expect(data['spam']).to.be('eggs');
          expect(config.data['spam']).to.be('eggs');
        });
    });

    it('should fail for an incorrect response', done => {
      ConfigSection.create({ name: randomName() })
        .then(config => {
          handleRequest(config, 201, {});
          let update = config.update({ foo: 'baz' });
          expectFailure(update, done, 'Invalid response: 201 Created');
        })
        .catch(done);
    });
  });
});

describe('jupyter.services - ConfigWithDefaults', () => {
  describe('#constructor()', () => {
    it('should complete properly', () => {
      let defaults: JSONObject = { spam: 'eggs' };
      let className = 'testclass';
      return ConfigSection.create({
        name: randomName()
      }).then(section => {
        let config = new ConfigWithDefaults({
          section,
          defaults,
          className
        });
        expect(config).to.be.a(ConfigWithDefaults);
      });
    });
  });

  describe('#get()', () => {
    it('should get a new config value', () => {
      let defaults: JSONObject = { foo: 'bar' };
      let className = 'testclass';
      return ConfigSection.create({
        name: randomName()
      }).then(section => {
        let config = new ConfigWithDefaults({
          section,
          defaults,
          className
        });
        let data = config.get('foo');
        expect(data).to.be('bar');
      });
    });

    it('should get a default config value', () => {
      let defaults: JSONObject = { spam: 'eggs' };
      let className = 'testclass';
      return ConfigSection.create({
        name: randomName()
      }).then(section => {
        let config = new ConfigWithDefaults({
          section,
          defaults,
          className
        });
        let data = config.get('spam');
        expect(data).to.be('eggs');
      });
    });

    it('should get a default config value with no class', () => {
      let defaults: JSONObject = { spam: 'eggs' };
      let className = 'testclass';
      return ConfigSection.create({
        name: randomName()
      }).then(section => {
        let config = new ConfigWithDefaults({
          section,
          defaults,
          className
        });
        let data = config.get('spam');
        expect(data).to.be('eggs');
      });
    });

    it('should get a falsey value', () => {
      let defaults: JSONObject = { foo: true };
      let className = 'testclass';
      let serverSettings = getRequestHandler(200, { foo: false });
      return ConfigSection.create({
        name: randomName(),
        serverSettings
      }).then(section => {
        let config = new ConfigWithDefaults({
          section,
          defaults,
          className
        });
        let data = config.get('foo');
        expect(data).to.not.be.ok();
      });
    });
  });

  describe('#set()', () => {
    it('should set a value in a class immediately', () => {
      let className = 'testclass';
      let section: IConfigSection;
      return ConfigSection.create({ name: randomName() })
        .then(s => {
          section = s;
          let config = new ConfigWithDefaults({ section, className });
          return config.set('foo', 'bar');
        })
        .then(() => {
          let data = section.data['testclass'] as JSONObject;
          expect(data['foo']).to.be('bar');
        });
    });

    it('should set a top level value', () => {
      let section: IConfigSection;
      return ConfigSection.create({ name: randomName() })
        .then(s => {
          section = s;
          let config = new ConfigWithDefaults({ section });
          let set = config.set('foo', 'bar');
          expect(section.data['foo']).to.be('bar');
          return set;
        })
        .then(data => {
          expect(section.data['foo']).to.be('bar');
        });
    });

    it('should fail for an invalid response', done => {
      let serverSettings = getRequestHandler(200, {});
      ConfigSection.create({ name: randomName(), serverSettings })
        .then(section => {
          handleRequest(section, 201, { foo: 'bar' });
          let config = new ConfigWithDefaults({ section });
          let set = config.set('foo', 'bar');
          expect(section.data['foo']).to.be('bar');
          expectFailure(set, done, 'Invalid response: 201 Created');
        })
        .catch(done);
    });
  });
});
