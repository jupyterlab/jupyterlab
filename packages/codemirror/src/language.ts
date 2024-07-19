// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  LanguageDescription,
  LanguageSupport,
  LRLanguage,
  StreamLanguage,
  StreamParser
} from '@codemirror/language';
import { IEditorMimeTypeService } from '@jupyterlab/codeeditor';
import { PathExt } from '@jupyterlab/coreutils';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { buildParser } from '@lezer/generator';
import { highlightTree } from '@lezer/highlight';

import { jupyterHighlightStyle } from './theme';
import { IEditorLanguage, IEditorLanguageRegistry } from './token';
import { pythonBuiltin } from './pythonBuiltin';

/**
 * CodeMirror language registry
 */
export class EditorLanguageRegistry implements IEditorLanguageRegistry {
  private _modeList: IEditorLanguage[] = [];

  constructor() {
    // Add default language text/plain -> No expressions to parse
    this.addLanguage({
      name: 'none',
      mime: 'text/plain',
      support: new LanguageSupport(
        // Create a dummy parser that as no expression to parse
        LRLanguage.define({ parser: buildParser('@top Program { }') })
      )
    });
  }

  /**
   * Register a new language for CodeMirror
   *
   * @param language Language to register
   */
  addLanguage(language: IEditorLanguage): void {
    const info =
      this.findByName(language.name) ?? this.findByMIME(language.mime, true);
    if (info) {
      throw new Error(`${language.mime} already registered`);
    }
    this._modeList.push(this.makeSpec(language));
  }

  /**
   * Ensure a codemirror mode is available by name or Codemirror spec.
   *
   * @param language - The mode to ensure.  If it is a string, uses [findBest]
   *   to get the appropriate spec.
   *
   * @returns A promise that resolves when the mode is available.
   */
  async getLanguage(
    language: string | IEditorLanguage
  ): Promise<IEditorLanguage | null> {
    const spec = this.findBest(language);
    if (spec && !spec.support) {
      spec.support = await spec.load!();
    }
    return spec;
  }

  /**
   * Get the raw list of available modes specs.
   *
   * @returns The available modes
   */
  getLanguages(): IEditorLanguage[] {
    return [...this._modeList] as IEditorLanguage[];
  }

  /**
   * Find a codemirror mode by MIME.
   *
   * @param mime Mime type to look for
   * @param strict Whether xml and json should be assimilated to the generic mimetype
   * @returns The mode or null
   */
  findByMIME(
    mime: string | readonly string[],
    strict = false
  ): IEditorLanguage | null {
    if (Array.isArray(mime)) {
      for (let i = 0; i < mime.length; i++) {
        const spec = this.findByMIME(mime[i]);
        if (spec) return spec;
      }
      return null;
    }
    mime = (mime as string).toLowerCase();
    for (let i = 0; i < this._modeList.length; i++) {
      let info = this._modeList[i];
      if (Array.isArray(info.mime)) {
        for (let j = 0; j < info.mime.length; j++) {
          if (info.mime[j] == mime) {
            return info;
          }
        }
      } else if (info.mime == mime) {
        return info;
      }
    }
    if (!strict) {
      if (/\+xml$/.test(mime)) return this.findByMIME('application/xml');
      if (/\+json$/.test(mime)) return this.findByMIME('application/json');
    }
    return null;
  }

  /**
   * Find a codemirror mode by name.
   *
   * @param name The mode name
   * @returns The mode or null
   */
  findByName(name: string): IEditorLanguage | null {
    name = name.toLowerCase();
    for (let i = 0; i < this._modeList.length; i++) {
      let info = this._modeList[i];
      if (info.name.toLowerCase() == name) return info;
      if (info.alias) {
        for (let j = 0; j < info.alias.length; j++) {
          if (info.alias[j].toLowerCase() == name) {
            return info;
          }
        }
      }
    }
    return null;
  }

  /**
   * Find a codemirror mode by extension.
   *
   * @param ext The extension name
   * @returns The mode or null
   */
  findByExtension(ext: string | readonly string[]): IEditorLanguage | null {
    if (Array.isArray(ext)) {
      for (let i = 0; i < ext.length; i++) {
        const spec = this.findByExtension(ext[i]);
        if (spec) return spec;
      }
      return null;
    }
    ext = (ext as string).toLowerCase();
    for (let i = 0; i < this._modeList.length; i++) {
      let info = this._modeList[i];
      for (let j = 0; j < info.extensions!.length; j++) {
        if (info.extensions![j].toLowerCase() == ext) {
          return info;
        }
      }
    }
    return null;
  }

  /**
   * Find a codemirror mode by filename.
   *
   * @param name File name
   * @returns The mode or null
   */
  findByFileName(name: string): IEditorLanguage | null {
    const basename = PathExt.basename(name);
    for (let i = 0; i < this._modeList.length; i++) {
      let info = this._modeList[i];
      if (info.filename && info.filename.test(basename)) {
        return info;
      }
    }
    let dot = basename.lastIndexOf('.');
    let ext = dot > -1 && basename.substring(dot + 1, basename.length);
    if (ext) {
      return this.findByExtension(ext);
    }
    return null;
  }

