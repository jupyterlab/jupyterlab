import { ICodeOverride, replacer } from './tokens';

abstract class OverridesMap extends Map<RegExp, string | replacer> {
  protected constructor(magic_overrides: ICodeOverride[]) {
    super(magic_overrides.map(m => [new RegExp(m.pattern), m.replacement]));
  }

  abstract override_for(code: string): string | null;

  protected _override_for(code: string): string | null {
    for (let [key, value] of this) {
      if (code.match(key)) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return code.replace(key, value);
      }
    }
    return null;
  }
}

export class ReversibleOverridesMap extends OverridesMap {
  private overrides: ICodeOverride[];

  constructor(magic_overrides: ICodeOverride[]) {
    super(magic_overrides);
    this.overrides = magic_overrides;
  }

  get reverse(): OverridesMap {
    return this.type(this.overrides.map(override => override.reverse));
  }

  type(overrides: ICodeOverride[]) {
    return new ReversibleOverridesMap(overrides);
  }

  override_for(cell: string): string | null {
    return super._override_for(cell);
  }

  replace_all(
    raw_lines: string[],
    map: OverridesMap = this
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
