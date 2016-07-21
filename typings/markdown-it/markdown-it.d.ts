declare var MarkdownIt: {
  (preset?: string, options?: MarkdownIt.Options): MarkdownIt.MarkdownIt;
  new (preset?: string, options?: MarkdownIt.Options): MarkdownIt.MarkdownIt;
}

declare namespace MarkdownIt {
  export interface Token {
    attrs: string[][];
    block: boolean;
    children: Token[];
    content: string;
    hidden: boolean;
    info: string;
    level: number;
    map: number[];
    markup: string;
    meta: any;
    nesting: number;
    tag: string;
    type: string;

    attrIndex(attrName: string): number;
    attrJoin(name: string, value: string): void;
    attrPush(attr: string[]): void;
    attrSet(name: string, value: string): void;
  }

  export interface Rule {
    (state: any): void;
  }

  export interface Ruler {
    after(afterName: string, ruleName: string, rule: Rule, options?: any): void;
    at(name: string, rule: Rule, options?: any): void;
    before(beforeName: string, ruleName: string, rule: Rule, options?: any): void;
    disable(rules: string | string[], ignoreInvalid?: boolean): string[];
    enable(rules: string | string[], ignoreInvalid?: boolean): string[];
    enableOnly(rule: string, ignoreInvalid?: boolean): void;
    getRules(chain: string): Rule[];
    push(ruleName: string, rule: Rule, options?: any): void;
  }

  export interface RendererRule {
    (tokens: Token[], ix: number, options: any, env: any, md: MarkdownIt): string;
  }

  export interface Renderer {
    render(tokens: Token[], options: any, env: any): string;
    renderAttrs(token: Token): string;
    renderInline(tokens: Token[], options: any, env: any): string;
    renderToken(tokens: Token[], idx: number, options?: any): string;
    rules: { [tokenType: string]: RendererRule };
  }

  export interface ParserBlock {
    parse(src: string, md: MarkdownIt, env: any, outTokens: Token[]): void;
    ruler: Ruler;
  }

  export interface Core {
    process(state: any): void;
    ruler: Ruler;
  }

  export interface ParserInline {
    parse(src: string, md: MarkdownIt, env: any, outTokens: Token[]): void;
    ruler: Ruler;
    ruler2: Ruler;
  }

  export interface Options {
    html?: boolean;
    xhtmlOut?: boolean;
    breaks?: boolean;
    langPrefix?: string;
    linkify?: boolean;
    typographer?: boolean;
    quotes?: string | string[];
    highlight?: (str:string, lang:string) => string;
  }

  export interface MarkdownIt {
    block: ParserBlock;
    core: Core;
    helpers: any;
    inline: ParserInline;
    linkify: any;
    renderer: Renderer;
    utils: any;

    options: any;
    normalizeLink: {(url: string): string};
    normalizeLinkText: {(url: string): string};
    validateLink: {(url: string): string};

    disable(rules: string | string[], ignoreInvalid?: boolean): MarkdownIt;
    enable(rules: string | string[], ignoreInvalid?: boolean): MarkdownIt;
    parse(src: string, env: any): Token[];
    parseInline(src: string, env: any): Token[];
    render(src: string, env: any): string;
    renderInline(src: string, env: any): string;
    use(plugin: any, ...params: any[]): MarkdownIt;
    render(src: string): string;
  }
}

export = MarkdownIt;
