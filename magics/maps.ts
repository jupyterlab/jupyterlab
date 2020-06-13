import { IMagicOverride, IMagicOverrideRule, replacer } from './overrides';

abstract class MagicsMap extends Map<RegExp, string | replacer> {
  protected constructor(magic_overrides: IMagicOverrideRule[]) {
    super(magic_overrides.map((m) => [new RegExp(m.pattern), m.replacement]));
  }

  abstract override_for(code: string): string | null;

  protected _override_for(code: string): string | null {
    for (let [key, value] of this) {
      if (code.match(key)) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        return code.replace(key, value);
      }
    }
    return null;
  }
}

abstract class ReversibleMagicsMap extends MagicsMap {
  protected abstract type(overrides: IMagicOverrideRule[]): any;
  private overrides: IMagicOverride[];

  constructor(magic_overrides: IMagicOverride[]) {
    super(magic_overrides);
    this.overrides = magic_overrides;
  }

  get reverse(): MagicsMap {
    return this.type(this.overrides.map((override) => override.reverse));
  }
}

export class CellMagicsMap extends ReversibleMagicsMap {
  type(overrides: IMagicOverride[]) {
    return new CellMagicsMap(overrides);
  }

  override_for(cell: string): string | null {
    return super._override_for(cell);
  }
}

export class LineMagicsMap extends ReversibleMagicsMap {
  type(overrides: IMagicOverride[]) {
    return new LineMagicsMap(overrides);
  }

  override_for(line: string): string | null {
    return super._override_for(line);
  }

  replace_all(
    raw_lines: string[],
    map: MagicsMap = this
  ): { lines: string[]; skip_inspect: boolean[] } {
    let substituted_lines = new Array<string>();
    let skip_inspect = new Array<boolean>();

    for (let i = 0; i < raw_lines.length; i++) {
      let line = raw_lines[i];
      let override = map.override_for(line);
      substituted_lines.push(override == null ? line : override);
      skip_inspect.push(override != null);
    }
    return {
      lines: substituted_lines,
      skip_inspect: skip_inspect
    };
  }

  reverse_replace_all(raw_lines: string[]): string[] {
    return this.replace_all(raw_lines, this.reverse).lines;
  }
}
