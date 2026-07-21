// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ICompletionContext } from '@jupyterlab/completer';
import type { IDebugger } from '@jupyterlab/debugger';
import { Widget } from '@lumino/widgets';
import { DebuggerCompletionProvider } from '../src/debugger-completion-provider';

interface IMockSessionOptions {
  /**
   * Whether the adapter supports the DAP `completions` request.
   */
  supportsCompletionsRequest?: boolean;
  /**
   * Adapter-declared trigger characters; leave undefined for adapter default.
   */
  completionTriggerCharacters?: string[];
  /**
   * Mock for `IDebugger.ISession.sendRequest`.
   */
  sendRequest?: jest.Mock;
}

function mockSession(options: IMockSessionOptions = {}) {
  return {
    capabilities: {
      supportsCompletionsRequest: options.supportsCompletionsRequest ?? true,
      completionTriggerCharacters: options.completionTriggerCharacters
    },
    sendRequest: options.sendRequest ?? jest.fn()
  };
}

function mockService(
  options: {
    frame?: { id: number } | null;
    session?: ReturnType<typeof mockSession> | null;
  } = {}
): IDebugger {
  const { frame = null, session = null } = options;
  return { model: { callstack: { frame } }, session } as unknown as IDebugger;
}

describe('DebuggerCompletionProvider', () => {
  const widget = new Widget();
  const context: ICompletionContext = { widget };

  afterAll(() => {
    widget.dispose();
  });

  describe('#constructor()', () => {
    it('should have the expected identifier and rank', () => {
      const provider = new DebuggerCompletionProvider({
        debuggerService: mockService()
      });
      expect(provider.identifier).toBe('DebuggerCompletionProvider');
      expect(provider.rank).toBe(1000);
    });
  });

  describe('#isApplicable()', () => {
    it('should return false when not stopped at a frame', async () => {
      const provider = new DebuggerCompletionProvider({
        debuggerService: mockService({ session: mockSession() })
      });
      expect(await provider.isApplicable(context)).toBe(false);
    });

    it('should return false when there is no session', async () => {
      const provider = new DebuggerCompletionProvider({
        debuggerService: mockService({ frame: { id: 1 } })
      });
      expect(await provider.isApplicable(context)).toBe(false);
    });

    it('should return false when the adapter does not support completions', async () => {
      const provider = new DebuggerCompletionProvider({
        debuggerService: mockService({
          frame: { id: 1 },
          session: mockSession({ supportsCompletionsRequest: false })
        })
      });
      expect(await provider.isApplicable(context)).toBe(false);
    });

    it('should return true when stopped at a frame with completions support', async () => {
      const provider = new DebuggerCompletionProvider({
        debuggerService: mockService({
          frame: { id: 1 },
          session: mockSession()
        })
      });
      expect(await provider.isApplicable(context)).toBe(true);
    });
  });

  describe('#shouldShowContinuousHint()', () => {
    const provider = new DebuggerCompletionProvider({
      debuggerService: mockService({ session: mockSession() })
    });

    it('should return false when sourceChange is absent', () => {
      expect(provider.shouldShowContinuousHint(false, {})).toBe(false);
    });

    it('should return false when the change contains a deletion', () => {
      expect(
        provider.shouldShowContinuousHint(false, {
          sourceChange: [{ delete: 1 }]
        })
      ).toBe(false);
    });

    it('should return false for a non-trigger character', () => {
      expect(
        provider.shouldShowContinuousHint(false, {
          sourceChange: [{ insert: 'a' }]
        })
      ).toBe(false);
    });

    it('should return true for the default "." trigger character', () => {
      expect(
        provider.shouldShowContinuousHint(false, {
          sourceChange: [{ insert: '.' }]
        })
      ).toBe(true);
    });

    it('should honour trigger characters declared by the adapter', () => {
      const custom = new DebuggerCompletionProvider({
        debuggerService: mockService({
          session: mockSession({ completionTriggerCharacters: ['['] })
        })
      });
      expect(
        custom.shouldShowContinuousHint(false, {
          sourceChange: [{ insert: '[' }]
        })
      ).toBe(true);
      // The default "." does not apply when the adapter declares its own.
      expect(
        custom.shouldShowContinuousHint(false, {
          sourceChange: [{ insert: '.' }]
        })
      ).toBe(false);
    });
  });

  describe('#fetch()', () => {
    it('should return an empty reply when there is no session', async () => {
      const provider = new DebuggerCompletionProvider({
        debuggerService: mockService()
      });
      expect(await provider.fetch({ text: 'df.', offset: 3 }, context)).toEqual(
        { start: 0, end: 0, items: [] }
      );
    });

    it('should request completions with a 1-based column and the frame id', async () => {
      const sendRequest = jest.fn().mockResolvedValue({
        success: true,
        body: { targets: [{ label: 'head', start: 3, length: 0 }] }
      });
      const provider = new DebuggerCompletionProvider({
        debuggerService: mockService({
          frame: { id: 5 },
          session: mockSession({ sendRequest })
        })
      });
      await provider.fetch({ text: 'df.', offset: 3 }, context);
      expect(sendRequest).toHaveBeenCalledWith('completions', {
        text: 'df.',
        column: 4,
        frameId: 5
      });
    });

    it('should return an empty reply when the request is unsuccessful', async () => {
      const sendRequest = jest
        .fn()
        .mockResolvedValue({ success: false, body: { targets: [] } });
      const provider = new DebuggerCompletionProvider({
        debuggerService: mockService({
          frame: { id: 1 },
          session: mockSession({ sendRequest })
        })
      });
      expect(await provider.fetch({ text: 'df.', offset: 3 }, context)).toEqual(
        { start: 0, end: 0, items: [] }
      );
    });

    it('should return an empty reply when there are no targets', async () => {
      const sendRequest = jest
        .fn()
        .mockResolvedValue({ success: true, body: { targets: [] } });
      const provider = new DebuggerCompletionProvider({
        debuggerService: mockService({
          frame: { id: 1 },
          session: mockSession({ sendRequest })
        })
      });
      expect(await provider.fetch({ text: 'df.', offset: 3 }, context)).toEqual(
        { start: 0, end: 0, items: [] }
      );
    });

    it('should map DAP completion targets to completion items', async () => {
      const sendRequest = jest.fn().mockResolvedValue({
        success: true,
        body: {
          targets: [
            {
              label: 'head',
              text: 'head()',
              detail: 'Return the first n rows',
              type: 'function',
              start: 3,
              length: 0
            },
            { label: 'shape', start: 3, length: 0 }
          ]
        }
      });
      const provider = new DebuggerCompletionProvider({
        debuggerService: mockService({
          frame: { id: 1 },
          session: mockSession({ sendRequest })
        })
      });
      const reply = await provider.fetch({ text: 'df.', offset: 3 }, context);
      expect(reply.items).toEqual([
        {
          label: 'head',
          insertText: 'head()',
          documentation: 'Return the first n rows',
          type: 'function'
        },
        {
          label: 'shape',
          insertText: 'shape',
          documentation: undefined,
          type: undefined
        }
      ]);
    });

    it('should derive the replacement range from the first target', async () => {
      const sendRequest = jest.fn().mockResolvedValue({
        success: true,
        body: { targets: [{ label: 'head', start: 3, length: 4 }] }
      });
      const provider = new DebuggerCompletionProvider({
        debuggerService: mockService({
          frame: { id: 1 },
          session: mockSession({ sendRequest })
        })
      });
      const reply = await provider.fetch(
        { text: 'df.head', offset: 7 },
        context
      );
      expect(reply.start).toBe(3);
      expect(reply.end).toBe(7);
    });

    it('should fall back to the cursor offset when the target has no start', async () => {
      const sendRequest = jest.fn().mockResolvedValue({
        success: true,
        body: { targets: [{ label: 'head' }] }
      });
      const provider = new DebuggerCompletionProvider({
        debuggerService: mockService({
          frame: { id: 1 },
          session: mockSession({ sendRequest })
        })
      });
      const reply = await provider.fetch({ text: 'df.', offset: 3 }, context);
      expect(reply.start).toBe(3);
      expect(reply.end).toBe(3);
    });

    it('should return an empty reply when the request throws', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation();
      const sendRequest = jest
        .fn()
        .mockRejectedValue(new Error('connection closed'));
      const provider = new DebuggerCompletionProvider({
        debuggerService: mockService({
          frame: { id: 1 },
          session: mockSession({ sendRequest })
        })
      });
      expect(await provider.fetch({ text: 'df.', offset: 3 }, context)).toEqual(
        { start: 0, end: 0, items: [] }
      );
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });
});
