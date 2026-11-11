// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// CSS text and style sheets of the svg of a LabIcon: the references that CSS
// makes to ids of the svg, and the rewrite of the rules of its style elements
// so that they match the elements of each copy of the svg.

export const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';
let cssDocument: Document | undefined;

/**
 * A token of a CSS text, as the CSS syntax specification splits it.
 */
export interface IToken {
  /**
   * "ws", "comment", "string", "url", "bad" for a string or url that CSS
   * drops, "function", "ident", "hash", or else the character itself.
   */
  type: string;
  start: number;
  end: number;
  /** The decoded name of a function, ident or hash, or text of a string or url. */
  value: string;
  /** Where the text of a string or url ends, before its closing quote or ")". */
  valueEnd: number;
}

/**
 * Split a CSS text into tokens as the CSS syntax specification does. A
 * number is split into characters, which does not matter here.
 */
export function tokenize(text: string): IToken[] {
  const tokens: IToken[] = [];
  let i = 0;
  const peek = (offset = 0) => text[i + offset] ?? '';
  const isNewline = (c: string) => c === '\n' || c === '\r' || c === '\f';
  const isSpace = (c: string) => c === ' ' || c === '\t' || isNewline(c);
  const isNameStart = (c: string) => /^[a-z_]$/i.test(c) || c >= '\u0080';
  const isName = (c: string) => isNameStart(c) || /^[\d-]$/.test(c);
  const isEscape = (offset = 0) =>
    peek(offset) === '\\' && !isNewline(peek(offset + 1));
  // after a backslash
  const consumeEscape = () => {
    let hex = '';
    while (hex.length < 6 && /^[\da-f]$/i.test(peek())) {
      hex += text[i++];
    }
    if (!hex) {
      return text[i++] ?? '\ufffd';
    }
    if (isSpace(peek())) {
      i += peek() === '\r' && peek(1) === '\n' ? 2 : 1;
    }
    const code = parseInt(hex, 16);
    return code === 0 || code > 0x10ffff || (code >= 0xd800 && code < 0xe000)
      ? '\ufffd'
      : String.fromCodePoint(code);
  };
  const consumeName = () => {
    let name = '';
    for (;;) {
      if (isName(peek())) {
        name += text[i++];
      } else if (isEscape()) {
        i++;
        name += consumeEscape();
      } else {
        return name;
      }
    }
  };
  while (i < text.length) {
    const start = i;
    const c = text[i];
    let type = c;
    let value = '';
    let valueEnd = -1;
    if (isSpace(c)) {
      type = 'ws';
      while (isSpace(peek())) {
        i++;
      }
    } else if (c === '/' && peek(1) === '*') {
      type = 'comment';
      const close = text.indexOf('*/', i + 2);
      i = close < 0 ? text.length : close + 2;
    } else if (c === '"' || c === "'") {
      type = 'string';
      i++;
      while (valueEnd < 0) {
        const d = peek();
        if (d === c || d === '') {
          valueEnd = i;
          i += d.length;
        } else if (isNewline(d)) {
          // the newline starts the next token
          type = 'bad';
          break;
        } else if (d !== '\\') {
          value += d;
          i++;
        } else if (isNewline(peek(1))) {
          i += peek(1) === '\r' && peek(2) === '\n' ? 3 : 2;
        } else {
          i++;
          value += peek() ? consumeEscape() : '';
        }
      }
    } else if (c === '#' && (isName(peek(1)) || isEscape(1))) {
      type = 'hash';
      i++;
      value = consumeName();
    } else if (
      isNameStart(c) ||
      isEscape() ||
      (c === '-' && (isNameStart(peek(1)) || peek(1) === '-' || isEscape(1)))
    ) {
      type = 'ident';
      value = consumeName();
      let k = i + 1;
      while (isSpace(text[k] ?? '')) {
        k++;
      }
      if (
        peek() === '(' &&
        value.toLowerCase() === 'url' &&
        text[k] !== '"' &&
        text[k] !== "'"
      ) {
        type = 'url';
        value = '';
        i = k;
        for (;;) {
          const d = peek();
          if (d === ')' || d === '' || isSpace(d)) {
            valueEnd = i;
            while (isSpace(peek())) {
              i++;
            }
            if (peek() === ')' || peek() === '') {
              i += peek().length;
              break;
            }
            type = 'bad';
          } else if ('"\'('.includes(d) || (d === '\\' && !isEscape())) {
            type = 'bad';
          }
          if (type === 'bad') {
            // the rest of a bad url, to the next ")"
            while (peek() && peek() !== ')') {
              i += isEscape() ? 2 : 1;
            }
            i += peek().length;
            break;
          }
          i++;
          value += d === '\\' ? consumeEscape() : d;
        }
      } else if (peek() === '(') {
        type = 'function';
        i++;
      }
    } else {
      i++;
    }
    tokens.push({ type, start, end: i, value, valueEnd });
  }
  return tokens;
}

