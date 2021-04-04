import { expect } from 'chai';

import { offset_at_position, position_at_offset } from './positioning';

describe('positionAtOffset', () => {
  it('works with single line', () => {
    let position = position_at_offset(0, ['']);
    expect(position).deep.equal({ column: 0, line: 0 });

    position = position_at_offset(0, ['abc']);
    expect(position).deep.equal({ column: 0, line: 0 });

    position = position_at_offset(1, ['abc']);
    expect(position).deep.equal({ column: 1, line: 0 });

    position = position_at_offset(2, ['abc']);
    expect(position).deep.equal({ column: 2, line: 0 });
  });

  it('works with two lines', () => {
    let two_empty_lines = '\n'.split('\n');
    let two_single_character_lines = 'a\nb'.split('\n');

    let position = position_at_offset(0, two_empty_lines);
    expect(position).deep.equal({ column: 0, line: 0 });

    position = position_at_offset(1, two_empty_lines);
    expect(position).deep.equal({ column: 0, line: 1 });

    position = position_at_offset(1, two_single_character_lines);
    expect(position).deep.equal({ column: 1, line: 0 });

    position = position_at_offset(2, two_single_character_lines);
    expect(position).deep.equal({ column: 0, line: 1 });

    position = position_at_offset(3, two_single_character_lines);
    expect(position).deep.equal({ column: 1, line: 1 });
  });
});

describe('offsetAtPosition', () => {
  it('works with single line', () => {
    let offset = offset_at_position({ column: 0, line: 0 }, ['']);
    expect(offset).deep.equal(0);

    offset = offset_at_position({ column: 0, line: 0 }, ['abc']);
    expect(offset).deep.equal(0);

    offset = offset_at_position({ column: 1, line: 0 }, ['abc']);
    expect(offset).deep.equal(1);

    offset = offset_at_position({ column: 2, line: 0 }, ['abc']);
    expect(offset).deep.equal(2);
  });

  it('works with two lines', () => {
    let two_empty_lines = '\n'.split('\n');
    let two_single_character_lines = 'a\nb'.split('\n');

    let offset = offset_at_position({ column: 0, line: 0 }, two_empty_lines);
    expect(offset).deep.equal(0);

    offset = offset_at_position({ column: 0, line: 1 }, two_empty_lines);
    expect(offset).deep.equal(1);

    offset = offset_at_position(
      { column: 1, line: 0 },
      two_single_character_lines
    );
    expect(offset).deep.equal(1);

    offset = offset_at_position(
      { column: 0, line: 1 },
      two_single_character_lines
    );
    expect(offset).deep.equal(2);

    offset = offset_at_position(
      { column: 1, line: 1 },
      two_single_character_lines
    );
    expect(offset).deep.equal(3);
  });
});
