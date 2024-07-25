/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  IEditorHeading,
  PythonTableOfContentsModel
} from '@jupyterlab/fileeditor';
import { signalToPromise } from '@jupyterlab/testing';

describe('@jupyterlab/fileeditor', () => {
  describe('PythonTableOfContentsModel', () => {
    describe('#getHeadings', () => {
      it.each<[string, IEditorHeading[]]>([
        ['', []],
        ['a = 2', []],
        [
          'def f(a, b):',
          [
            {
              text: 'def f(a, b):',
              level: 1,
              line: 0
            }
          ]
        ],
        [
          'async def async_function():',
          [
            {
              text: 'async def async_function():',
              level: 1,
              line: 0
            }
          ]
        ],
        [
          'class Klass:',
          [
            {
              text: 'class Klass:',
              level: 1,
              line: 0
            }
          ]
        ],
        [
          'import pathlib',
          [
            {
              text: 'import pathlib',
              level: 1,
              line: 0
            }
          ]
        ],
        [
          'from pathlib import Path',
          [
            {
              text: 'from pathlib import Path',
              level: 1,
              line: 0
            }
          ]
        ],
        [
          'import subprocess\nfrom pathlib import Path\n\nimport tempfile',
          [
            {
              text: 'import subprocess',
              level: 1,
              line: 0
            }
          ]
        ],
        [
          'def f(a, b):\n    def g():\n        pass',
          [
            {
              text: 'def f(a, b):',
              level: 1,
              line: 0
            },
            {
              text: 'def g():',
              level: 2,
              line: 1
            }
          ]
        ],
        [
          'def f(a, b):\n    def g():\n        class C:',
          [
            {
              text: 'def f(a, b):',
              level: 1,
              line: 0
            },
            {
              text: 'def g():',
              level: 2,
              line: 1
            },
            {
              text: 'class C:',
              level: 3,
              line: 2
            }
          ]
        ],
        [
          'def f(a, b):\n    def g():\n        pass\n    pass\ndef h():',
          [
            {
              text: 'def f(a, b):',
              level: 1,
              line: 0
            },
            {
              text: 'def g():',
              level: 2,
              line: 1
            },
            {
              text: 'def h():',
              level: 1,
              line: 4
            }
          ]
        ]
      ])('should extract headings from %s', async (text, headers) => {
        const model = new PythonTableOfContentsModel({
          content: {
            model: {
              mimeType: 'text/x-python',
              sharedModel: {
                getSource: () => text
              }
            }
          } as any
        } as any);

        const newHeadings = signalToPromise(model.headingsChanged);
        model.isActive = true; // This will trigger refresh
        if (headers.length > 0) {
          // If text has no associated headings the new computed headings
          // are gonna be empty. So the signal won't be emitted.
          await newHeadings;
        } else {
          await model.refresh();
        }
        const headings = model.headings;

        expect(headings).toHaveLength(headers.length);
        for (let i = 0; i < headers.length; i++) {
          expect(headings[i]).toEqual(headers[i]);
        }
      });
    });
  });
});
