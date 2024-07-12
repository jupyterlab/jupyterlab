// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterServer } from '@jupyterlab/testing';
import { KernelSpecAPI } from '../../src';
import { getRequestHandler, makeSettings, PYTHON_SPEC } from '../utils';

const PYTHON3_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
PYTHON3_SPEC.name = 'Python3';
PYTHON3_SPEC.display_name = 'python3';

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
}, 30000);

afterAll(async () => {
  await server.shutdown();
});

describe('kernel', () => {
  describe('KernelSpec.getSpecs()', () => {
    it('should load the kernelspecs', async () => {
      const specs = await KernelSpecAPI.getSpecs();
      expect(specs.default).toBeTruthy();
    });

    it('should accept ajax options', async () => {
      const serverSettings = makeSettings();
      const specs = await KernelSpecAPI.getSpecs(serverSettings);
      expect(specs.default).toBeTruthy();
    });

    it('should handle a missing default parameter', async () => {
      const serverSettings = getRequestHandler(200, {
        kernelspecs: { python: PYTHON_SPEC }
      });
      const specs = await KernelSpecAPI.getSpecs(serverSettings);
      expect(specs.default).toBeTruthy();
    });

    it('should throw for a missing kernelspecs parameter', async () => {
      const serverSettings = getRequestHandler(200, {
        default: PYTHON_SPEC.name
      });
      const promise = KernelSpecAPI.getSpecs(serverSettings);
      await expect(promise).rejects.toThrow(/No kernelspecs found/);
    });

    it('should omit an invalid kernelspec', async () => {
      const R_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
      R_SPEC.name = 1;
      const serverSettings = getRequestHandler(200, {
        default: 'python',
        kernelspecs: {
          R: R_SPEC,
          python: PYTHON_SPEC
        }
      });
      const specs = await KernelSpecAPI.getSpecs(serverSettings);
      expect(specs.default).toBe('python');
      expect(specs.kernelspecs['R']).toBeUndefined();
    });

    it('should handle an improper name', async () => {
      const R_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
      R_SPEC.name = 1;
      const serverSettings = getRequestHandler(200, {
        default: 'R',
        kernelspecs: { R: R_SPEC }
      });
      const promise = KernelSpecAPI.getSpecs(serverSettings);
      await expect(promise).rejects.toThrow(/No valid kernelspecs found/);
    });

    it('should handle an improper language', async () => {
      const R_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
      R_SPEC.spec.language = 1;
      const serverSettings = getRequestHandler(200, {
        default: 'R',
        kernelspecs: { R: R_SPEC }
      });
      const promise = KernelSpecAPI.getSpecs(serverSettings);
      await expect(promise).rejects.toThrow(/No valid kernelspecs found/);
    });

    it('should handle an improper argv', async () => {
      const R_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
      R_SPEC.spec.argv = 'hello';
      const serverSettings = getRequestHandler(200, {
        default: 'R',
        kernelspecs: { R: R_SPEC }
      });
      const promise = KernelSpecAPI.getSpecs(serverSettings);
      await expect(promise).rejects.toThrow(/No valid kernelspecs found/);
    });

    it('should handle an improper display_name', async () => {
      const R_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
      R_SPEC.spec.display_name = ['hello'];
      const serverSettings = getRequestHandler(200, {
        default: 'R',
        kernelspecs: { R: R_SPEC }
      });
      const promise = KernelSpecAPI.getSpecs(serverSettings);
      await expect(promise).rejects.toThrow(/No valid kernelspecs found/);
    });

    it('should handle missing resources', async () => {
      const R_SPEC = JSON.parse(JSON.stringify(PYTHON_SPEC));
      delete R_SPEC.resources;
      const serverSettings = getRequestHandler(200, {
        default: 'R',
        kernelspecs: { R: R_SPEC }
      });
      const promise = KernelSpecAPI.getSpecs(serverSettings);
      await expect(promise).rejects.toThrow(/No valid kernelspecs found/);
    });

    it('should throw an error for an invalid response', async () => {
      const serverSettings = getRequestHandler(201, {});
      const promise = KernelSpecAPI.getSpecs(serverSettings);
      await expect(promise).rejects.toThrow(/Invalid response: 201/);
    });

    it('should handle metadata', async () => {
      const PYTHON_SPEC_W_MD = JSON.parse(JSON.stringify(PYTHON_SPEC));
      // eslint-disable-next-line camelcase
      PYTHON_SPEC_W_MD.spec.metadata = { some_application: { key: 'value' } };
      const serverSettings = getRequestHandler(200, {
        default: 'python',
        kernelspecs: { python: PYTHON_SPEC_W_MD }
      });
      const specs = await KernelSpecAPI.getSpecs(serverSettings);

      expect(specs.kernelspecs['python']).toHaveProperty('metadata');
      const metadata = specs.kernelspecs['python']!.metadata;
      expect(metadata).toHaveProperty('some_application');
      expect((metadata as any).some_application).toHaveProperty('key', 'value');
    });

    it('should handle env values', async () => {
      const PYTHON_SPEC_W_ENV = JSON.parse(JSON.stringify(PYTHON_SPEC));
      PYTHON_SPEC_W_ENV.spec.env = {
        SOME_ENV: 'some_value',
        LANG: 'en_US.UTF-8'
      };
      const serverSettings = getRequestHandler(200, {
        default: 'python',
        kernelspecs: { python: PYTHON_SPEC_W_ENV }
      });
      const specs = await KernelSpecAPI.getSpecs(serverSettings);

      expect(specs.kernelspecs['python']).toHaveProperty('env');
      const env = specs.kernelspecs['python']!.env;
      expect(env).toHaveProperty('SOME_ENV', 'some_value');
      expect(env).toHaveProperty('LANG', 'en_US.UTF-8');
    });
  });
});
