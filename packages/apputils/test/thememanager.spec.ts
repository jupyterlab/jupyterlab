// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ISettingRegistry } from '@jupyterlab/settingregistry';
import { SettingRegistry } from '@jupyterlab/settingregistry';
import type { IDataConnector } from '@jupyterlab/statedb';
import { ThemeManager } from '@jupyterlab/apputils';
import { Widget } from '@lumino/widgets';

/**
 * The theme plugin schema used for testing, matching the structure
 * from packages/apputils-extension/schema/themes.json.
 */
const THEME_PLUGIN_SCHEMA: ISettingRegistry.IPlugin = {
  data: {
    composite: {
      theme: 'JupyterLab Light',
      'adaptive-theme': false,
      'preferred-light-theme': 'JupyterLab Light',
      'preferred-dark-theme': 'JupyterLab Dark',
      'theme-scrollbars': false,
      overrides: {
        'code-font-family': null,
        'code-font-size': null,
        'content-font-family': null,
        'content-font-size1': null,
        'ui-font-family': null,
        'ui-font-size1': null,
        'rendermime-error-background': { light: null, dark: null }
      }
    },
    user: {}
  },
  id: 'test-plugin:themes',
  raw: '{}',
  schema: {
    type: 'object',
    definitions: {
      cssOverrides: {
        type: 'object',
        additionalProperties: false,
        description:
          'The description field of each item is the CSS property that will be used to validate an override\'s value',
        properties: {
          'code-font-family': {
            type: ['string', 'null'],
            description: 'font-family'
          },
          'code-font-size': {
            type: ['string', 'null'],
            description: 'font-size'
          },
          'content-font-family': {
            type: ['string', 'null'],
            description: 'font-family'
          },
          'content-font-size1': {
            type: ['string', 'null'],
            description: 'font-size'
          },
          'ui-font-family': {
            type: ['string', 'null'],
            description: 'font-family'
          },
          'ui-font-size1': {
            type: ['string', 'null'],
            description: 'font-size'
          },
          'rendermime-error-background': {
            title: 'Error Background Color',
            description: 'Background color for error output',
            type: 'object',
            properties: {
              light: {
                type: ['string', 'null'],
                description: 'Background color to use in light theme'
              },
              dark: {
                type: ['string', 'null'],
                description: 'Background color to use in dark theme'
              }
            }
          }
        }
      }
    },
    properties: {
      theme: {
        type: 'string',
        title: 'Selected Theme',
        description: 'Application-level visual styling theme.',
        default: 'JupyterLab Light'
      },
      'adaptive-theme': {
        type: 'boolean',
        title: 'Adaptive Theme',
        default: false
      },
      'preferred-light-theme': {
        type: 'string',
        default: 'JupyterLab Light'
      },
      'preferred-dark-theme': {
        type: 'string',
        default: 'JupyterLab Dark'
      },
      'theme-scrollbars': {
        type: 'boolean',
        default: false
      },
      overrides: {
        title: 'Theme CSS Overrides',
        $ref: '#/definitions/cssOverrides',
        default: {
          'code-font-family': null,
          'code-font-size': null,
          'content-font-family': null,
          'content-font-size1': null,
          'ui-font-family': null,
          'ui-font-size1': null,
          'rendermime-error-background': { light: null, dark: null }
        }
      }
    }
  },
  version: 'test'
};

/**
 * Create a mock setting registry connector.
 */
function createConnector(
  plugin: ISettingRegistry.IPlugin
): IDataConnector<ISettingRegistry.IPlugin, string, string, string> {
  return {
    fetch: jest.fn().mockImplementation((id: string) => {
      if (id === plugin.id) {
        return plugin;
      }
      return {};
    }),
    list: jest.fn().mockResolvedValue({ ids: [plugin.id], values: [plugin] }),
    save: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined)
  };
}

/**
 * Helper to create a ThemeManager with a controllable settings mock.
 * Returns the manager and a function to update user overrides.
 */
async function createThemeManager(userOverrides?: Record<string, any>): Promise<{
  manager: ThemeManager;
  settings: ISettingRegistry.ISettings;
}> {
  const pluginData = JSON.parse(JSON.stringify(THEME_PLUGIN_SCHEMA));
  if (userOverrides) {
    pluginData.data.user = { overrides: userOverrides };
  }
  const connector = createConnector(pluginData);
  const registry = new SettingRegistry({ connector });
  const host = new Widget();

  const manager = new ThemeManager({
    host,
    key: pluginData.id,
    settings: registry,
    url: '/themes'
  });

  // Wait for settings to load
  const settings = await registry.load(pluginData.id);

  // Register a dummy theme so the manager has something to work with
  manager.register({
    name: 'JupyterLab Light',
    displayName: 'JupyterLab Light',
    isLight: true,
    themeScrollbars: false,
    load: () => Promise.resolve(),
    unload: () => Promise.resolve()
  });

  // Wait for the manager to initialize
  await new Promise(resolve => setTimeout(resolve, 200));

  return { manager, settings };
}

