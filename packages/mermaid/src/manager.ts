// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type MermaidType from 'mermaid';
import type MermaidElkType from '@mermaid-js/layout-elk';

import { PromiseDelegate } from '@lumino/coreutils';

import { LruCache } from '@jupyterlab/coreutils';

import { IThemeManager } from '@jupyterlab/apputils';

import {
  DETAILS_CLASS,
  IMermaidManager,
  MERMAID_CLASS,
  MERMAID_CODE_CLASS,
  MERMAID_DARK_THEME,
  MERMAID_DEFAULT_THEME,
  RE_DEFAULT_RENDERER,
  SUMMARY_CLASS,
  WARNING_CLASS
} from './tokens';

/**
 * A mermaid diagram manager with cache.
 */
export class MermaidManager implements IMermaidManager {
  protected _diagrams: LruCache<string, HTMLElement>;
  protected _themes: IThemeManager | null;

  constructor(options: MermaidManager.IOptions = {}) {
    this._diagrams = new LruCache({ maxSize: options.maxCacheSize || null });

    // handle reacting to themes
    if (options.themes) {
      Private.initThemes(options.themes || null);
      options.themes.themeChanged.connect(this.initialize, this);
    }
  }

  /**
   * Post-process to ensure mermaid diagrams contain only valid SVG and XHTML.
   */
  static cleanMermaidSvg(svg: string): string {
    svg = svg.replace(Private.RE_VOID_ELEMENT, Private.replaceVoidElement);
    return `${Private.SVG_XML_HEADER}${svg}`;
  }

  /**
   * Handle (re)-initializing mermaid based on external values.
   */
  initialize() {
    this._diagrams.clear();
    Private.initMermaid();
  }

  /**
   * Get the underlying, potentially un-initialized mermaid module.
   */
  async getMermaid(): Promise<typeof MermaidType> {
    return await Private.ensureMermaid();
  }

  /**
   * Get the version of the currently-loaded mermaid module
   */
  getMermaidVersion(): string | null {
    return Private.version();
  }

  /**
   * Get a pre-cached mermaid figure.
   *
   * This primarily exists for the needs of `marked`, which supports async node
   * visitors, but not async rendering.
   */
  getCachedFigure(text: string): HTMLElement | null {
    return this._diagrams.get(text);
  }

  /**
   * Attempt a raw rendering of mermaid to an SVG string, extracting some metadata.
   */
  async renderSvg(text: string): Promise<IMermaidManager.IRenderInfo> {
    const _mermaid = await this.getMermaid();
    await Private.ensureRenderers(text);

    const id = `jp-mermaid-${Private.nextMermaidId()}`;

    // create temporary element into which to render
    const el = document.createElement('div');
    document.body.appendChild(el);
    try {
      let { svg } = await _mermaid.render(id, text, el);
      svg = MermaidManager.cleanMermaidSvg(svg);

      const parser = new DOMParser();
      const doc = parser.parseFromString(svg, 'image/svg+xml');

      const info: IMermaidManager.IRenderInfo = { text, svg };
      const svgEl = doc.querySelector('svg');
      const { maxWidth } = svgEl?.style || {};
      info.width = maxWidth ? parseFloat(maxWidth) : null;
      const firstTitle = doc.querySelector('title');
      const firstDesc = doc.querySelector('desc');
      if (firstTitle) {
        info.accessibleTitle = firstTitle.textContent;
      }
      if (firstDesc) {
        info.accessibleDescription = firstDesc.textContent;
      }
      return info;
    } finally {
      el.remove();
    }
  }

  /**
   * Provide and cache a fully-rendered element, checking the cache first.
   */
  async renderFigure(text: string): Promise<HTMLElement> {
    // bail if already cached
    let output: HTMLElement | null = this._diagrams.get(text);

    if (output != null) {
      return output;
    }

    let className = MERMAID_CLASS;

    let result: HTMLElement | null = null;

    // the element that will be returned
    output = document.createElement('div');
    output.className = className;

    try {
      const response = await this.renderSvg(text);
      result = this.makeMermaidFigure(response);
    } catch (err) {
      output.classList.add(WARNING_CLASS);
      result = await this.makeMermaidError(text);
    }

    let version = this.getMermaidVersion();

    if (version) {
      result.dataset.jpMermaidVersion = version;
    }

    output.appendChild(result);

    // update the cache for use when rendering synchronously
    this._diagrams.set(text, output);

    return output;
  }

  /**
   * Provide a code block with the mermaid source.
   */
  makeMermaidCode(text: string): HTMLElement {
    // append the source
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.innerText = text;
    pre.appendChild(code);
    code.className = MERMAID_CODE_CLASS;
    code.textContent = text;
    return pre;
  }