  /**
   * Find a codemirror mode by name or CodeMirror spec.
   *
   * @param language The CodeMirror mode
   * @param fallback Whether to fallback to default mimetype spec or not
   * @returns The mode or null
   */
  findBest(
    language: string | IEditorLanguage,
    fallback = true
  ): IEditorLanguage | null {
    const modename = typeof language === 'string' ? language : language.name;
    const mimetype = typeof language !== 'string' ? language.mime : modename;
    const ext = typeof language !== 'string' ? language.extensions ?? [] : [];

    return (
      (modename ? this.findByName(modename) : null) ??
      (mimetype ? this.findByMIME(mimetype) : null) ??
      this.findByExtension(ext) ??
      (fallback
        ? this.findByMIME(IEditorMimeTypeService.defaultMimeType)
        : null)
    );
  }

  /**
   * Parse and style a string.
   *
   * @param code Code to highlight
   * @param language Code language
   * @param el HTML element into which the highlighted code will be inserted
   */
  async highlight(
    code: string,
    language: IEditorLanguage | null,
    el: HTMLElement
  ): Promise<void> {
    if (language) {
      await this.getLanguage(language);
    }

    const language_ = language?.support?.language;
    if (!language_) {
      el.appendChild(document.createTextNode(code));
      return;
    }

    const tree = language_.parser.parse(code);
    // position state required because unstyled tokens are not emitted
    // in highlightTree
    let pos = 0;
    highlightTree(tree, jupyterHighlightStyle, (from, to, classes) => {
      if (from > pos) {
        // No style applied to the token between pos and from
        el.appendChild(document.createTextNode(code.slice(pos, from)));
      }
      const sp = el.appendChild(document.createElement('span'));
      sp.className = classes;
      sp.appendChild(document.createTextNode(code.slice(from, to)));
      pos = to;
    });

    if (pos < tree.length - 1) {
      // No style applied on the trailing text
      el.appendChild(document.createTextNode(code.slice(pos, tree.length)));
    }
  }

  // Code mirror uses two similar structures, a plain object with optional fields,
  // and a class with the same fields but all mandatory. Maybe adopting the same
  // pattern would be less confusing (although far more verbose)
  protected makeSpec(spec: IEditorLanguage): IEditorLanguage {
    let res = LanguageDescription.of(spec) as any;
    // CodeMirror does not store/use mime type of a language
    res.mime = spec.mime;
    res.displayName = spec.displayName;
    return res as IEditorLanguage;
  }
}

/**
 * EditorLanguageRegistry namespace
 */
export namespace EditorLanguageRegistry {
  /**
   * Convert an CodeMirror 5 language parser to CodeMirror 6
   *
   * @param parser Legacy parser
   * @returns Language object
   */
  export function legacy(parser: StreamParser<unknown>): LanguageSupport {
    return new LanguageSupport(StreamLanguage.define(parser));
  }

  /**
   * Create a dialect of SQL
   *
   * @param dialectName SQL dialect
   * @returns Language object
   */
  async function sql(
    dialectName: keyof typeof import('@codemirror/lang-sql')
  ): Promise<LanguageSupport> {
    const m = await import('@codemirror/lang-sql');
    return m.sql({ dialect: (m as any)[dialectName] });
  }

