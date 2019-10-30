import { IMagicOverride } from './overrides';

abstract class MagicsMap extends Map<RegExp, string> {
  constructor(magic_overrides: IMagicOverride[]) {
    super(magic_overrides.map(m => [new RegExp(m.pattern), m.replacement]));
  }

  abstract override_for(code: string): string | null;

  protected _override_for(code: string): string | null {
    for (let [key, value] of this) {
      if (code.match(key)) {
        return code.replace(key, value);
      }
    }
    return null;
  }
}

export class CellMagicsMap extends MagicsMap {
  override_for(cell: string): string | null {
    const line_end = cell.indexOf('\n');
    let first_line = line_end === -1 ? cell : cell.substring(0, line_end);
    return super._override_for(first_line);
  }
}

export class LineMagicsMap extends MagicsMap {
  override_for(line: string): string | null {
    return super._override_for(line);
  }

  replace_all(
    raw_lines: string[]
  ): { lines: string[]; skip_inspect: boolean[] } {
    let substituted_lines = new Array<string>();
    let skip_inspect = new Array<boolean>();

    for (let i = 0; i < raw_lines.length; i++) {
      let line = raw_lines[i];
      let override = this.override_for(line);
      substituted_lines.push(override === null ? line : override);
      skip_inspect.push(override !== null);
    }
    return {
      lines: substituted_lines,
      skip_inspect: skip_inspect
    };
  }
}