  /**
   * Get the parser message element from a failed parse.
   *
   * This doesn't do much of anything if the text is successfully parsed.
   */
  async makeMermaidError(text: string): Promise<HTMLElement> {
    const _mermaid = await this.getMermaid();
    let errorMessage = '';
    try {
      await _mermaid.parse(text);
    } catch (err) {
      errorMessage = `${err}`;
    }

    const result = document.createElement('details');
    result.className = DETAILS_CLASS;
    const summary = document.createElement('summary');
    summary.className = SUMMARY_CLASS;
    summary.appendChild(this.makeMermaidCode(text));
    result.appendChild(summary);

    const warning = document.createElement('pre');
    warning.innerText = errorMessage;
    result.appendChild(warning);
    return result;
  }

  /**
   * Extract extra attributes to add to a generated figure.
   */
  makeMermaidFigure(info: IMermaidManager.IRenderInfo): HTMLElement {
    const figure = document.createElement('figure');
    const img = document.createElement('img');

    figure.appendChild(img);
    img.setAttribute(
      'src',
      `data:image/svg+xml,${encodeURIComponent(info.svg)}`
    );

    // add dimension information
    if (info.width) {
      img.width = info.width;
    }

    // add accessible alt title
    if (info.accessibleTitle) {
      img.setAttribute('alt', info.accessibleTitle);
    }

    figure.appendChild(this.makeMermaidCode(info.text));

    // add accessible caption, with fallback to raw mermaid source
    if (info.accessibleDescription) {
      const caption = document.createElement('figcaption');
      caption.className = 'sr-only';
      caption.textContent = info.accessibleDescription;
      figure.appendChild(caption);
    }

    return figure;
  }
}

/**
 * A namespace for implementation-specific details of this mermaid manager.
 */
export namespace MermaidManager {
  /**
   * Initialization options for the mermaid manager.
   */
  export interface IOptions {
    maxCacheSize?: number | null;
    themes?: IThemeManager | null;
  }
}

/**
 * A namespace for global, private mermaid data.
 */
namespace Private {
  let _themes: IThemeManager | null = null;
  let _mermaid: typeof MermaidType | null = null;
  let _mermaidElk: typeof MermaidElkType | null = null;
  let _loading: PromiseDelegate<typeof MermaidType> | null = null;
  let _loadingElk: PromiseDelegate<typeof MermaidElkType> | null = null;
  let _nextMermaidId = 0;
  let _version: string | null = null;

  /**
   * Cache a reference to the theme manager.
   */
  export function initThemes(themes: IThemeManager | null) {
    _themes = themes;
  }

  /**
   * Get the version of mermaid used for rendering.
   */
  export function version(): string | null {
    return _version;
  }

  /**
   * (Re-)initialize mermaid with lab-specific theme information
   */
  export function initMermaid(
    mermaid: typeof MermaidType | null = null
  ): boolean {
    mermaid = _mermaid;

    if (!mermaid) {
      return false;
    }

    let theme = MERMAID_DEFAULT_THEME;

    if (_themes) {
      const jpTheme = _themes.theme;
      theme =
        jpTheme && _themes.isLight(jpTheme)
          ? MERMAID_DEFAULT_THEME
          : MERMAID_DARK_THEME;
    }

    const fontFamily = window
      .getComputedStyle(document.body)
      .getPropertyValue('--jp-ui-font-family');

    mermaid.initialize({
      theme,
      fontFamily,
      securityLevel: 'strict',
      maxTextSize: 100000,
      maxEdges: 100000,
      startOnLoad: false
    });
    return true;
  }

  /**
   * Determine whether mermaid has been loaded yet.
   */
  export function getMermaid(): typeof MermaidType | null {
    return _mermaid;
  }

  /**
   * Provide a globally-unique, but unstable, ID for disambiguation.
   */
  export function nextMermaidId() {
    return _nextMermaidId++;
  }

  /**
   * Ensure mermaid has been lazily loaded once, initialized, and cached.
   */
  export async function ensureMermaid(): Promise<typeof MermaidType> {
    if (_mermaid != null) {
      return _mermaid;
    }
    if (_loading) {
      return _loading.promise;
    }
    _loading = new PromiseDelegate();
    _version = (await import('mermaid/package.json')).version;
    const tmpMermaid = (_mermaid = (await import('mermaid')).default);
    initMermaid(tmpMermaid);
    _mermaid = tmpMermaid;
    _loading.resolve(_mermaid);
    return _mermaid;
  }