/**
 * A url() of a CSS text that names an id, as in `url(#a)` or `url("#a")`.
 */
export interface IUrlReference {
  id: string;
  /** Where the url() starts and ends. */
  start: number;
  end: number;
  /** Where the id ends, before the closing quote or ")". */
  idEnd: number;
}

/**
 * The url() references of a CSS text to the ids for which `refer` holds.
 */
export function urlReferences(
  text: string,
  refer: (id: string) => boolean
): IUrlReference[] {
  const tokens = tokenize(text);
  const references: IUrlReference[] = [];
  const skipSpace = (k: number) => {
    while (tokens[k]?.type === 'ws' || tokens[k]?.type === 'comment') {
      k++;
    }
    return k;
  };
  tokens.forEach((token, k) => {
    let url = token;
    let end = token.end;
    if (token.type === 'function' && token.value.toLowerCase() === 'url') {
      const string = skipSpace(k + 1);
      const close = skipSpace(string + 1);
      url = tokens[string];
      if (url?.type !== 'string' || (tokens[close]?.type ?? ')') !== ')') {
        return;
      }
      end = tokens[close]?.end ?? text.length;
    } else if (token.type !== 'url') {
      return;
    }
    const id = url.value.slice(1);
    if (url.value[0] === '#' && refer(id)) {
      references.push({ id, start: token.start, end, idEnd: url.valueEnd });
    }
  });
  return references;
}

/**
 * Replace the parts of a text between the given starts and ends, which come
 * in order.
 */
export function edit(text: string, edits: [number, number, string][]): string {
  let result = '';
  let last = 0;
  for (const [start, end, replacement] of edits) {
    result += text.slice(last, start) + replacement;
    last = end;
  }
  return result + text.slice(last);
}

/**
 * The selector that a rule of the copies of an icon adds to the compound
 * selectors that must match in a copy: the elements of a copy, and elements
 * added to it.
 */
function scopeFilter(scope: string): string {
  return `:where([data-icon-scope="${scope}"], [data-icon-scope="${scope}"] *)`;
}

/**
 * The selector of the root of each copy of an icon, with the specificity of
 * `:root`.
 */
function scopeRoot(scope: string): string {
  return `[data-icon]:where([data-icon-scope="${scope}"])`;
}

/**
 * What the rewrite of a selector needs to know about the svg, and the names
 * that it reads.
 */
export interface ISelectorContext {
  /** The value of data-icon-scope in the copies of the svg. */
  scope: string;
  /** The ids of the svg. */
  ids: Set<string>;
  /** The ids that copies rename. */
  renamed: Set<string>;
  /** The names of the attributes that copies change, in lower case. */
  changed: Set<string>;
  /** The names of the changed attributes that selectors read, added to. */
  read: Set<string>;
  /** The ids that selectors name, added to. */
  named: Set<string>;
}

/**
 * Rewrite a selector list so that it matches in each copy what it matches in
 * the svg shown inline, with the same specificity. The subject of a selector,
 * a compound that names an id of the svg and a compound in `:has()` must
 * match in a copy; other compounds can match elements of the page.
 */
export function rewriteSelector(
  selector: string,
  context: ISelectorContext
): string {
  const tokens = tokenize(selector);
  const filter = scopeFilter(context.scope);
  let result = '';
  // a frame for the selector list and for each parenthesis in it, with the
  // compound selectors of it that get the filter, before a pseudo-element
  const frames = [newFrame('subject')];
  const endCompound = (k: number) => {
    const frame = frames[frames.length - 1];
    const at = frame.pseudoElement < 0 ? result.length : frame.pseudoElement;
    if (
      frame.open &&
      (frame.filter === 'all' ||
        frame.namesId ||
        (frame.filter === 'subject' && isSubjectEnd(tokens, k)))
    ) {
      result = result.slice(0, at) + filter + result.slice(at);
    }
    frame.open = false;
    frame.namesId = false;
    frame.pseudoElement = -1;
  };
  for (let k = 0; k < tokens.length; k++) {
    const token = tokens[k];
    const next = tokens[k + 1];
    const frame = frames[frames.length - 1];
    let part = selector.slice(token.start, token.end);
    if (token.type === ')' && frames.length > 1) {
      endCompound(k);
      frames.pop();
    } else if ([',', 'ws', '>', '+', '~'].includes(token.type)) {
      endCompound(k);
    } else {
      frame.open = true;
    }
    const pseudoClass =
      token.type === ':' && next?.type === 'ident'
        ? next.value.toLowerCase()
        : '';
    if (token.type === 'function' || token.type === '(') {
      frames.push(
        newFrame(token.value.toLowerCase() === 'has' ? 'all' : 'ids')
      );
    } else if (token.type === 'hash') {
      context.named.add(token.value);
      frame.namesId ||= context.ids.has(token.value);
      if (context.renamed.has(token.value)) {
        context.read.add('id');
        part = `:is(${part},[data-original-id=${part.slice(1)}])`;
      }
    } else if (token.type === ':' && next?.type === ':') {
      if (frame.pseudoElement < 0) {
        frame.pseudoElement = result.length;
      }
      part = '::';
      k++;
    } else if (pseudoClass === 'root') {
      part = scopeRoot(context.scope);
      k++;
    } else if (token.type === '[') {
      let namesId: boolean;
      [k, part, namesId] = rewriteAttributeSelector(
        selector,
        tokens,
        k,
        context
      );
      frame.namesId ||= namesId;
    }
    result += part;
  }
  endCompound(tokens.length);
  return result;
}

