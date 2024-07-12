// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { KernelMessage } from '@jupyterlab/services';
import {
  ICompletionContext,
  KernelCompleterProvider
} from '@jupyterlab/completer';
import {
  KernelMock,
  SessionConnectionMock
} from '@jupyterlab/services/lib/testutils';

describe('completer/default/kernelprovider', () => {
  describe('KernelCompleterProvider', () => {
    const provider = new KernelCompleterProvider();
    const kernel = new KernelMock({});
    const connection = new SessionConnectionMock({}, kernel);
    const context: ICompletionContext = {
      widget: null as any,
      session: connection
    };

    describe('#fetch()', () => {
      it('should accept results with `_jupyter_types_experimental` metadata', async () => {
        kernel.requestComplete = async (
          contents: KernelMessage.ICompleteRequestMsg['content']
        ) => {
          return {
            channel: 'shell',
            header: {
              msg_id: '8a1cb99c-fdff731a5471adf71bcccb01_103588_3078',
              msg_type: 'complete_reply',
              username: '',
              session: '8a1cb99c-fdff731a5471adf71bcccb01',
              date: '2023-05-07T13:37:29.216298Z',
              version: '5.3'
            },
            parent_header: {
              date: '2023-05-07T13:37:29.092000Z',
              msg_id: '766951ae-5117-4282-abd3-b43b569aa496',
              msg_type: 'complete_request',
              session: '7ec9fde6-c8bb-40b2-a7f3-8e1b514f7037',
              username: '',
              version: '5.2'
            },
            metadata: {},
            content: {
              matches: ['staticmethod', 'str', '%store'],
              cursor_end: 2,
              cursor_start: 0,
              metadata: {
                _jupyter_types_experimental: [
                  {
                    start: 0,
                    end: 2,
                    text: 'staticmethod',
                    type: 'class',
                    signature: ''
                  },
                  {
                    start: 0,
                    end: 2,
                    text: 'str',
                    type: 'class',
                    signature: ''
                  },
                  {
                    start: 0,
                    end: 2,
                    text: '%store',
                    type: 'magic',
                    signature: ''
                  }
                ]
              },
              status: 'ok'
            }
          };
        };

        const result = await provider.fetch({ text: 'st', offset: 2 }, context);

        expect(result).toStrictEqual({
          start: 0,
          end: 2,
          items: [
            {
              label: 'staticmethod',
              type: 'class',
              insertText: 'staticmethod'
            },
            { label: 'str', type: 'class', insertText: 'str' },
            { label: '%store', type: 'magic', insertText: '%store' }
          ]
        });
      });

      it('should accept results without `_jupyter_types_experimental` metadata', async () => {
        kernel.requestComplete = async (
          contents: KernelMessage.ICompleteRequestMsg['content']
        ) => {
          return {
            channel: 'shell',
            header: {
              msg_id: '6bb75124-996c-45b6-80ce-cd28f490a9d2',
              session: 'fd6b9f46-6d46-4e11-b686-27f73b027f8d',
              username: '',
              date: '2023-05-07T13:10:54.600942Z',
              msg_type: 'complete_reply',
              version: '5.3'
            },
            parent_header: {
              date: '2023-05-07T13:10:54.586Z',
              msg_id: '7c93ba17-facd-44ed-b6a7-f34348a9ea42',
              msg_type: 'complete_request',
              session: 'fd6b9f46-6d46-4e11-b686-27f73b027f8d',
              username: '',
              version: '5.2'
            },
            metadata: {},
            content: {
              matches: [
                'plclust',
                'plnorm',
                'plogis',
                'plot',
                'plot.default',
                'plot.design',
                'plot.ecdf',
                'plot.function',
                'plot.new',
                'plot.spec.coherency',
                'plot.spec.phase',
                'plot.stepfun',
                'plot.ts',
                'plot.window',
                'plot.xy'
              ],
              metadata: {},
              cursor_start: 0,
              cursor_end: 2,
              status: 'ok'
            }
          };
        };

        const result = await provider.fetch({ text: 'pl', offset: 2 }, context);
        expect(result).toStrictEqual({
          start: 0,
          end: 2,
          items: [
            { label: 'plclust' },
            { label: 'plnorm' },
            { label: 'plogis' },
            { label: 'plot' },
            { label: 'plot.default' },
            { label: 'plot.design' },
            { label: 'plot.ecdf' },
            { label: 'plot.function' },
            { label: 'plot.new' },
            { label: 'plot.spec.coherency' },
            { label: 'plot.spec.phase' },
            { label: 'plot.stepfun' },
            { label: 'plot.ts' },
            { label: 'plot.window' },
            { label: 'plot.xy' }
          ]
        });
      });
    });
  });
});
