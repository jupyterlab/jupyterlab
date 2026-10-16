// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IInlineCompletionContext } from '@jupyterlab/completer';
import {
  HistoryInlineCompletionProvider,
  InlineCompletionTriggerKind
} from '@jupyterlab/completer';
import { KernelMessage } from '@jupyterlab/services';
import {
  KernelMock,
  SessionConnectionMock
} from '@jupyterlab/services/lib/testutils';
import { Widget } from '@lumino/widgets';

describe('completer/default/inlinehistoryprovider', () => {
  const provider = new HistoryInlineCompletionProvider({});
  const kernel = new KernelMock({});
  const widget = new Widget();
  const context: IInlineCompletionContext = {
    widget,
    triggerKind: InlineCompletionTriggerKind.Invoke,
    session: new SessionConnectionMock({}, kernel)
  };

  afterAll(() => {
    widget.dispose();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['df[0]', '', 'df[[]0]*'],
    ['df[', '', 'df[[]*'],
    ['a*', '', 'a[*]*'],
    ['x?', '', 'x[?]*'],
    ['[?*]', '', '[[][?][*]]*'],
    ['close]', '', 'close]*'],
    ['df', '[0]', 'df*[[]0]*'],
    ['df', '?*', 'df*[?][*]*'],
    ['[[]', '[?]', '[[][[]]*[[][?]]*'],
    ['α[0]', 'β?', 'α[[]0]*β[?]*'],
    ['df', '.shape', 'df*.shape*'],
    ['df', '', 'df*']
  ])(
    'should search for literal prefix %s and suffix %s',
    async (prefix, suffix, pattern) => {
      await provider.fetch(
        { text: prefix + suffix, offset: prefix.length },
        context
      );

      expect(kernel.requestHistory).toHaveBeenCalledWith({
        output: false,
        raw: true,
        hist_access_type: 'search',
        pattern,
        unique: true,
        n: 100
      });
    }
  );

  it('should use only the current line for the search fragments', async () => {
    const prefix = 'previous[0]\ndf[';
    await provider.fetch(
      { text: prefix + '?]\nnext*', offset: prefix.length },
      context
    );

    expect(kernel.requestHistory).toHaveBeenCalledWith(
      expect.objectContaining({ pattern: 'df[[]*[?]]*' })
    );
  });

  it('should retain tail requests for an empty prefix', async () => {
    await provider.fetch({ text: '[?*]', offset: 0 }, context);

    expect(kernel.requestHistory).toHaveBeenCalledWith({
      output: false,
      raw: true,
      hist_access_type: 'tail',
      n: 100
    });
  });

  it('should return the completion between literal fragments', async () => {
    const reply = KernelMessage.createMessage<KernelMessage.IHistoryReplyMsg>({
      channel: 'shell',
      msgType: 'history_reply',
      session: '',
      content: {
        status: 'ok',
        history: [[1, 1, 'df[0].loc[1]']]
      }
    });
    jest.spyOn(kernel, 'requestHistory').mockResolvedValueOnce(reply);

    const result = await provider.fetch(
      { text: 'df[0][1]', offset: 'df[0]'.length },
      context
    );

    expect(result).toEqual({ items: [{ insertText: '.loc' }] });
    expect(kernel.requestHistory).toHaveBeenCalledWith(
      expect.objectContaining({ pattern: 'df[[]0]*[[]1]*' })
    );
  });
});
