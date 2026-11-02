// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { NbConvertManager } from '../../src/nbconvert';
import { ServerConnection } from '../../src/serverconnection';

describe('NbConvertManager', () => {
  let manager: NbConvertManager;
  let openSpy: jest.SpyInstance;

  beforeEach(() => {
    manager = new NbConvertManager({
      serverSettings: ServerConnection.makeSettings({
        baseUrl: 'http://localhost:8888/'
      })
    });
    openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  describe('.exportAs()', () => {
    it('should open the export URL with no query params by default', async () => {
      await manager.exportAs({ format: 'pdf', path: 'notebook.ipynb' });

      expect(openSpy).toHaveBeenCalledTimes(1);
      const url = new URL(openSpy.mock.calls[0][0]);
      expect(url.searchParams.toString()).toBe('');
    });

    it('should append download=true when download is set', async () => {
      await manager.exportAs({
        format: 'pdf',
        path: 'notebook.ipynb',
        exporterOptions: { download: true }
      });

      const url = new URL(openSpy.mock.calls[0][0]);
      expect(url.searchParams.get('download')).toBe('true');
      expect(url.searchParams.get('sanitize_html')).toBeNull();
    });

    it('should append sanitize_html=true when sanitizeHtml is set', async () => {
      await manager.exportAs({
        format: 'html',
        path: 'notebook.ipynb',
        exporterOptions: { sanitizeHtml: true }
      });

      const url = new URL(openSpy.mock.calls[0][0]);
      expect(url.searchParams.get('sanitize_html')).toBe('true');
      expect(url.searchParams.get('download')).toBeNull();
    });

    it('should combine download and sanitize_html params', async () => {
      await manager.exportAs({
        format: 'html',
        path: 'notebook.ipynb',
        exporterOptions: { download: true, sanitizeHtml: true }
      });

      const url = new URL(openSpy.mock.calls[0][0]);
      expect(url.searchParams.get('download')).toBe('true');
      expect(url.searchParams.get('sanitize_html')).toBe('true');
    });

    it('should not append sanitize_html when false', async () => {
      await manager.exportAs({
        format: 'html',
        path: 'notebook.ipynb',
        exporterOptions: { sanitizeHtml: false }
      });

      const url = new URL(openSpy.mock.calls[0][0]);
      expect(url.searchParams.get('sanitize_html')).toBeNull();
    });

    it('should encode the notebook path in the URL', async () => {
      await manager.exportAs({
        format: 'html',
        path: 'my folder/notebook.ipynb'
      });

      const url = openSpy.mock.calls[0][0] as string;
      expect(url).toContain('my%20folder/notebook.ipynb');
    });
  });
});
