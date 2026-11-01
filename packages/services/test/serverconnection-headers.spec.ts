// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * Tests for custom header handling in ServerConnection.makeRequest (#5333).
 *
 * These tests live in a separate file to avoid the JupyterServer beforeAll/afterAll
 * that the main serverconnection.spec.ts requires — header tests only need a
 * mocked fetch, not a live kernel.
 */

import { ServerConnection } from '../src';

describe('ServerConnection custom header handling (#5333)', () => {
  it('should pass caller-supplied custom headers through to the request', async () => {
    let capturedHeaders: Headers | undefined;
    const settings = ServerConnection.makeSettings({
      token: 'settings-token',
      fetch: (input: RequestInfo) => {
        capturedHeaders = (input as Request).headers;
        return Promise.resolve(new Response('{}', { status: 200 }));
      }
    });
    await ServerConnection.makeRequest(
      settings.baseUrl + 'api/test',
      {
        method: 'GET',
        headers: { 'X-Tenant-Id': '42' }
      } as RequestInit,
      settings
    );
    expect(capturedHeaders?.get('X-Tenant-Id')).toBe('42');
    // The settings-provided Authorization should still be present.
    expect(capturedHeaders?.get('Authorization')).toBe('token settings-token');
  });

  it('should not append settings token when caller supplies Authorization', async () => {
    let capturedHeaders: Headers | undefined;
    const settings = ServerConnection.makeSettings({
      token: 'settings-token',
      fetch: (input: RequestInfo) => {
        capturedHeaders = (input as Request).headers;
        return Promise.resolve(new Response('{}', { status: 200 }));
      }
    });
    await ServerConnection.makeRequest(
      settings.baseUrl + 'api/test',
      {
        method: 'GET',
        headers: { Authorization: 'Bearer custom-token' }
      } as RequestInit,
      settings
    );
    // Caller's Authorization must win — only one value, not two appended.
    expect(capturedHeaders?.get('Authorization')).toBe('Bearer custom-token');
  });

  it('should add settings token when caller does not supply Authorization', async () => {
    let capturedHeaders: Headers | undefined;
    const settings = ServerConnection.makeSettings({
      token: 'settings-token',
      fetch: (input: RequestInfo) => {
        capturedHeaders = (input as Request).headers;
        return Promise.resolve(new Response('{}', { status: 200 }));
      }
    });
    await ServerConnection.makeRequest(
      settings.baseUrl + 'api/test',
      {},
      settings
    );
    expect(capturedHeaders?.get('Authorization')).toBe('token settings-token');
  });

  it('should not append XSRF token when caller supplies X-XSRFToken', async () => {
    let capturedHeaders: Headers | undefined;
    const cookieDescriptor = Object.getOwnPropertyDescriptor(
      document,
      'cookie'
    );
    Object.defineProperty(document, 'cookie', {
      get: () => '_xsrf=cookie-xsrf-token',
      configurable: true
    });
    const settings = ServerConnection.makeSettings({
      token: '',
      fetch: (input: RequestInfo) => {
        capturedHeaders = (input as Request).headers;
        return Promise.resolve(new Response('{}', { status: 200 }));
      }
    });
    await ServerConnection.makeRequest(
      settings.baseUrl + 'api/test',
      {
        method: 'POST',
        headers: { 'X-XSRFToken': 'caller-xsrf-token' }
      } as RequestInit,
      settings
    );
    // Caller's XSRF token must win — only one value, not two appended.
    expect(capturedHeaders?.get('X-XSRFToken')).toBe('caller-xsrf-token');
    // Restore cookie descriptor.
    if (cookieDescriptor) {
      Object.defineProperty(document, 'cookie', cookieDescriptor);
    } else {
      delete (document as { cookie?: string }).cookie;
    }
  });
});
