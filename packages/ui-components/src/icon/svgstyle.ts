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
 * added to it. It has the text that browsers serialize it to, so that
 * `rewriteSelector` finds it in a selector of a copy given again as an svg.
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
  /** The keys of the attributes that copies change, in lower case. */
  changed: Set<string>;
  /** The keys of the changed attributes that selectors read, added to. */
  read: Set<string>;
  /** The ids that selectors name, added to. */
  named: Set<string>;
  /** The namespace prefixes of the style sheet. */
  namespaces: Map<string, string>;
}

/**
 * Where a selector stands: whether `:scope` and `&` stand for the root of the
 * svg, as `:root` does, and whether its subject must match in a copy, which
 * it need not for the context of other rules.
 */
export interface ISelectorPlace {
  scopeIsRoot: boolean;
  nestingIsRoot: boolean;
  subject: boolean;
}

/**
 * Rewrite a selector list so that it matches in each copy what it matches in
 * the svg shown inline, with the same specificity. The subject of a selector,
 * a compound that names an id of the svg and a compound in `:has()` must
 * match in a copy; other compounds can match elements of the page.
 */
export function rewriteSelector(
  selector: string,
  context: ISelectorContext,
  place: ISelectorPlace
): string {
  // the selectors of a copy that is given again as an svg name the scope of
  // that copy: they get the scope of this icon
  const text = selector.replace(
    /\[data-icon-scope="\d+"\]/g,
    `[data-icon-scope="${context.scope}"]`
  );
  const tokens = tokenize(text);
  const filter = scopeFilter(context.scope);
  let result = '';
  // a frame for the selector list and for each parenthesis in it, with the
  // compound selectors of it that get the filter, before a pseudo-element
  const frames = [newFrame(place.subject ? 'subject' : 'ids')];
  const endCompound = (k: number) => {
    const frame = frames[frames.length - 1];
    const at = frame.pseudoElement < 0 ? result.length : frame.pseudoElement;
    // a compound selector of a copy given again as an svg has the filter
    if (
      frame.open &&
      (frame.filter === 'all' ||
        frame.namesId ||
        (frame.filter === 'subject' && isSubjectEnd(tokens, k))) &&
      !result.slice(0, at).endsWith(filter)
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
    let part = text.slice(token.start, token.end);
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
    } else if (
      pseudoClass === 'root' ||
      (place.scopeIsRoot && pseudoClass === 'scope')
    ) {
      part = scopeRoot(context.scope);
      k++;
    } else if (place.nestingIsRoot && token.type === '&') {
      // "&" for the root has no specificity
      part = `:where(${scopeRoot(context.scope)})`;
    } else if (token.type === '[') {
      let namesId: boolean;
      [k, part, namesId] = rewriteAttributeSelector(text, tokens, k, context);
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
 * The index of the token that closes the function, parenthesis or block at
 * `tokens[k]`.
 */
function closeOf(tokens: IToken[], k: number): number {
  const [open, close] = tokens[k]?.type === '{' ? ['{', '}'] : ['(', ')'];
  for (let depth = 0; k < tokens.length; k++) {
    const type = tokens[k].type;
    depth +=
      type === open || (open === '(' && type === 'function')
        ? 1
        : type === close
          ? -1
          : 0;
    if (depth === 0) {
      return k;
    }
  }
  return tokens.length - 1;
}

/**
 * Rewrite the attribute selector that starts at `tokens[k]`, as in
 * `[xlink|href="#a" i]`, if it reads an attribute that copies change. Return
 * the index of its closing bracket, its new text, and whether it names an id.
 */
function rewriteAttributeSelector(
  text: string,
  tokens: IToken[],
  k: number,
  context: ISelectorContext
): [number, string, boolean] {
  let j = k + 1;
  // a namespace prefix, as in "xlink|", "*|" or "|"
  let namespace: string | undefined = '';
  if (tokens[j]?.type === '|') {
    j++;
  } else if (tokens[j + 1]?.type === '|' && tokens[j + 2]?.type !== '=') {
    namespace =
      tokens[j].type === '*' ? '*' : context.namespaces.get(tokens[j].value);
    j += 2;
  }
  let close = j;
  while (close < tokens.length && tokens[close].type !== ']') {
    close++;
  }
  const selector = text.slice(tokens[k].start, tokens[close]?.end);
  const name = tokens[j];
  if (name?.type !== 'ident') {
    return [close, selector, false];
  }
  const nameText = text.slice(name.start, name.end);
  const lowerName = name.value.toLowerCase();
  const rest = text.slice(name.end, tokens[close]?.start);
  // in a copy that is given again as an svg, this selector stands inside
  // the one that this function wrote, for the elements without an original
  // value: it stays as it is
  const following = tokens
    .slice(close + 1, close + 7)
    .map(token => token.value.toLowerCase() || token.type)
    .join(' ');
  if (following.startsWith(': where : not [ data-original-')) {
    return [close, selector, false];
  }
  // the keys of an attribute without a namespace, and of an XLink attribute
  const prefixes: string[] = [];
  if (namespace === '' || namespace === '*') {
    prefixes.push('');
  }
  if (namespace === XLINK_NAMESPACE || namespace === '*') {
    prefixes.push('xlink-');
  }
  const keys = prefixes.filter(prefix =>
    context.changed.has(prefix + lowerName)
  );
  if (!keys.length) {
    return [close, selector, false];
  }
  const originals = keys.map(prefix => {
    context.read.add(prefix + lowerName);
    return `data-original-${prefix}${nameText}`;
  });
  const original = originals.map(attribute => `[${attribute}${rest}]`);
  const unchanged = originals.map(attribute => `[${attribute}]`);
  if (lowerName === 'style') {
    // the root of a copy has a style attribute for its custom properties
    unchanged.push('[data-icon]');
  }
  return [
    close,
    `:is(${original.join(',')},${selector}:where(:not(${unchanged.join(',')})))`,
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

function parentOf(rule: CSSRule, sheet: CSSStyleSheet): RuleParent {
  const parent = rule.parentRule;
  return parent && isGroupingRule(parent) ? parent : sheet;
}

function indexOf(parent: RuleParent, rule: CSSRule): number {
  return Array.from(parent.cssRules).indexOf(rule);
}

/**
 * Put a rule written as `text` in the place of `rule`.
 */
function replaceRule(parent: RuleParent, rule: CSSRule, text: string): void {
  const index = indexOf(parent, rule);
  parent.insertRule(text, index);
  parent.deleteRule(index + 1);
}

/**
 * Rewrite the declarations of a style sheet that apply to elements with
 * `rewrite`. Give the rules that set the new initial value of each custom
 * property that the sheet registers with one that `rewrite` changes, as an
 * initial value cannot hold `var()`.
 */
export function rewriteDeclarations(
  sheet: CSSStyleSheet,
  rewrite: (text: string) => string,
  scope: string,
  keyframes: Map<string, string>
): string[] {
  const initialValues: string[] = [];
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
    } else if (isPropertyRule(rule) && rule.initialValue) {
      const value = rewrite(rule.initialValue);
      if (value !== rule.initialValue) {
        // a value that inherits is enough on the root
        const root = rule.inherits ? ':where([data-icon])' : '';
        initialValues.push(
          `${root}${scopeFilter(scope)}{${rule.name}:${value}}`
        );
      }
    }
  });
  return initialValues;
}

/**
 * Add the rules of `rewriteDeclarations` that set initial values to a style
 * sheet, in a layer that comes before the other layers of the sheet.
 */
export function addInitialValues(
  sheet: CSSStyleSheet,
  scope: string,
  rules: string[]
): void {
  if (rules.length) {
    // a layer statement may come before @import and @namespace rules
    sheet.insertRule(`@layer jp-icon-${scope};`, 0);
    sheet.insertRule(
      `@layer jp-icon-${scope}{${rules.join('')}}`,
      sheet.cssRules.length
    );
  }
}

/**
 * Rewrite the selectors of the rules of a style sheet with `rewriteSelector`.
 * The selector of a rule with nested rules is their context, which can match
 * elements of the page, so its declarations move to a rule of their own.
 */
export function rewriteSelectors(
  sheet: CSSStyleSheet,
  context: ISelectorContext
): void {
  context.namespaces.clear();
  for (const rule of Array.from(sheet.cssRules)) {
    if (rule instanceof CSSNamespaceRule) {
      context.namespaces.set(rule.prefix, rule.namespaceURI);
    }
  }
  walkRules(sheet, (rule, parent) => {
    // the nearest style rule or scope rule that holds the rule
    let owner: CSSRule | null = rule.parentRule;
    while (owner && !(owner instanceof CSSStyleRule || isScopeRule(owner))) {
      owner = owner.parentRule;
    }
    const place = (subject: boolean) => selectorPlace(rule, subject);
    if (rule instanceof CSSStyleRule) {
      const nested = rule.cssRules.length > 0;
      if (nested && rule.style.length) {
        const selector = rewriteSelector(
          rule.selectorText,
          context,
          place(true)
        );
        parent.insertRule(
          `${selector}{${rule.style.cssText}}`,
          indexOf(parent, rule)
        );
        rule.style.cssText = '';
      }
      rule.selectorText = rewriteSelector(
        rule.selectorText,
        context,
        place(!nested)
      );
    } else if (owner && hasStyle(rule) && !(rule instanceof CSSKeyframeRule)) {
      // declarations that follow nested rules apply to the elements of the
      // rule that holds them, or to the root of a scope with no specificity
      if (
        owner === parent &&
        owner instanceof CSSStyleRule &&
        rule === parent.cssRules[parent.cssRules.length - 1]
      ) {
        // the last ones go after the rule, where each of its selectors keeps
        // its own specificity
        const outer = parentOf(owner, sheet);
        const selector = rewriteSelector(
          owner.selectorText,
          context,
          selectorPlace(owner, true)
        );
        outer.insertRule(
          `${selector}{${rule.style.cssText}}`,
          indexOf(outer, owner) + 1
        );
        parent.deleteRule(indexOf(parent, rule));
      } else {
        const selector = owner instanceof CSSStyleRule ? '&' : ':where(:scope)';
        replaceRule(
          parent,
          rule,
          `${selector}${scopeFilter(context.scope)}{${rule.style.cssText}}`
        );
      }
    } else if (isScopeRule(rule) && (rule.start || rule.end)) {
      // the selectors of a scope rule cannot change, so replace the rule; in
      // its start, :scope and & stand for the root outside other rules, and in
      // its end, for the root of the scope
      const { nestingIsRoot } = place(false);
      const startPlace = {
        scopeIsRoot: nestingIsRoot,
        nestingIsRoot,
        subject: false
      };
      const start = rule.start
        ? `(${rewriteSelector(rule.start, context, startPlace)})`
        : '';
      const endPlace = {
        scopeIsRoot: false,
        nestingIsRoot: false,
        subject: false
      };
      const end = rule.end
        ? ` to (${rewriteSelector(rule.end, context, endPlace)})`
        : '';
      const body = Array.from(rule.cssRules, r => r.cssText).join('\n');
      replaceRule(parent, rule, `@scope ${start}${end} {${body}}`);
    }
  });
}

/**
 * Where the selector of a rule stands: :scope is the root outside scope
 * rules, and & outside both scope rules and style rules.
 */
function selectorPlace(rule: CSSRule, subject: boolean): ISelectorPlace {
  let inStyleRule = false;
  let inScopeRule = false;
  for (let p = rule.parentRule; p; p = p.parentRule) {
    inStyleRule ||= p instanceof CSSStyleRule;
    inScopeRule ||= isScopeRule(p);
  }
  return {
    scopeIsRoot: !inScopeRule,
    nestingIsRoot: !inStyleRule && !inScopeRule,
    subject
  };
}

/**
 * Give each name that the style texts of an svg define for keyframes and
 * layers a suffix of the icon, as in `pulse-jp-icon-2`, and a name to each
 * anonymous layer. A copy given again as an svg loses the suffixes of its
 * earlier scope. Give the new texts, and the new names of the keyframes.
 */
export function renameDefinitions(
  texts: string[],
  scope: string
): [string[], Map<string, string>] {
  const keyframes = new Map<string, string>();
  const oldSuffix = /-jp-icon-\d+$/;
  // "jp-icon-2" is the layer of the initial values of registered properties
  const rename = (name: string) =>
    /^jp-icon-\d+$/.test(name)
      ? `jp-icon-${scope}`
      : `${name.replace(oldSuffix, '')}-jp-icon-${scope}`;
  let anonymous = 0;
  const renamed = texts.map(text => {
    const tokens = tokenize(text);
    const edits: [number, number, string][] = [];
    const renameToken = (token: IToken) => {
      const name = text.slice(token.start, token.end);
      edits.push([token.start, token.end, rename(name)]);
      return name;
    };
    for (let k = 0; k < tokens.length; k++) {
      if (tokens[k].type !== '@' || tokens[k + 1]?.type !== 'ident') {
        continue;
      }
      const keyword = tokens[k + 1].value.toLowerCase();
      // the prelude of the at-rule, to its ";" or "{"
      let end = k + 2;
      while (end < tokens.length && !';{'.includes(tokens[end].type)) {
        end++;
      }
      const prelude = tokens
        .slice(k + 2, end)
        .filter(token => token.type !== 'ws' && token.type !== 'comment');
      if (keyword.endsWith('keyframes') && prelude[0]?.type === 'ident') {
        // the animations of the svg name a copy with a name of the icon, and
        // the original stays for page CSS and for a name in a custom property
        const start = tokens[k].start;
        const name = text.slice(prelude[0].start, prelude[0].end);
        const close = closeOf(tokens, end);
        keyframes.set(name, rename(name));
        if (oldSuffix.test(name)) {
          // a copy given again as an svg drops its old copy, as the original
          // makes a new one
          edits.push([start, tokens[close].end, '']);
        } else {
          const copy =
            text.slice(start, prelude[0].start) +
            rename(name) +
            text.slice(prelude[0].end, tokens[close].end);
          edits.push([tokens[close].end, tokens[close].end, copy]);
        }
        k = close;
        continue;
      } else if (keyword === 'layer' && prelude.length) {
        // as in "@layer a, b.c;" or "@layer a {"
        prelude.filter(token => token.type === 'ident').forEach(renameToken);
      } else if (keyword === 'layer' && tokens[end]?.type === '{') {
        const at = tokens[k + 1].end;
        edits.push([at, at, ` ${rename(`jp-layer-${anonymous++}`)}`]);
      } else if (keyword === 'import') {
        // as in "@import url(x) layer(a)" or "@import url(x) layer"
        const layer = prelude.findIndex(
          token =>
            (token.type === 'ident' || token.type === 'function') &&
            token.value.toLowerCase() === 'layer'
        );
        if (prelude[layer]?.type === 'function') {
          for (let j = layer + 1; prelude[j]?.type === 'ident'; j += 2) {
            renameToken(prelude[j]);
          }
        } else if (layer >= 0) {
          const { start, end: last } = prelude[layer];
          const name = rename(`jp-layer-${anonymous++}`);
          edits.push([start, last, `layer(${name})`]);
        }
      }
      k = end;
    }
    return edit(text, edits);
  });
  return [renamed, keyframes];
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
 * keyframes from `renameDefinitions`.
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

function isScopeRule(rule: CSSRule): rule is CSSScopeRule {
  return 'start' in rule;
}

function isPropertyRule(rule: CSSRule): rule is CSSPropertyRule {
  return 'initialValue' in rule;
}