  /**
   * Get the default editor languages
   *
   * @param translator Application translator
   * @returns Default CodeMirror 6 languages
   */
  export function getDefaultLanguages(
    translator?: ITranslator | null
  ): ReadonlyArray<IEditorLanguage> {
    const trans = (translator ?? nullTranslator).load('jupyterlab');
    return [
      {
        name: 'C',
        displayName: trans.__('C'),
        mime: 'text/x-csrc',
        extensions: ['c', 'h', 'ino'],
        async load() {
          const m = await import('@codemirror/lang-cpp');
          return m.cpp();
        }
      },
      {
        name: 'C++',
        displayName: trans.__('C++'),
        mime: 'text/x-c++src',
        extensions: ['cpp', 'c++', 'cc', 'cxx', 'hpp', 'h++', 'hh', 'hxx'],
        async load() {
          const m = await import('@codemirror/lang-cpp');
          return m.cpp();
        }
      },
      {
        name: 'CQL',
        displayName: trans.__('CQL'),
        mime: 'text/x-cassandra',
        extensions: ['cql'],
        load() {
          return sql('Cassandra');
        }
      },
      {
        name: 'CSS',
        displayName: trans.__('CSS'),
        mime: 'text/css',
        extensions: ['css'],
        async load() {
          const m = await import('@codemirror/lang-css');
          return m.css();
        }
      },
      {
        name: 'HTML',
        displayName: trans.__('HTML'),
        alias: ['xhtml'],
        mime: 'text/html',
        extensions: ['html', 'htm', 'handlebars', 'hbs'],
        async load() {
          const m = await import('@codemirror/lang-html');
          return m.html();
        }
      },
      {
        name: 'Java',
        displayName: trans.__('Java'),
        mime: 'text/x-java',
        extensions: ['java'],
        async load() {
          const m = await import('@codemirror/lang-java');
          return m.java();
        }
      },
      {
        name: 'Javascript',
        displayName: trans.__('Javascript'),
        alias: ['ecmascript', 'js', 'node'],
        mime: [
          'text/javascript',
          'text/ecmascript',
          'application/javascript',
          'application/x-javascript',
          'application/ecmascript'
        ],
        extensions: ['js', 'mjs', 'cjs'],
        async load() {
          const m = await import('@codemirror/lang-javascript');
          return m.javascript();
        }
      },
      {
        name: 'JSON',
        displayName: trans.__('JSON'),
        alias: ['json5'],
        mime: ['application/json', 'application/x-json'],
        extensions: ['json', 'map'],
        async load() {
          const m = await import('@codemirror/lang-json');
          return m.json();
        }
      },
      {
        name: 'JSX',
        displayName: trans.__('JSX'),
        mime: 'text/jsx',
        extensions: ['jsx'],
        async load() {
          const m = await import('@codemirror/lang-javascript');
          return m.javascript({ jsx: true });
        }
      },
      {
        name: 'MariaDB SQL',
        displayName: trans.__('MariaDB SQL'),
        mime: 'text/x-mariadb',
        load() {
          return sql('MariaSQL');
        }
      },
      {
        name: 'Markdown',
        displayName: trans.__('Markdown'),
        mime: 'text/x-markdown',
        extensions: ['md', 'markdown', 'mkd'],
        async load() {
          const m = await import('@codemirror/lang-markdown');
          return m.markdown({ codeLanguages: this._modeList as any });
        }
      },
      {
        name: 'MS SQL',
        displayName: trans.__('MS SQL'),
        mime: 'text/x-mssql',
        load() {
          return sql('MSSQL');
        }
      },
      {
        name: 'MySQL',
        displayName: trans.__('MySQL'),
        mime: 'text/x-mysql',
        load() {
          return sql('MySQL');
        }
      },
      {
        name: 'PHP',
        displayName: trans.__('PHP'),
        mime: [
          'text/x-php',
          'application/x-httpd-php',
          'application/x-httpd-php-open'
        ],
        extensions: ['php', 'php3', 'php4', 'php5', 'php7', 'phtml'],
        async load() {
          const m = await import('@codemirror/lang-php');
          return m.php();
        }
      },
      {
        name: 'PLSQL',
        displayName: trans.__('PLSQL'),
        mime: 'text/x-plsql',
        extensions: ['pls'],
        load() {
          return sql('PLSQL');
        }
      },
      {
        name: 'PostgreSQL',
        displayName: trans.__('PostgreSQL'),
        mime: 'text/x-pgsql',
        load() {
          return sql('PostgreSQL');
        }
      },
      {
        name: 'Python',
        displayName: trans.__('Python'),
        mime: 'text/x-python',
        extensions: ['BUILD', 'bzl', 'py', 'pyw'],
        filename: /^(BUCK|BUILD)$/,
        async load() {
          const m = await import('@codemirror/lang-python');
          return new LanguageSupport(
            m.pythonLanguage,
            pythonBuiltin(m.pythonLanguage)
          );
        }
      },
      {
        name: 'ipython',
        displayName: trans.__('ipython'),
        mime: 'text/x-ipython',
        async load() {
          // FIXME Restore '?' operator - using the default python LanguageSupport allows
          // to activate feature such as code folding.
          // return Promise.resolve(legacy(mkPython({ singleOperators: /\?/ })));
          const m = await import('@codemirror/lang-python');
          return new LanguageSupport(
            m.pythonLanguage,
            pythonBuiltin(m.pythonLanguage)
          );
        }
      },
      {
        name: 'Rust',
        displayName: trans.__('Rust'),
        mime: 'text/x-rustsrc',
        extensions: ['rs'],
        async load() {
          const m = await import('@codemirror/lang-rust');
          return m.rust();
        }
      },
      {
        name: 'SQL',
        displayName: trans.__('SQL'),
        mime: ['application/sql', 'text/x-sql'],
        extensions: ['sql'],
        load() {
          return sql('StandardSQL');
        }
      },
      {
        name: 'SQLite',
        displayName: trans.__('SQLite'),
        mime: 'text/x-sqlite',
        load() {
          return sql('SQLite');
        }
      },
      {
        name: 'TSX',
        displayName: trans.__('TSX'),
        alias: ['TypeScript-JSX'],
        mime: 'text/typescript-jsx',
        extensions: ['tsx'],
        async load() {
          const m = await import('@codemirror/lang-javascript');
          return m.javascript({ jsx: true, typescript: true });
        }
      },
      {
        name: 'TypeScript',
        displayName: trans.__('TypeScript'),
        alias: ['ts'],
        mime: 'application/typescript',
        extensions: ['ts'],
        async load() {
          const m = await import('@codemirror/lang-javascript');
          return m.javascript({ typescript: true });
        }
      },
      {
        name: 'WebAssembly',
        displayName: trans.__('WebAssembly'),
        mime: 'text/webassembly',
        extensions: ['wat', 'wast'],
        async load() {
          const m = await import('@codemirror/lang-wast');
          return m.wast();
        }
      },
      {
        name: 'XML',
        displayName: trans.__('XML'),
        alias: ['rss', 'wsdl', 'xsd'],
        mime: ['application/xml', 'text/xml'],
        extensions: ['xml', 'xsl', 'xsd', 'svg'],
        async load() {
          const m = await import('@codemirror/lang-xml');
          return m.xml();
        }
      },
      // Legacy modes ported from CodeMirror 5
      {
        name: 'APL',
        displayName: trans.__('APL'),
        mime: 'text/apl',
        extensions: ['dyalog', 'apl'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/apl');
          return legacy(m.apl);
        }
      },
      {
        name: 'PGP',
        displayName: trans.__('PGP'),
        alias: ['asciiarmor'],
        mime: [
          'application/pgp',
          'application/pgp-encrypted',
          'application/pgp-keys',
          'application/pgp-signature'
        ],
        extensions: ['asc', 'pgp', 'sig'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/asciiarmor');
          return legacy(m.asciiArmor);
        }
      },
      {
        name: 'ASN.1',
        displayName: trans.__('ASN.1'),
        mime: 'text/x-ttcn-asn',
        extensions: ['asn', 'asn1'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/asn1');
          return legacy(m.asn1({}));
        }
      },
      {
        name: 'Asterisk',
        displayName: trans.__('Asterisk'),
        mime: 'text/x-asterisk',
        filename: /^extensions\.conf$/i,
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/asterisk');
          return legacy(m.asterisk);
        }
      },
      {
        name: 'Brainfuck',
        displayName: trans.__('Brainfuck'),
        mime: 'text/x-brainfuck',
        extensions: ['b', 'bf'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/brainfuck');
          return legacy(m.brainfuck);
        }
      },
      {
        name: 'Cobol',
        displayName: trans.__('Cobol'),
        mime: 'text/x-cobol',
        extensions: ['cob', 'cpy'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/cobol');
          return legacy(m.cobol);
        }
      },
      {
        name: 'C#',
        displayName: trans.__('C#'),
        alias: ['csharp', 'cs'],
        mime: 'text/x-csharp',
        extensions: ['cs'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/clike');
          return legacy(m.csharp);
        }
      },
      {
        name: 'Clojure',
        displayName: trans.__('Clojure'),
        mime: 'text/x-clojure',
        extensions: ['clj', 'cljc', 'cljx'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/clojure');
          return legacy(m.clojure);
        }
      },
      {
        name: 'ClojureScript',
        displayName: trans.__('ClojureScript'),
        mime: 'text/x-clojurescript',
        extensions: ['cljs'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/clojure');
          return legacy(m.clojure);
        }
      },
      {
        name: 'Closure Stylesheets (GSS)',
        displayName: trans.__('Closure Stylesheets (GSS)'),
        mime: 'text/x-gss',
        extensions: ['gss'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/css');
          return legacy(m.gss);
        }
      },
      {
        name: 'CMake',
        displayName: trans.__('CMake'),
        mime: 'text/x-cmake',
        extensions: ['cmake', 'cmake.in'],
        filename: /^CMakeLists\.txt$/,
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/cmake');
          return legacy(m.cmake);
        }
      },
      {
        name: 'CoffeeScript',
        displayName: trans.__('CoffeeScript'),
        alias: ['coffee', 'coffee-script'],
        mime: [
          'application/vnd.coffeescript',
          'text/coffeescript',
          'text/x-coffeescript'
        ],
        extensions: ['coffee'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/coffeescript');
          return legacy(m.coffeeScript);
        }
      },
      {
        name: 'Common Lisp',
        displayName: trans.__('Common Lisp'),
        alias: ['lisp'],
        mime: 'text/x-common-lisp',
        extensions: ['cl', 'lisp', 'el'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/commonlisp');
          return legacy(m.commonLisp);
        }
      },
      {
        name: 'Cypher',
        displayName: trans.__('Cypher'),
        mime: 'application/x-cypher-query',
        extensions: ['cyp', 'cypher'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/cypher');
          return legacy(m.cypher);
        }
      },
      {
        name: 'Cython',
        displayName: trans.__('Cython'),
        mime: 'text/x-cython',
        extensions: ['pyx', 'pxd', 'pxi'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/python');
          return legacy(m.cython);
        }
      },
      {
        name: 'Crystal',
        displayName: trans.__('Crystal'),
        mime: 'text/x-crystal',
        extensions: ['cr'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/crystal');
          return legacy(m.crystal);
        }
      },
      {
        name: 'D',
        displayName: trans.__('D'),
        mime: 'text/x-d',
        extensions: ['d'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/d');
          return legacy(m.d);
        }
      },
      {
        name: 'Dart',
        displayName: trans.__('Dart'),
        mime: ['application/dart', 'text/x-dart'],
        extensions: ['dart'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/clike');
          return legacy(m.dart);
        }
      },
      {
        name: 'diff',
        displayName: trans.__('diff'),
        mime: 'text/x-diff',
        extensions: ['diff', 'patch'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/diff');
          return legacy(m.diff);
        }
      },
      {
        name: 'Dockerfile',
        displayName: trans.__('Dockerfile'),
        mime: 'text/x-dockerfile',
        filename: /^Dockerfile$/,
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/dockerfile');
          return legacy(m.dockerFile);
        }
      },
      {
        name: 'DTD',
        displayName: trans.__('DTD'),
        mime: 'application/xml-dtd',
        extensions: ['dtd'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/dtd');
          return legacy(m.dtd);
        }
      },
      {
        name: 'Dylan',
        displayName: trans.__('Dylan'),
        mime: 'text/x-dylan',
        extensions: ['dylan', 'dyl', 'intr'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/dylan');
          return legacy(m.dylan);
        }
      },
      {
        name: 'EBNF',
        displayName: trans.__('EBNF'),
        mime: 'text/x-ebnf',
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/ebnf');
          return legacy(m.ebnf);
        }
      },
      {
        name: 'ECL',
        displayName: trans.__('ECL'),
        mime: 'text/x-ecl',
        extensions: ['ecl'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/ecl');
          return legacy(m.ecl);
        }
      },
      {
        name: 'edn',
        displayName: trans.__('edn'),
        mime: 'application/edn',
        extensions: ['edn'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/clojure');
          return legacy(m.clojure);
        }
      },
      {
        name: 'Eiffel',
        displayName: trans.__('Eiffel'),
        mime: 'text/x-eiffel',
        extensions: ['e'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/eiffel');
          return legacy(m.eiffel);
        }
      },
      {
        name: 'Elm',
        displayName: trans.__('Elm'),
        mime: 'text/x-elm',
        extensions: ['elm'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/elm');
          return legacy(m.elm);
        }
      },
      {
        name: 'Erlang',
        displayName: trans.__('Erlang'),
        mime: 'text/x-erlang',
        extensions: ['erl'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/erlang');
          return legacy(m.erlang);
        }
      },
      {
        name: 'Esper',
        displayName: trans.__('Esper'),
        mime: 'text/x-esper',
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/sql');
          return legacy(m.esper);
        }
      },
      {
        name: 'Factor',
        displayName: trans.__('Factor'),
        mime: 'text/x-factor',
        extensions: ['factor'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/factor');
          return legacy(m.factor);
        }
      },
      {
        name: 'FCL',
        displayName: trans.__('FCL'),
        mime: 'text/x-fcl',
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/fcl');
          return legacy(m.fcl);
        }
      },
      {
        name: 'Forth',
        displayName: trans.__('Forth'),
        mime: 'text/x-forth',
        extensions: ['forth', 'fth', '4th'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/forth');
          return legacy(m.forth);
        }
      },
      {
        name: 'Fortran',
        displayName: trans.__('Fortran'),
        mime: 'text/x-fortran',
        extensions: ['f', 'for', 'f77', 'f90', 'f95'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/fortran');
          return legacy(m.fortran);
        }
      },
      {
        name: 'F#',
        displayName: trans.__('F#'),
        alias: ['fsharp'],
        mime: 'text/x-fsharp',
        extensions: ['fs'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/mllike');
          return legacy(m.fSharp);
        }
      },
      {
        name: 'Gas',
        displayName: trans.__('Gas'),
        mime: 'text/x-gas',
        extensions: ['s'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/gas');
          return legacy(m.gas);
        }
      },
      {
        name: 'Gherkin',
        displayName: trans.__('Gherkin'),
        mime: 'text/x-feature',
        extensions: ['feature'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/gherkin');
          return legacy(m.gherkin);
        }
      },
      {
        name: 'Go',
        displayName: trans.__('Go'),
        mime: 'text/x-go',
        extensions: ['go'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/go');
          return legacy(m.go);
        }
      },
      {
        name: 'Groovy',
        displayName: trans.__('Groovy'),
        mime: 'text/x-groovy',
        extensions: ['groovy', 'gradle'],
        filename: /^Jenkinsfile$/,
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/groovy');
          return legacy(m.groovy);
        }
      },
      {
        name: 'Haskell',
        displayName: trans.__('Haskell'),
        mime: 'text/x-haskell',
        extensions: ['hs'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/haskell');
          return legacy(m.haskell);
        }
      },
      {
        name: 'Haxe',
        displayName: trans.__('Haxe'),
        mime: 'text/x-haxe',
        extensions: ['hx'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/haxe');
          return legacy(m.haxe);
        }
      },
      {
        name: 'HXML',
        displayName: trans.__('HXML'),
        mime: 'text/x-hxml',
        extensions: ['hxml'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/haxe');
          return legacy(m.hxml);
        }
      },
      {
        name: 'HTTP',
        displayName: trans.__('HTTP'),
        mime: 'message/http',
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/http');
          return legacy(m.http);
        }
      },
      {
        name: 'IDL',
        displayName: trans.__('IDL'),
        mime: 'text/x-idl',
        extensions: ['pro'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/idl');
          return legacy(m.idl);
        }
      },
      {
        name: 'JSON-LD',
        displayName: trans.__('JSON-LD'),
        alias: ['jsonld'],
        mime: 'application/ld+json',
        extensions: ['jsonld'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/javascript');
          return legacy(m.jsonld);
        }
      },
      {
        name: 'Jinja2',
        displayName: trans.__('Jinja2'),
        mime: 'text/jinja2',
        extensions: ['j2', 'jinja', 'jinja2'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/jinja2');
          return legacy(m.jinja2);
        }
      },
      {
        name: 'Julia',
        displayName: trans.__('Julia'),
        mime: 'text/x-julia',
        extensions: ['jl'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/julia');
          return legacy(m.julia);
        }
      },
      {
        name: 'Kotlin',
        displayName: trans.__('Kotlin'),
        mime: 'text/x-kotlin',
        extensions: ['kt'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/clike');
          return legacy(m.kotlin);
        }
      },
      {
        name: 'LESS',
        displayName: trans.__('LESS'),
        mime: 'text/x-less',
        extensions: ['less'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/css');
          return legacy(m.less);
        }
      },
      {
        name: 'LiveScript',
        displayName: trans.__('LiveScript'),
        alias: ['ls'],
        mime: 'text/x-livescript',
        extensions: ['ls'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/livescript');
          return legacy(m.liveScript);
        }
      },
      {
        name: 'Lua',
        displayName: trans.__('Lua'),
        mime: 'text/x-lua',
        extensions: ['lua'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/lua');
          return legacy(m.lua);
        }
      },
      {
        name: 'mIRC',
        displayName: trans.__('mIRC'),
        mime: 'text/mirc',
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/mirc');
          return legacy(m.mirc);
        }
      },
      {
        name: 'Mathematica',
        displayName: trans.__('Mathematica'),
        mime: 'text/x-mathematica',
        extensions: ['m', 'nb', 'wl', 'wls'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/mathematica');
          return legacy(m.mathematica);
        }
      },
      {
        name: 'Modelica',
        displayName: trans.__('Modelica'),
        mime: 'text/x-modelica',
        extensions: ['mo'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/modelica');
          return legacy(m.modelica);
        }
      },
      {
        name: 'MUMPS',
        displayName: trans.__('MUMPS'),
        mime: 'text/x-mumps',
        extensions: ['mps'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/mumps');
          return legacy(m.mumps);
        }
      },
      {
        name: 'mbox',
        displayName: trans.__('mbox'),
        mime: 'application/mbox',
        extensions: ['mbox'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/mbox');
          return legacy(m.mbox);
        }
      },
      {
        name: 'Nginx',
        displayName: trans.__('Nginx'),
        mime: 'text/x-nginx-conf',
        filename: /nginx.*\.conf$/i,
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/nginx');
          return legacy(m.nginx);
        }
      },
      {
        name: 'NSIS',
        displayName: trans.__('NSIS'),
        mime: 'text/x-nsis',
        extensions: ['nsh', 'nsi'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/nsis');
          return legacy(m.nsis);
        }
      },
      {
        name: 'NTriples',
        displayName: trans.__('NTriples'),
        mime: [
          'application/n-triples',
          'application/n-quads',
          'text/n-triples'
        ],
        extensions: ['nt', 'nq'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/ntriples');
          return legacy(m.ntriples);
        }
      },
      {
        name: 'Objective-C',
        displayName: trans.__('Objective-C'),
        alias: ['objective-c', 'objc'],
        mime: 'text/x-objectivec',
        extensions: ['m'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/clike');
          return legacy(m.objectiveC);
        }
      },
      {
        name: 'Objective-C++',
        displayName: trans.__('Objective-C++'),
        alias: ['objective-c++', 'objc++'],
        mime: 'text/x-objectivec++',
        extensions: ['mm'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/clike');
          return legacy(m.objectiveCpp);
        }
      },
      {
        name: 'OCaml',
        displayName: trans.__('OCaml'),
        mime: 'text/x-ocaml',
        extensions: ['ml', 'mli', 'mll', 'mly'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/mllike');
          return legacy(m.oCaml);
        }
      },
      {
        name: 'Octave',
        displayName: trans.__('Octave'),
        mime: 'text/x-octave',
        extensions: ['m'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/octave');
          return legacy(m.octave);
        }
      },
      {
        name: 'Oz',
        displayName: trans.__('Oz'),
        mime: 'text/x-oz',
        extensions: ['oz'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/oz');
          return legacy(m.oz);
        }
      },
      {
        name: 'Pascal',
        displayName: trans.__('Pascal'),
        mime: 'text/x-pascal',
        extensions: ['p', 'pas'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/pascal');
          return legacy(m.pascal);
        }
      },
      {
        name: 'Perl',
        displayName: trans.__('Perl'),
        mime: 'text/x-perl',
        extensions: ['pl', 'pm'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/perl');
          return legacy(m.perl);
        }
      },
      {
        name: 'Pig',
        displayName: trans.__('Pig'),
        mime: 'text/x-pig',
        extensions: ['pig'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/pig');
          return legacy(m.pig);
        }
      },
      {
        name: 'PowerShell',
        displayName: trans.__('PowerShell'),
        mime: 'application/x-powershell',
        extensions: ['ps1', 'psd1', 'psm1'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/powershell');
          return legacy(m.powerShell);
        }
      },
      {
        name: 'Properties files',
        displayName: trans.__('Properties files'),
        alias: ['ini', 'properties'],
        mime: 'text/x-properties',
        extensions: ['properties', 'ini', 'in'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/properties');
          return legacy(m.properties);
        }
      },
      {
        name: 'ProtoBuf',
        displayName: trans.__('ProtoBuf'),
        mime: 'text/x-protobuf',
        extensions: ['proto'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/protobuf');
          return legacy(m.protobuf);
        }
      },
      {
        name: 'Pug',
        displayName: trans.__('Pug'),
        mime: 'text/x-pug',
        extensions: ['pug'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/pug');
          return legacy(m.pug);
        }
      },
      {
        name: 'Puppet',
        displayName: trans.__('Puppet'),
        mime: 'text/x-puppet',
        extensions: ['pp'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/puppet');
          return legacy(m.puppet);
        }
      },
      {
        name: 'Q',
        displayName: trans.__('Q'),
        mime: 'text/x-q',
        extensions: ['q'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/q');
          return legacy(m.q);
        }
      },
      {
        name: 'R',
        displayName: trans.__('R'),
        alias: ['rscript'],
        mime: 'text/x-rsrc',
        extensions: ['r', 'R'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/r');
          return legacy(m.r);
        }
      },
      {
        name: 'RPM Changes',
        displayName: trans.__('RPM Changes'),
        mime: 'text/x-rpm-changes',
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/rpm');
          return legacy(m.rpmChanges);
        }
      },
      {
        name: 'RPM Spec',
        displayName: trans.__('RPM Spec'),
        mime: 'text/x-rpm-spec',
        extensions: ['spec'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/rpm');
          return legacy(m.rpmSpec);
        }
      },
      {
        name: 'Ruby',
        displayName: trans.__('Ruby'),
        alias: ['jruby', 'macruby', 'rake', 'rb', 'rbx'],
        mime: 'text/x-ruby',
        extensions: ['rb'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/ruby');
          return legacy(m.ruby);
        }
      },
      {
        name: 'SAS',
        displayName: trans.__('SAS'),
        mime: 'text/x-sas',
        extensions: ['sas'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/sas');
          return legacy(m.sas);
        }
      },
      {
        name: 'Scala',
        displayName: trans.__('Scala'),
        mime: 'text/x-scala',
        extensions: ['scala'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/clike');
          return legacy(m.scala);
        }
      },
      {
        name: 'Scheme',
        displayName: trans.__('Scheme'),
        mime: 'text/x-scheme',
        extensions: ['scm', 'ss'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/scheme');
          return legacy(m.scheme);
        }
      },
      {
        name: 'SCSS',
        displayName: trans.__('SCSS'),
        mime: 'text/x-scss',
        extensions: ['scss'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/css');
          return legacy(m.sCSS);
        }
      },
      {
        name: 'Shell',
        displayName: trans.__('Shell'),
        alias: ['bash', 'sh', 'zsh'],
        mime: ['text/x-sh', 'application/x-sh'],
        extensions: ['sh', 'ksh', 'bash'],
        filename: /^PKGBUILD$/,
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/shell');
          return legacy(m.shell);
        }
      },
      {
        name: 'Sieve',
        displayName: trans.__('Sieve'),
        mime: 'application/sieve',
        extensions: ['siv', 'sieve'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/sieve');
          return legacy(m.sieve);
        }
      },
      {
        name: 'Smalltalk',
        displayName: trans.__('Smalltalk'),
        mime: 'text/x-stsrc',
        extensions: ['st'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/smalltalk');
          return legacy(m.smalltalk);
        }
      },
      {
        name: 'Solr',
        displayName: trans.__('Solr'),
        mime: 'text/x-solr',
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/solr');
          return legacy(m.solr);
        }
      },
      {
        name: 'SML',
        displayName: trans.__('SML'),
        mime: 'text/x-sml',
        extensions: ['sml', 'sig', 'fun', 'smackspec'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/mllike');
          return legacy(m.sml);
        }
      },
      {
        name: 'SPARQL',
        displayName: trans.__('SPARQL'),
        alias: ['sparul'],
        mime: 'application/sparql-query',
        extensions: ['rq', 'sparql'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/sparql');
          return legacy(m.sparql);
        }
      },
      {
        name: 'Spreadsheet',
        displayName: trans.__('Spreadsheet'),
        alias: ['excel', 'formula'],
        mime: 'text/x-spreadsheet',
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/spreadsheet');
          return legacy(m.spreadsheet);
        }
      },
      {
        name: 'Squirrel',
        displayName: trans.__('Squirrel'),
        mime: 'text/x-squirrel',
        extensions: ['nut'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/clike');
          return legacy(m.squirrel);
        }
      },
      {
        name: 'Stylus',
        displayName: trans.__('Stylus'),
        mime: 'text/x-styl',
        extensions: ['styl'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/stylus');
          return legacy(m.stylus);
        }
      },
      {
        name: 'Swift',
        displayName: trans.__('Swift'),
        mime: 'text/x-swift',
        extensions: ['swift'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/swift');
          return legacy(m.swift);
        }
      },
      {
        name: 'sTeX',
        displayName: trans.__('sTeX'),
        mime: 'text/x-stex',
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/stex');
          return legacy(m.stex);
        }
      },
      {
        name: 'LaTeX',
        displayName: trans.__('LaTeX'),
        alias: ['tex'],
        mime: 'text/x-latex',
        extensions: ['text', 'ltx', 'tex'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/stex');
          return legacy(m.stex);
        }
      },
      {
        name: 'SystemVerilog',
        displayName: trans.__('SystemVerilog'),
        mime: 'text/x-systemverilog',
        extensions: ['v', 'sv', 'svh'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/verilog');
          return legacy(m.verilog);
        }
      },
      {
        name: 'Tcl',
        displayName: trans.__('Tcl'),
        mime: 'text/x-tcl',
        extensions: ['tcl'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/tcl');
          return legacy(m.tcl);
        }
      },
      {
        name: 'Textile',
        displayName: trans.__('Textile'),
        mime: 'text/x-textile',
        extensions: ['textile'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/textile');
          return legacy(m.textile);
        }
      },
      {
        name: 'TiddlyWiki',
        displayName: trans.__('TiddlyWiki'),
        mime: 'text/x-tiddlywiki',
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/tiddlywiki');
          return legacy(m.tiddlyWiki);
        }
      },
      {
        name: 'Tiki wiki',
        displayName: trans.__('Tiki wiki'),
        mime: 'text/tiki',
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/tiki');
          return legacy(m.tiki);
        }
      },
      {
        name: 'TOML',
        displayName: trans.__('TOML'),
        mime: 'text/x-toml',
        extensions: ['toml'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/toml');
          return legacy(m.toml);
        }
      },
      {
        name: 'troff',
        displayName: trans.__('troff'),
        mime: 'text/troff',
        extensions: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/troff');
          return legacy(m.troff);
        }
      },
      {
        name: 'TTCN',
        displayName: trans.__('TTCN'),
        mime: 'text/x-ttcn',
        extensions: ['ttcn', 'ttcn3', 'ttcnpp'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/ttcn');
          return legacy(m.ttcn);
        }
      },
      {
        name: 'TTCN_CFG',
        displayName: trans.__('TTCN_CFG'),
        mime: 'text/x-ttcn-cfg',
        extensions: ['cfg'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/ttcn-cfg');
          return legacy(m.ttcnCfg);
        }
      },
      {
        name: 'Turtle',
        displayName: trans.__('Turtle'),
        mime: 'text/turtle',
        extensions: ['ttl'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/turtle');
          return legacy(m.turtle);
        }
      },
      {
        name: 'Web IDL',
        displayName: trans.__('Web IDL'),
        mime: 'text/x-webidl',
        extensions: ['webidl'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/webidl');
          return legacy(m.webIDL);
        }
      },
      {
        name: 'VB.NET',
        displayName: trans.__('VB.NET'),
        mime: 'text/x-vb',
        extensions: ['vb'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/vb');
          return legacy(m.vb);
        }
      },
      {
        name: 'VBScript',
        displayName: trans.__('VBScript'),
        mime: 'text/vbscript',
        extensions: ['vbs'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/vbscript');
          return legacy(m.vbScript);
        }
      },
      {
        name: 'Velocity',
        displayName: trans.__('Velocity'),
        mime: 'text/velocity',
        extensions: ['vtl'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/velocity');
          return legacy(m.velocity);
        }
      },
      {
        name: 'Verilog',
        displayName: trans.__('Verilog'),
        mime: 'text/x-verilog',
        extensions: ['v'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/verilog');
          return legacy(m.verilog);
        }
      },
      {
        name: 'VHDL',
        displayName: trans.__('VHDL'),
        mime: 'text/x-vhdl',
        extensions: ['vhd', 'vhdl'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/vhdl');
          return legacy(m.vhdl);
        }
      },
      {
        name: 'XQuery',
        displayName: trans.__('XQuery'),
        mime: 'application/xquery',
        extensions: ['xy', 'xquery'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/xquery');
          return legacy(m.xQuery);
        }
      },
      {
        name: 'Yacas',
        displayName: trans.__('Yacas'),
        mime: 'text/x-yacas',
        extensions: ['ys'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/yacas');
          return legacy(m.yacas);
        }
      },
      {
        name: 'YAML',
        displayName: trans.__('YAML'),
        alias: ['yml'],
        mime: ['text/x-yaml', 'text/yaml'],
        extensions: ['yaml', 'yml'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/yaml');
          return legacy(m.yaml);
        }
      },
      {
        name: 'Z80',
        displayName: trans.__('Z80'),
        mime: 'text/x-z80',
        extensions: ['z80'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/z80');
          return legacy(m.z80);
        }
      },
      {
        name: 'mscgen',
        displayName: trans.__('mscgen'),
        mime: 'text/x-mscgen',
        extensions: ['mscgen', 'mscin', 'msc'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/mscgen');
          return legacy(m.mscgen);
        }
      },
      {
        name: 'xu',
        displayName: trans.__('xu'),
        mime: 'text/x-xu',
        extensions: ['xu'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/mscgen');
          return legacy(m.xu);
        }
      },
      {
        name: 'msgenny',
        displayName: trans.__('msgenny'),
        mime: 'text/x-msgenny',
        extensions: ['msgenny'],
        async load() {
          const m = await import('@codemirror/legacy-modes/mode/mscgen');
          return legacy(m.msgenny);
        }
      }
    ];
  }
}
