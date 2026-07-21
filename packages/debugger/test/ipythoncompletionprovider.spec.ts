// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ICompletionContext } from '@jupyterlab/completer';
import { Widget } from '@lumino/widgets';
import { DebuggerIPythonCompletionProvider } from '../src/ipythoncompletionprovider';
import type { IDebugger } from '../src/tokens';

interface IMockSessionOptions {
  /**
   * Adapter-declared trigger characters; leave undefined for adapter default.
   */
  completionTriggerCharacters?: string[];
  /**
   * Mock for `IDebugger.ISession.sendRequest`.
   */
  sendRequest?: jest.Mock;
  /**
   * The language reported by the kernel info.
   */
  kernelLanguage?: string;
}

function mockSession(options: IMockSessionOptions = {}) {
  return {
    capabilities: {
      completionTriggerCharacters: options.completionTriggerCharacters
    },
    sendRequest: options.sendRequest ?? jest.fn(),
    connection: {
      kernel: {
        info: Promise.resolve({
          language_info: { name: options.kernelLanguage ?? 'python' }
        })
      }
    }
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

/**
 * Simulate the `body.result` which debugpy returns when reading back the
 * payload variable: the Python `repr()` of the base64-encoded JSON payload.
 *
 * Base64 text contains no characters that `repr()` escapes, so the repr
 * is simply the text wrapped in single quotes.
 */
function evaluateResultOf(json: string): string {
  return "'" + btoa(json) + "'";
}

/**
 * Build the read-back result for a well-formed completions payload.
 */
function completionsPayload(
  tokLen: number,
  items: Array<[string, string]>
): string {
  return evaluateResultOf(
    `{"tok_len": ${tokLen}, "items": ${JSON.stringify(items)}}`
  );
}

/**
 * Mock `sendRequest` for the two-step fetch: debugpy execs the helper
 * definition (returning an empty result) and the payload is then returned
 * by a single-expression call of the helper.
 */
function mockEvaluate(payloadResult: string): jest.Mock {
  return jest
    .fn()
    .mockImplementation((_command, args) =>
      Promise.resolve(
        args.expression.startsWith('_jupyterlab_debugger_completions(')
          ? { success: true, body: { result: payloadResult } }
          : { success: true, body: { result: '' } }
      )
    );
}

function makeProvider(
  sendRequest: jest.Mock
): DebuggerIPythonCompletionProvider {
  return new DebuggerIPythonCompletionProvider({
    debuggerService: mockService({
      frame: { id: 1 },
      session: mockSession({ sendRequest })
    })
  });
}

describe('DebuggerIPythonCompletionProvider', () => {
  const widget = new Widget();
  const context: ICompletionContext = { widget };

  afterAll(() => {
    widget.dispose();
  });

  describe('#constructor()', () => {
    it('should have the expected identifier and rank above the DAP provider', () => {
      const provider = new DebuggerIPythonCompletionProvider({
        debuggerService: mockService()
      });
      expect(provider.identifier).toBe('DebuggerIPythonCompletionProvider');
      expect(provider.rank).toBe(1001);
    });
  });

  describe('#isApplicable()', () => {
    it('should return false when not stopped at a frame', async () => {
      const provider = new DebuggerIPythonCompletionProvider({
        debuggerService: mockService({ session: mockSession() })
      });
      expect(await provider.isApplicable(context)).toBe(false);
    });

    it('should return false when there is no session', async () => {
      const provider = new DebuggerIPythonCompletionProvider({
        debuggerService: mockService({ frame: { id: 1 } })
      });
      expect(await provider.isApplicable(context)).toBe(false);
    });

    it('should return false when the kernel language is not Python', async () => {
      const provider = new DebuggerIPythonCompletionProvider({
        debuggerService: mockService({
          frame: { id: 1 },
          session: mockSession({ kernelLanguage: 'R' })
        })
      });
      expect(await provider.isApplicable(context)).toBe(false);
    });

    it('should return true when stopped at a Python frame', async () => {
      const provider = new DebuggerIPythonCompletionProvider({
        debuggerService: mockService({
          frame: { id: 1 },
          session: mockSession()
        })
      });
      expect(await provider.isApplicable(context)).toBe(true);
    });
  });

  describe('#shouldShowContinuousHint()', () => {
    const provider = new DebuggerIPythonCompletionProvider({
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

    it('should return false for a regular character', () => {
      expect(
        provider.shouldShowContinuousHint(false, {
          sourceChange: [{ insert: 'a' }]
        })
      ).toBe(false);
    });

    it.each(["'", '"'])(
      'should return true for the %s quote (dict key trigger)',
      quote => {
        expect(
          provider.shouldShowContinuousHint(false, {
            sourceChange: [{ insert: quote }]
          })
        ).toBe(true);
      }
    );

    it('should return true for the default "." DAP trigger character', () => {
      expect(
        provider.shouldShowContinuousHint(false, {
          sourceChange: [{ insert: '.' }]
        })
      ).toBe(true);
    });

    it('should combine adapter trigger characters with quotes', () => {
      const custom = new DebuggerIPythonCompletionProvider({
        debuggerService: mockService({
          session: mockSession({ completionTriggerCharacters: ['['] })
        })
      });
      expect(
        custom.shouldShowContinuousHint(false, {
          sourceChange: [{ insert: '[' }]
        })
      ).toBe(true);
      expect(
        custom.shouldShowContinuousHint(false, {
          sourceChange: [{ insert: "'" }]
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
      const provider = new DebuggerIPythonCompletionProvider({
        debuggerService: mockService()
      });
      expect(
        await provider.fetch({ text: "df['", offset: 4 }, context)
      ).toEqual({ start: 0, end: 0, items: [] });
    });

    it('should define the helper and call it to read back the payload', async () => {
      const sendRequest = mockEvaluate(completionsPayload(0, []));
      const provider = new DebuggerIPythonCompletionProvider({
        debuggerService: mockService({
          frame: { id: 7 },
          session: mockSession({ sendRequest })
        })
      });
      await provider.fetch({ text: "df['", offset: 4 }, context);
      expect(sendRequest).toHaveBeenCalledTimes(2);
      expect(sendRequest).toHaveBeenNthCalledWith(
        1,
        'evaluate',
        expect.objectContaining({
          expression: expect.stringContaining(
            'def _jupyterlab_debugger_completions('
          ),
          frameId: 7,
          context: 'repl'
        })
      );
      expect(sendRequest).toHaveBeenNthCalledWith(
        2,
        'evaluate',
        expect.objectContaining({
          expression: `_jupyterlab_debugger_completions("df['", 4)`,
          frameId: 7,
          context: 'repl'
        })
      );
    });

    it('should only send the text up to the cursor', async () => {
      const sendRequest = mockEvaluate(completionsPayload(0, []));
      const provider = makeProvider(sendRequest);
      await provider.fetch({ text: "df['] + tail", offset: 4 }, context);
      const definition = sendRequest.mock.calls[0][1].expression;
      const call = sendRequest.mock.calls[1][1].expression;
      expect(definition).not.toContain('tail');
      expect(call).toBe(`_jupyterlab_debugger_completions("df['", 4)`);
    });

    it('should return an empty reply when the setup request is unsuccessful', async () => {
      const sendRequest = jest
        .fn()
        .mockResolvedValue({ success: false, body: { result: '' } });
      const provider = makeProvider(sendRequest);
      expect(
        await provider.fetch({ text: "df['", offset: 4 }, context)
      ).toEqual({ start: 0, end: 0, items: [] });
      expect(sendRequest).toHaveBeenCalledTimes(1);
    });

    it('should return an empty reply when the payload request is unsuccessful', async () => {
      const sendRequest = jest
        .fn()
        .mockImplementation((_command, args) =>
          Promise.resolve(
            args.expression.startsWith('_jupyterlab_debugger_completions(')
              ? { success: false, body: { result: '' } }
              : { success: true, body: { result: '' } }
          )
        );
      const provider = makeProvider(sendRequest);
      expect(
        await provider.fetch({ text: "df['", offset: 4 }, context)
      ).toEqual({ start: 0, end: 0, items: [] });
    });

    it('should return an empty reply when there are no completions', async () => {
      const sendRequest = mockEvaluate(completionsPayload(0, []));
      const provider = makeProvider(sendRequest);
      expect(
        await provider.fetch({ text: "df['", offset: 4 }, context)
      ).toEqual({ start: 0, end: 0, items: [] });
    });

    it('should return an empty reply when the request throws', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation();
      const sendRequest = jest
        .fn()
        .mockRejectedValue(new Error('connection closed'));
      const provider = makeProvider(sendRequest);
      expect(
        await provider.fetch({ text: "df['", offset: 4 }, context)
      ).toEqual({ start: 0, end: 0, items: [] });
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('should parse completions and derive the range from the token length', async () => {
      const sendRequest = mockEvaluate(
        completionsPayload(2, [
          ["'col_a'", 'dict key'],
          ["'col_b'", 'dict key']
        ])
      );
      const provider = makeProvider(sendRequest);
      // text before cursor is "df['"; tok_len = 2 → start = 4 - 2 = 2
      const reply = await provider.fetch({ text: "df['", offset: 4 }, context);
      expect(reply.start).toBe(2);
      expect(reply.end).toBe(4);
      expect(reply.items).toEqual([
        { label: "'col_a'", insertText: "'col_a'", type: 'dict key' },
        { label: "'col_b'", insertText: "'col_b'", type: 'dict key' }
      ]);
    });

    it('should map an empty completion type to undefined', async () => {
      const sendRequest = mockEvaluate(
        completionsPayload(1, [['n_rows=', '']])
      );
      const provider = makeProvider(sendRequest);
      const reply = await provider.fetch({ text: 'fn(n', offset: 4 }, context);
      expect(reply.items[0].type).toBeUndefined();
    });

    describe('payload decoding', () => {
      it('should round-trip keys containing single quotes', async () => {
        const sendRequest = mockEvaluate(
          completionsPayload(1, [["'it's'", 'dict key']])
        );
        const provider = makeProvider(sendRequest);
        const reply = await provider.fetch({ text: 'd[', offset: 2 }, context);
        expect(reply.items[0].label).toBe("'it's'");
      });

      it('should round-trip keys containing double quotes', async () => {
        const sendRequest = mockEvaluate(
          completionsPayload(1, [['say "hi"', 'dict key']])
        );
        const provider = makeProvider(sendRequest);
        const reply = await provider.fetch({ text: 'd[', offset: 2 }, context);
        expect(reply.items[0].label).toBe('say "hi"');
      });

      it('should round-trip Windows paths containing backslashes', async () => {
        const sendRequest = mockEvaluate(
          completionsPayload(1, [['C:\\Users\\data.csv', 'path']])
        );
        const provider = makeProvider(sendRequest);
        const reply = await provider.fetch({ text: "'C:", offset: 3 }, context);
        expect(reply.items[0].label).toBe('C:\\Users\\data.csv');
      });

      it('should round-trip newlines and tabs in completion text', async () => {
        const sendRequest = mockEvaluate(
          completionsPayload(1, [["'a\nb\tc'", 'dict key']])
        );
        const provider = makeProvider(sendRequest);
        const reply = await provider.fetch({ text: 'd[', offset: 2 }, context);
        expect(reply.items[0].label).toBe("'a\nb\tc'");
      });

      it('should round-trip non-ASCII text escaped by json.dumps', async () => {
        // Python's json.dumps escapes non-ASCII by default,
        // serializing "café" with a backslash-u escape sequence.
        const json = '{"tok_len": 1, "items": [["caf\\u00e9", ""]]}';
        const sendRequest = mockEvaluate(evaluateResultOf(json));
        const provider = makeProvider(sendRequest);
        const reply = await provider.fetch({ text: 'caf', offset: 3 }, context);
        expect(reply.items[0].label).toBe('café');
      });

      it('should accept a double-quoted Python repr', async () => {
        const json = '{"tok_len": 1, "items": [["a", "keyword"]]}';
        const sendRequest = mockEvaluate('"' + btoa(json) + '"');
        const provider = makeProvider(sendRequest);
        const reply = await provider.fetch({ text: 'a', offset: 1 }, context);
        expect(reply.items).toHaveLength(1);
      });

      it('should ignore malformed items in the payload', async () => {
        const json =
          '{"tok_len": 1, "items": [["good", "keyword"], "bad", ["short"], 42]}';
        const sendRequest = mockEvaluate(evaluateResultOf(json));
        const provider = makeProvider(sendRequest);
        const reply = await provider.fetch({ text: 'g', offset: 1 }, context);
        expect(reply.items).toEqual([
          { label: 'good', insertText: 'good', type: 'keyword' }
        ]);
      });

      it.each([
        ['a non-string result', 'None'],
        ['an unquoted result', btoa('{"tok_len": 0, "items": []}')],
        ['quoted non-base64 content', "'not base64!'"],
        ['base64 of invalid JSON', evaluateResultOf('not json')],
        [
          'a payload without tok_len',
          evaluateResultOf('{"items": [["a", "b"]]}')
        ]
      ])('should return an empty reply for %s', async (_, result) => {
        const sendRequest = mockEvaluate(result);
        const provider = makeProvider(sendRequest);
        expect(await provider.fetch({ text: 'a', offset: 1 }, context)).toEqual(
          { start: 0, end: 0, items: [] }
        );
      });
    });
  });
});