describe('@jupyterlab/apputils', () => {
  describe('ThemeManager', () => {
    afterEach(() => {
      // Clean up any CSS overrides set on the document
      document.documentElement.style.removeProperty('--jp-code-font-size');
      document.documentElement.style.removeProperty('--jp-content-font-size1');
      document.documentElement.style.removeProperty('--jp-code-font-family');
      document.documentElement.style.removeProperty('--jp-content-font-family');
      document.documentElement.style.removeProperty('--jp-ui-font-size1');
      document.documentElement.style.removeProperty('--jp-ui-font-family');
    });

    describe('loadCSSOverrides', () => {
      it('should set content-font-size1 CSS variable when override is provided', async () => {
        const { manager } = await createThemeManager({
          'content-font-size1': '18px'
        });

        // The loadCSSOverrides is called during initialization
        const val =
          document.documentElement.style.getPropertyValue(
            '--jp-content-font-size1'
          );
        expect(val).toBe('18px');
      });

      it('should set code-font-size CSS variable when override is provided', async () => {
        const { manager } = await createThemeManager({
          'code-font-size': '16px'
        });

        const val =
          document.documentElement.style.getPropertyValue(
            '--jp-code-font-size'
          );
        expect(val).toBe('16px');
      });

      it('should derive code-font-size from content-font-size1 when only content-font-size1 is set', async () => {
        const { manager } = await createThemeManager({
          'content-font-size1': '18px'
        });

        // code-font-size should be derived: 18 * (13/14) = 16.7px (rounded)
        const val =
          document.documentElement.style.getPropertyValue(
            '--jp-code-font-size'
          );
        expect(val).toBe('16.7px');
      });

      it('should derive code-font-size with correct ratio for various content sizes', async () => {
        // Test with 20px: 20 * (13/14) = 18.6px
        const { manager } = await createThemeManager({
          'content-font-size1': '20px'
        });

        const val =
          document.documentElement.style.getPropertyValue(
            '--jp-code-font-size'
          );
        expect(val).toBe('18.6px');
      });

      it('should derive code-font-size with default theme ratio for 14px content', async () => {
        // Test with default 14px: 14 * (13/14) = 13px (the default)
        const { manager } = await createThemeManager({
          'content-font-size1': '14px'
        });

        const val =
          document.documentElement.style.getPropertyValue(
            '--jp-code-font-size'
          );
        expect(val).toBe('13px');
      });

      it('should NOT derive code-font-size when code-font-size is explicitly set', async () => {
        const { manager } = await createThemeManager({
          'content-font-size1': '18px',
          'code-font-size': '15px'
        });

        // Should use the explicitly set value, not the derived one
        const val =
          document.documentElement.style.getPropertyValue(
            '--jp-code-font-size'
          );
        expect(val).toBe('15px');
      });

      it('should NOT derive code-font-size when content-font-size1 is not set', async () => {
        const { manager } = await createThemeManager({});

        // No derived value should be set
        const val =
          document.documentElement.style.getPropertyValue(
            '--jp-code-font-size'
          );
        // Should be empty (not set) since no user override is provided
        expect(val).toBe('');
      });

      it('should handle rem units when deriving code-font-size', async () => {
        const { manager } = await createThemeManager({
          'content-font-size1': '1.2rem'
        });

        // 1.2 * (13/14) = 1.1rem (rounded to 1 decimal)
        const val =
          document.documentElement.style.getPropertyValue(
            '--jp-code-font-size'
          );
        expect(val).toBe('1.1rem');
      });

      it('should handle em units when deriving code-font-size', async () => {
        const { manager } = await createThemeManager({
          'content-font-size1': '1.4em'
        });

        // 1.4 * (13/14) = 1.3em
        const val =
          document.documentElement.style.getPropertyValue(
            '--jp-code-font-size'
          );
        expect(val).toBe('1.3em');
      });

      it('should handle pt units when deriving code-font-size', async () => {
        const { manager } = await createThemeManager({
          'content-font-size1': '14pt'
        });

        // 14 * (13/14) = 13pt
        const val =
          document.documentElement.style.getPropertyValue(
            '--jp-code-font-size'
          );
        expect(val).toBe('13pt');
      });

      it('should not derive code-font-size for invalid content-font-size1 formats', async () => {
        const { manager } = await createThemeManager({
          'content-font-size1': 'large'
        });

        // 'large' is a valid CSS font-size value but not parseable as number+unit
        // so no derived code-font-size should be set
        const codeFontSize =
          document.documentElement.style.getPropertyValue(
            '--jp-code-font-size'
          );
        // Should be empty since 'large' cannot be proportionally scaled
        expect(codeFontSize).toBe('');
      });

      it('should set content-font-size1 alongside derived code-font-size', async () => {
        const { manager } = await createThemeManager({
          'content-font-size1': '18px'
        });

        const contentVal =
          document.documentElement.style.getPropertyValue(
            '--jp-content-font-size1'
          );
        const codeVal =
          document.documentElement.style.getPropertyValue(
            '--jp-code-font-size'
          );

        expect(contentVal).toBe('18px');
        expect(codeVal).toBe('16.7px');
      });

      it('should set other overrides independently of font size derivation', async () => {
        const { manager } = await createThemeManager({
          'content-font-size1': '18px',
          'code-font-family': 'monospace'
        });

        const fontFamily =
          document.documentElement.style.getPropertyValue(
            '--jp-code-font-family'
          );
        expect(fontFamily).toBe('monospace');

        const codeSize =
          document.documentElement.style.getPropertyValue(
            '--jp-code-font-size'
          );
        expect(codeSize).toBe('16.7px');
      });
    });
  });
});
