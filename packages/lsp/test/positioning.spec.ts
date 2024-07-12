/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { offsetAtPosition, positionAtOffset } from '@jupyterlab/lsp';

describe('positionAtOffset', () => {
  it('works with single line', () => {
    let position = positionAtOffset(0, ['']);
    expect(position).toEqual({ column: 0, line: 0 });

    position = positionAtOffset(0, ['abc']);
    expect(position).toEqual({ column: 0, line: 0 });

    position = positionAtOffset(1, ['abc']);
    expect(position).toEqual({ column: 1, line: 0 });

    position = positionAtOffset(2, ['abc']);
    expect(position).toEqual({ column: 2, line: 0 });
  });

  it('works with two lines', () => {
    let twoEmptyLines = '\n'.split('\n');
    let twoSingleCharacterLines = 'a\nb'.split('\n');

    let position = positionAtOffset(0, twoEmptyLines);
    expect(position).toEqual({ column: 0, line: 0 });

    position = positionAtOffset(1, twoEmptyLines);
    expect(position).toEqual({ column: 0, line: 1 });

    position = positionAtOffset(1, twoSingleCharacterLines);
    expect(position).toEqual({ column: 1, line: 0 });

    position = positionAtOffset(2, twoSingleCharacterLines);
    expect(position).toEqual({ column: 0, line: 1 });

    position = positionAtOffset(3, twoSingleCharacterLines);
    expect(position).toEqual({ column: 1, line: 1 });
  });
});

describe('offsetAtPosition', () => {
  it('works with single line', () => {
    let offset = offsetAtPosition({ column: 0, line: 0 }, ['']);
    expect(offset).toEqual(0);

    offset = offsetAtPosition({ column: 0, line: 0 }, ['abc']);
    expect(offset).toEqual(0);

    offset = offsetAtPosition({ column: 1, line: 0 }, ['abc']);
    expect(offset).toEqual(1);

    offset = offsetAtPosition({ column: 2, line: 0 }, ['abc']);
    expect(offset).toEqual(2);
  });

  it('works with two lines', () => {
    let twoEmptyLines = '\n'.split('\n');
    let twoSingleCharacterLines = 'a\nb'.split('\n');

    let offset = offsetAtPosition({ column: 0, line: 0 }, twoEmptyLines);
    expect(offset).toEqual(0);

    offset = offsetAtPosition({ column: 0, line: 1 }, twoEmptyLines);
    expect(offset).toEqual(1);

    offset = offsetAtPosition({ column: 1, line: 0 }, twoSingleCharacterLines);
    expect(offset).toEqual(1);

    offset = offsetAtPosition({ column: 0, line: 1 }, twoSingleCharacterLines);
    expect(offset).toEqual(2);

    offset = offsetAtPosition({ column: 1, line: 1 }, twoSingleCharacterLines);
    expect(offset).toEqual(3);
  });
});