  /** Detect and load any renderers configured via `%init` or YAML front matter.
   *
   * The current upstream behavior appears to be last-in wins, but check all.
   */
  export async function ensureRenderers(text: string): Promise<void> {
    let promises: Promise<any>[] = [];

    for (const match of [...text.matchAll(RE_DEFAULT_RENDERER)]) {
      switch ((match && match[2]) || null) {
        case 'elk':
          promises.push(Private.ensureMermaidElk());
          break;
      }
    }

    if (promises.length) {
      await Promise.all(promises);
    }
  }

  /**
   * Ensure mermaid-elk has been lazily loaded once, initialized, and cached.
   */
  export async function ensureMermaidElk(): Promise<typeof MermaidElkType> {
    if (_mermaidElk != null) {
      return _mermaidElk;
    }
    if (_loadingElk) {
      return _loadingElk.promise;
    }

    _loadingElk = new PromiseDelegate();

    const _mermaid = await ensureMermaid();

    const tmpElk = (await import('@mermaid-js/layout-elk')).default;
    _mermaid.registerLayoutLoaders(tmpElk);
    _mermaidElk = tmpElk;
    _loadingElk.resolve(_mermaidElk);
    return _mermaidElk;
  }

  /**
   * A regular expression for all void elements, which may include attributes and
   * a slash.
   *
   * @see https://developer.mozilla.org/en-US/docs/Glossary/Void_element
   *
   * Of these, only `<br>` is generated by Mermaid in place of `\n`,
   * but _any_ "malformed" tag will break the SVG rendering entirely.
   */
  export const RE_VOID_ELEMENT =
    /<\s*(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\s*([^>]*?)\s*>/gi;

  /**
   * Ensure a void element is closed with a slash, preserving any attributes.
   */
  export function replaceVoidElement(match: string, tag: string, rest: string) {
    rest = rest.trim();
    if (!rest.endsWith('/')) {
      rest = `${rest} /`;
    }
    return `<${tag} ${rest}>`;
  }

  /**
   * Named HTML entities with their decimal equivalent codes.
   *
   * @see https://www.w3.org/TR/WD-html40-970708/sgml/entities.html
   * */
  export const HTML_ENTITIES = `<!ENTITY Aacute "&#193;">
<!ENTITY aacute "&#225;">
<!ENTITY Acirc "&#194;">
<!ENTITY acirc "&#226;">
<!ENTITY acute "&#180;">
<!ENTITY AElig "&#198;">
<!ENTITY aelig "&#230;">
<!ENTITY Agrave "&#192;">
<!ENTITY agrave "&#224;">
<!ENTITY alefsym "&#8501;">
<!ENTITY Alpha "&#913;">
<!ENTITY alpha "&#945;">
<!ENTITY amp "&#38;">
<!ENTITY and "&#8869;">
<!ENTITY ang "&#8736;">
<!ENTITY Aring "&#197;">
<!ENTITY aring "&#229;">
<!ENTITY asymp "&#8776;">
<!ENTITY Atilde "&#195;">
<!ENTITY atilde "&#227;">
<!ENTITY Auml "&#196;">
<!ENTITY auml "&#228;">
<!ENTITY bdquo "&#8222;">
<!ENTITY Beta "&#914;">
<!ENTITY beta "&#946;">
<!ENTITY brvbar "&#166;">
<!ENTITY bull "&#8226;">
<!ENTITY cap "&#8745;">
<!ENTITY Ccedil "&#199;">
<!ENTITY ccedil "&#231;">
<!ENTITY cedil "&#184;">
<!ENTITY cent "&#162;">
<!ENTITY Chi "&#935;">
<!ENTITY chi "&#967;">
<!ENTITY circ "&#710;">
<!ENTITY clubs "&#9827;">
<!ENTITY cong "&#8773;">
<!ENTITY copy "&#169;">
<!ENTITY crarr "&#8629;">
<!ENTITY cup "&#8746;">
<!ENTITY curren "&#164;">
<!ENTITY dagger "&#8224;">
<!ENTITY Dagger "&#8225;">
<!ENTITY darr "&#8595;">
<!ENTITY dArr "&#8659;">
<!ENTITY deg "&#176;">
<!ENTITY Delta "&#916;">
<!ENTITY delta "&#948;">
<!ENTITY diams "&#9830;">
<!ENTITY divide "&#247;">
<!ENTITY Eacute "&#201;">
<!ENTITY eacute "&#233;">
<!ENTITY Ecirc "&#202;">
<!ENTITY ecirc "&#234;">
<!ENTITY Egrave "&#200;">
<!ENTITY egrave "&#232;">
<!ENTITY empty "&#8709;">
<!ENTITY emsp "&#8195;">
<!ENTITY ensp "&#8194;">
<!ENTITY epsilon "&#949;">
<!ENTITY Epsilon "&#917;">
<!ENTITY equiv "&#8801;">
<!ENTITY Eta "&#919;">
<!ENTITY eta "&#951;">
<!ENTITY ETH "&#208;">
<!ENTITY eth "&#240;">
<!ENTITY Euml "&#203;">
<!ENTITY euml "&#235;">
<!ENTITY exist "&#8707;">
<!ENTITY fnof "&#402;">
<!ENTITY forall "&#8704;">
<!ENTITY frac12 "&#189;">
<!ENTITY frac14 "&#188;">
<!ENTITY frac34 "&#190;">
<!ENTITY frasl "&#8260;">
<!ENTITY Gamma "&#915;">
<!ENTITY gamma "&#947;">
<!ENTITY ge "&#8805;">
<!ENTITY gt "&#62;">
<!ENTITY harr "&#8596;">
<!ENTITY hArr "&#8660;">
<!ENTITY hearts "&#9829;">
<!ENTITY hellip "&#8230;">
<!ENTITY Iacute "&#205;">
<!ENTITY iacute "&#237;">
<!ENTITY Icirc "&#206;">
<!ENTITY icirc "&#238;">
<!ENTITY iexcl "&#161;">
<!ENTITY Igrave "&#204;">
<!ENTITY igrave "&#236;">
<!ENTITY image "&#8465;">
<!ENTITY infin "&#8734;">
<!ENTITY int "&#8747;">
<!ENTITY Iota "&#921;">
<!ENTITY iota "&#953;">
<!ENTITY iquest "&#191;">
<!ENTITY isin "&#8712;">
<!ENTITY Iuml "&#207;">
<!ENTITY iuml "&#239;">
<!ENTITY Kappa "&#922;">
<!ENTITY kappa "&#954;">
<!ENTITY Lambda "&#923;">
<!ENTITY lambda "&#955;">
<!ENTITY lang "&#9001;">
<!ENTITY laquo "&#171;">
<!ENTITY larr "&#8592;">
<!ENTITY lArr "&#8656;">
<!ENTITY lceil "&#8968;">
<!ENTITY ldquo "&#8220;">
<!ENTITY le "&#8804;">
<!ENTITY lfloor "&#8970;">
<!ENTITY lowast "&#8727;">
<!ENTITY loz "&#9674;">
<!ENTITY lrm "&#8206;">
<!ENTITY lsaquo "&#8249;">
<!ENTITY lsquo "&#8216;">
<!ENTITY lt "&#60;">
<!ENTITY macr "&#175;">
<!ENTITY mdash "&#8212;">
<!ENTITY micro "&#181;">
<!ENTITY middot "&#183;">
<!ENTITY minus "&#8722;">
<!ENTITY Mu "&#924;">
<!ENTITY mu "&#956;">
<!ENTITY nabla "&#8711;">
<!ENTITY nbsp "&#160;">
<!ENTITY ndash "&#8211;">
<!ENTITY ne "&#8800;">
<!ENTITY ni "&#8715;">
<!ENTITY not "&#172;">
<!ENTITY notin "&#8713;">
<!ENTITY nsub "&#8836;">
<!ENTITY Ntilde "&#209;">
<!ENTITY ntilde "&#241;">
<!ENTITY Nu "&#925;">
<!ENTITY nu "&#957;">
<!ENTITY Oacute "&#211;">
<!ENTITY oacute "&#243;">
<!ENTITY Ocirc "&#212;">
<!ENTITY ocirc "&#244;">
<!ENTITY OElig "&#338;">
<!ENTITY oelig "&#339;">
<!ENTITY Ograve "&#210;">
<!ENTITY ograve "&#242;">
<!ENTITY oline "&#8254;">
<!ENTITY Omega "&#937;">
<!ENTITY omega "&#969;">
<!ENTITY Omicron "&#927;">
<!ENTITY omicron "&#959;">
<!ENTITY oplus "&#8853;">
<!ENTITY or "&#8870;">
<!ENTITY ordf "&#170;">
<!ENTITY ordm "&#186;">
<!ENTITY Oslash "&#216;">
<!ENTITY oslash "&#248;">
<!ENTITY Otilde "&#213;">
<!ENTITY otilde "&#245;">
<!ENTITY otimes "&#8855;">
<!ENTITY Ouml "&#214;">
<!ENTITY ouml "&#246;">
<!ENTITY para "&#182;">
<!ENTITY part "&#8706;">
<!ENTITY permil "&#8240;">
<!ENTITY perp "&#8869;">
<!ENTITY Phi "&#934;">
<!ENTITY phi "&#966;">
<!ENTITY Pi "&#928;">
<!ENTITY pi "&#960;">
<!ENTITY piv "&#982;">
<!ENTITY plusmn "&#177;">
<!ENTITY pound "&#163;">
<!ENTITY prime "&#8242;">
<!ENTITY Prime "&#8243;">
<!ENTITY prod "&#8719;">
<!ENTITY prop "&#8733;">
<!ENTITY Psi "&#936;">
<!ENTITY psi "&#968;">
<!ENTITY quot "&#34;">
<!ENTITY radic "&#8730;">
<!ENTITY rang "&#9002;">
<!ENTITY raquo "&#187;">
<!ENTITY rarr "&#8594;">
<!ENTITY rArr "&#8658;">
<!ENTITY rceil "&#8969;">
<!ENTITY rdquo "&#8221;">
<!ENTITY real "&#8476;">
<!ENTITY reg "&#174;">
<!ENTITY rfloor "&#8971;">
<!ENTITY Rho "&#929;">
<!ENTITY rho "&#961;">
<!ENTITY rlm "&#8207;">
<!ENTITY rsaquo "&#8250;">
<!ENTITY rsquo "&#8217;">
<!ENTITY sbquo "&#8218;">
<!ENTITY Scaron "&#352;">
<!ENTITY scaron "&#353;">
<!ENTITY sdot "&#8901;">
<!ENTITY sect "&#167;">
<!ENTITY shy "&#173;">
<!ENTITY Sigma "&#931;">
<!ENTITY sigma "&#963;">
<!ENTITY sigmaf "&#962;">
<!ENTITY sim "&#8764;">
<!ENTITY spades "&#9824;">
<!ENTITY sub "&#8834;">
<!ENTITY sube "&#8838;">
<!ENTITY sum "&#8721;">
<!ENTITY sup "&#8835;">
<!ENTITY sup1 "&#185;">
<!ENTITY sup2 "&#178;">
<!ENTITY sup3 "&#179;">
<!ENTITY supe "&#8839;">
<!ENTITY szlig "&#223;">
<!ENTITY Tau "&#932;">
<!ENTITY tau "&#964;">
<!ENTITY there4 "&#8756;">
<!ENTITY Theta "&#920;">
<!ENTITY theta "&#952;">
<!ENTITY thetasym "&#977;">
<!ENTITY thinsp "&#8201;">
<!ENTITY THORN "&#222;">
<!ENTITY thorn "&#254;">
<!ENTITY tilde "&#732;">
<!ENTITY times "&#215;">
<!ENTITY trade "&#8482;">
<!ENTITY Uacute "&#218;">
<!ENTITY uacute "&#250;">
<!ENTITY uarr "&#8593;">
<!ENTITY uArr "&#8657;">
<!ENTITY Ucirc "&#219;">
<!ENTITY ucirc "&#251;">
<!ENTITY Ugrave "&#217;">
<!ENTITY ugrave "&#249;">
<!ENTITY uml "&#168;">
<!ENTITY upsih "&#978;">
<!ENTITY Upsilon "&#933;">
<!ENTITY upsilon "&#965;">
<!ENTITY Uuml "&#220;">
<!ENTITY uuml "&#252;">
<!ENTITY weierp "&#8472;">
<!ENTITY Xi "&#926;">
<!ENTITY xi "&#958;">
<!ENTITY Yacute "&#221;">
<!ENTITY yacute "&#253;">
<!ENTITY yen "&#165;">
<!ENTITY Yuml "&#376;">
<!ENTITY yuml "&#255;">
<!ENTITY Zeta "&#918;">
<!ENTITY zeta "&#950;">
<!ENTITY zwj "&#8205;">
<!ENTITY zwnj "&#8204;">`.replace(/\n/g, ' ');

  /**
   * A reasonably strict xml declaration.
   */
  const XML_DECL = '<?xml version="1.0" standalone="no"?>';

  /**
   * The beginning of the XML doctype declaration.
   */
  const DOCTYPE_START = `<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [`;

  /**
   * The end of the XML docype declaration.
   */
  const DOCTYPE_END = ']>';

  /**
   * A full header for an SVG XML document.
   */
  export const SVG_XML_HEADER = `${XML_DECL}
    ${DOCTYPE_START}${HTML_ENTITIES}${DOCTYPE_END}`;
}