/**
 * A selector list or a parenthesis of a selector: which of its compound
 * selectors get the filter, and the state of the current one.
 */
interface ISelectorFrame {
  /**
   * "subject" for the subject of each selector and those that name an id of
   * the svg, "all", or "ids" for those that name an id of the svg only.
   */
  filter: 'subject' | 'all' | 'ids';
  open: boolean;
  namesId: boolean;
  pseudoElement: number;
}

function newFrame(filter: ISelectorFrame['filter']): ISelectorFrame {
  return { filter, open: false, namesId: false, pseudoElement: -1 };
}

/**
 * Whether the compound selector that ends at `tokens[k]` is the subject of
 * its selector, which no combinator follows.
 */
function isSubjectEnd(tokens: IToken[], k: number): boolean {
  while (tokens[k]?.type === 'ws') {
    k++;
  }
  return !tokens[k] || tokens[k].type === ',';
}

/**
 * Rewrite the attribute selector that starts at `tokens[k]`, as in
 * `[href="#a" i]`, if it reads an attribute that copies change. Return the
 * index of its closing bracket, its new text, and whether it names an id.
 */
function rewriteAttributeSelector(
  text: string,
  tokens: IToken[],
  k: number,
  context: ISelectorContext
): [number, string, boolean] {
  let close = k + 1;
  while (close < tokens.length && tokens[close].type !== ']') {
    close++;
  }
  const selector = text.slice(tokens[k].start, tokens[close]?.end);
  const name = tokens[k + 1];
  // a selector with a namespace prefix, as in [xlink|href], stays as it is
  const prefixed = tokens[k + 2]?.type === '|' && tokens[k + 3]?.type !== '=';
  if (name?.type !== 'ident' || prefixed) {
    return [close, selector, false];
  }
  const lowerName = name.value.toLowerCase();
  if (!context.changed.has(lowerName)) {
    return [close, selector, false];
  }
  context.read.add(lowerName);
  const original = `data-original-${text.slice(name.start, name.end)}`;
  const rest = text.slice(name.end, tokens[close]?.start);
  // the root of a copy has a style attribute for its custom properties
  const unchanged =
    lowerName === 'style' ? `[${original}],[data-icon]` : `[${original}]`;
  return [
    close,
    `:is([${original}${rest}],${selector}:where(:not(${unchanged})))`,
    true
  ];
}

/**
 * The text of a style element that the browser parses: that of its text
 * children, without the text of its element children.
 */
export function styleText(style: Element): string {
  return textChildren(style)
    .map(node => node.data)
    .join('');
}

/**
 * Give a style element a new text, and keep its element children.
 */
export function setStyleText(style: Element, text: string): void {
  textChildren(style).forEach((node, index) => {
    node.data = index === 0 ? text : '';
  });
}

function textChildren(node: Node): Text[] {
  return Array.from(node.childNodes).filter(
    (child): child is Text =>
      child.nodeType === Node.TEXT_NODE ||
      child.nodeType === Node.CDATA_SECTION_NODE
  );
}

/**
 * Parse a style sheet with the CSS parser of the browser, in a document that
 * has no window, so that its rules apply nowhere. Return null where no sheet
 * is made there, as in jsdom.
 */
export function parseStyleSheet(text: string): CSSStyleSheet | null {
  cssDocument ??= document.implementation.createHTMLDocument('');
  const style = cssDocument.createElement('style');
  style.textContent = text;
  cssDocument.head.appendChild(style);
  if (!style.sheet) {
    style.remove();
  }
  return style.sheet;
}

/**
 * The text of a style sheet that `parseStyleSheet` gave, which it then
 * removes from the document.
 */
