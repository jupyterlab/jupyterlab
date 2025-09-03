/**
 * Test file to verify the configurable toSkip functionality
 * This would be part of a proper test suite
 */

import { expect } from '@jest/globals';
import { PluginList } from '../src/pluginlist';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { TestConnector, TestRegistry } from './utils';

describe('Configurable toSkip functionality', () => {
  let connector: TestConnector;
  let registry: TestRegistry;

  const plugins = ['test-plugin-1', 'test-plugin-2', 'test-plugin-3'];

  const schemas: { [key: string]: ISettingRegistry.ISchema } = {
    'test-plugin-1': {
      type: 'object',
      properties: {
        setting1: {
          type: 'string',
          default: 'default1'
        }
      }
    },
    'test-plugin-2': {
      type: 'object',
      properties: {
        setting2: {
          type: 'string',
          default: 'default2'
        }
      }
    },
    'test-plugin-3': {
      type: 'object',
      properties: {
        setting3: {
          type: 'string',
          default: 'default3'
        }
      }
    }
  };

  beforeAll(() => {
    connector = new TestConnector();
  });

  beforeEach(async () => {
    registry = new TestRegistry({ connector });
    connector.schemas = schemas;

    // Load all plugins
    for (const id of plugins) {
      await registry.load(id);
    }
  });

  afterEach(async () => {
    connector.schemas = {};
    await connector.clear();
  });

  it('should filter plugins based on toSkip configuration in constructor', async () => {
    // Create model with initial toSkip list
    const model1 = new PluginList.Model({
      registry,
      toSkip: ['test-plugin-2']
    });
    await model1.ready;

    // Should exclude test-plugin-2
    const plugins1 = model1.plugins.map(p => p.id);
    expect(plugins1).toContain('test-plugin-1');
    expect(plugins1).not.toContain('test-plugin-2');
    expect(plugins1).toContain('test-plugin-3');

    // Create another model with different toSkip list
    const model2 = new PluginList.Model({
      registry,
      toSkip: ['test-plugin-1', 'test-plugin-3']
    });
    await model2.ready;

    // Should exclude test-plugin-1 and test-plugin-3
    const plugins2 = model2.plugins.map(p => p.id);
    expect(plugins2).not.toContain('test-plugin-1');
    expect(plugins2).toContain('test-plugin-2');
    expect(plugins2).not.toContain('test-plugin-3');
  });
});