export function serializeStyleSheet(sheet: CSSStyleSheet): string {
  const text = Array.from(sheet.cssRules, rule => rule.cssText).join('\n');
  sheet.ownerNode?.remove();
  return text;
}

type RuleParent = CSSStyleSheet | CSSGroupingRule;

/**
 * Call `visit` for each rule of a style sheet or group, after its own rules.
 */
function walkRules(
  parent: RuleParent,
  visit: (rule: CSSRule, parent: RuleParent) => void
): void {
  for (const rule of Array.from(parent.cssRules)) {
    if (isGroupingRule(rule)) {
      walkRules(rule, visit);
    }
    visit(rule, parent);
  }
}

function indexOf(parent: RuleParent, rule: CSSRule): number {
  return Array.from(parent.cssRules).indexOf(rule);
}

/**
 * Rewrite the declarations of a style sheet that apply to elements with
 * `rewrite`, and give their animations the names of `copyKeyframes`.
 */
export function rewriteDeclarations(
  sheet: CSSStyleSheet,
  rewrite: (text: string) => string,
  keyframes: Map<string, string>
): void {
  walkRules(sheet, rule => {
    // the declarations of style rules, keyframes, CSS functions and the
    // like; the descriptors of an at-rule such as @font-face cannot hold
    // var(), but their url() cannot name an element of the svg either
    if (hasStyle(rule)) {
      renameAnimations(rule.style, keyframes);
      const text = rewrite(rule.style.cssText);
      if (text !== rule.style.cssText) {
        rule.style.cssText = text;
      }
    }
  });
}

/**
 * Rewrite the selectors of the rules of a style sheet with `rewriteSelector`.
 */
export function rewriteSelectors(
  sheet: CSSStyleSheet,
  context: ISelectorContext
): void {
  walkRules(sheet, rule => {
    if (rule instanceof CSSStyleRule) {
      rule.selectorText = rewriteSelector(rule.selectorText, context);
    }
  });
}

/**
 * Give each keyframes rule of a style sheet a copy with a name of the icon,
 * as in `pulse-jp-icon-2`, and add the new name of each to `keyframes`. The
 * animations of the svg name the copy, and the original stays for page CSS
 * and for a name in a custom property.
 */
export function copyKeyframes(
  sheet: CSSStyleSheet,
  scope: string,
  keyframes: Map<string, string>
): void {
  walkRules(sheet, (rule, parent) => {
    if (!(rule instanceof CSSKeyframesRule)) {
      return;
    }
    const index = indexOf(parent, rule);
    const name = `${rule.name}-jp-icon-${scope}`;
    keyframes.set(rule.name, CSS.escape(name));
    parent.insertRule(rule.cssText, index + 1);
    (parent.cssRules[index + 1] as CSSKeyframesRule).name = name;
  });
}

/**
 * The keywords of the parts of the `animation` shorthand other than the name,
 * and of `steps()`.
 */
const ANIMATION_KEYWORDS = new Set(
  [
    'linear ease ease-in ease-out ease-in-out step-start step-end auto',
    'infinite normal reverse alternate alternate-reverse',
    'forwards backwards both running paused',
    'start end jump-start jump-end jump-none jump-both'
  ].flatMap(keywords => keywords.split(' '))
);

/**
 * Give the animations of a declaration block the new names of their
 * keyframes from `copyKeyframes`.
 */
export function renameAnimations(
  style: CSSStyleDeclaration,
  keyframes: Map<string, string>
): void {
  // the browser gives no longhands of a shorthand that holds var(), so the
  // names are read from the text of the shorthand then; there, a name that
  // is also a keyword, as in "linear 1s linear", keeps the original keyframes
  const property = style.getPropertyValue('animation-name')
    ? 'animation-name'
    : 'animation';
  const value = style.getPropertyValue(property);
  const renamed = edit(
    value,
    tokenize(value).flatMap((token): [number, number, string][] => {
      const name = token.type === 'ident' && keyframes.get(token.value);
      const keyword =
        property === 'animation' &&
        ANIMATION_KEYWORDS.has(token.value.toLowerCase());
      return name && !keyword ? [[token.start, token.end, name]] : [];
    })
  );
  if (renamed !== value) {
    const priority = style.getPropertyPriority(property);
    style.setProperty(property, renamed, priority);
  }
}

function isGroupingRule(rule: CSSRule): rule is CSSGroupingRule {
  return 'cssRules' in rule;
}

/**
 * Whether a rule holds declarations, as a style rule, a keyframe, the
 * declarations nested in a rule or the result of a CSS function do.
 */
function hasStyle(
  rule: CSSRule
): rule is CSSRule & { style: CSSStyleDeclaration } {
  return 'style' in rule;
}
