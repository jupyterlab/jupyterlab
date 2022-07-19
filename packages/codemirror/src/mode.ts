// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IEditorMimeTypeService } from '@jupyterlab/codeeditor';
import { PathExt } from '@jupyterlab/coreutils';
import {
  LanguageDescription,
  LanguageSupport,
  StreamLanguage,
  StreamParser
} from '@codemirror/language';
import { highlightTree } from '@lezer/highlight';

// This ensures the language spec for python will be loaded when
// we instantiate a new editor instance, which is required since
// python is the default language and we don't want to split
// the editor constructor because of asynchronous loading.
import { python } from '@codemirror/lang-python';
import { jupyterHighlightStyle } from './editortheme';

export namespace Mode {
  /**
   * The interface of a codemirror language spec.
   */
  export interface ISpec {
    name: string;
    alias?: readonly string[];
    mime: string | readonly string[];
    load?: () => Promise<LanguageSupport>;
    extensions?: readonly string[];
    filename?: RegExp;
    support?: LanguageSupport;
  }

  export function legacy(parser: StreamParser<unknown>): LanguageSupport {
    return new LanguageSupport(StreamLanguage.define(parser));
  }

  async function sql(dialectName: keyof typeof import('@codemirror/lang-sql')) {
    const m = await import('@codemirror/lang-sql');
    return m.sql({ dialect: (m as any)[dialectName] });
  }

  // Code mirror uses two similar structures, a plain object with optional fields,
  // and a class with the same fields but all mandatory. Maybe adopting the same
  // pattern would be less confusing (although far more verbose)
  function makeSpec(spec: ISpec): ISpec {
    let res = LanguageDescription.of(spec) as unknown as ISpec;
    res.mime = spec.mime;
    return res;
  }

  export const modeList: ISpec[] = [
    makeSpec({
      name: 'C',
      mime: 'text/x-csrc',
      extensions: ['c', 'h', 'ino'],
      async load() {
        const m = await import('@codemirror/lang-cpp');
        return m.cpp();
      }
    }),
    makeSpec({
      name: 'C++',
      mime: 'text/x-c++src',
      extensions: ['cpp', 'c++', 'cc', 'cxx', 'hpp', 'h++', 'hh', 'hxx'],
      async load() {
        const m = await import('@codemirror/lang-cpp');
        return m.cpp();
      }
    }),
    makeSpec({
      name: 'CQL',
      mime: 'text/x-cassandra',
      extensions: ['cql'],
      load() {
        return sql('Cassandra');
      }
    }),
    makeSpec({
      name: 'CSS',
      mime: 'text/css',
      extensions: ['css'],
      async load() {
        const m = await import('@codemirror/lang-css');
        return m.css();
      }
    }),
    makeSpec({
      name: 'HTML',
      alias: ['xhtml'],
      mime: 'text/html',
      extensions: ['html', 'htm', 'handlebars', 'hbs'],
      async load() {
        const m = await import('@codemirror/lang-html');
        return m.html();
      }
    }),
    makeSpec({
      name: 'Java',
      mime: 'text/x-java',
      extensions: ['java'],
      async load() {
        const m = await import('@codemirror/lang-java');
        return m.java();
      }
    }),
    makeSpec({
      name: 'Javascript',
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
    }),
    makeSpec({
      name: 'JSON',
      alias: ['json5'],
      mime: ['application/json', 'application/x-json'],
      extensions: ['json', 'map'],
      async load() {
        const m = await import('@codemirror/lang-json');
        return m.json();
      }
    }),
    makeSpec({
      name: 'JSX',
      mime: 'text/jsx',
      extensions: ['jsx'],
      async load() {
        const m = await import('@codemirror/lang-javascript');
        return m.javascript({ jsx: true });
      }
    }),
    makeSpec({
      name: 'MariaDB SQL',
      mime: 'text/x-mariadb',
      load() {
        return sql('MariaSQL');
      }
    }),
    makeSpec({
      name: 'Markdown',
      mime: 'text/x-markdown',
      extensions: ['md', 'markdown', 'mkd'],
      async load() {
        const m = await import('@codemirror/lang-markdown');
        return m.markdown({ codeLanguages: modeList as any });
      }
    }),
    makeSpec({
      name: 'MS SQL',
      mime: 'text/x-mssql',
      load() {
        return sql('MSSQL');
      }
    }),
    makeSpec({
      name: 'MySQL',
      mime: 'text/x-mysql',
      load() {
        return sql('MySQL');
      }
    }),
    makeSpec({
      name: 'PHP',
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
    }),
    makeSpec({
      name: 'PLSQL',
      mime: 'text/x-plsql',
      extensions: ['pls'],
      load() {
        return sql('PLSQL');
      }
    }),
    makeSpec({
      name: 'PostgreSQL',
      mime: 'text/x-pgsql',
      load() {
        return sql('PostgreSQL');
      }
    }),
    makeSpec({
      name: 'Python',
      mime: 'text/x-python',
      extensions: ['BUILD', 'bzl', 'py', 'pyw'],
      filename: /^(BUCK|BUILD)$/,
      load() {
        return Promise.resolve(python());
      }
    }),
    makeSpec({
      name: 'Rust',
      mime: 'text/x-rustsrc',
      extensions: ['rs'],
      async load() {
        const m = await import('@codemirror/lang-rust');
        return m.rust();
      }
    }),
    makeSpec({
      name: 'SQL',
      mime: 'text/x-sql',
      extensions: ['sql'],
      load() {
        return sql('StandardSQL');
      }
    }),
    makeSpec({
      name: 'SQLite',
      mime: 'text/x-sqlite',
      load() {
        return sql('SQLite');
      }
    }),
    makeSpec({
      name: 'TSX',
      alias: ['TypeScript-JSX'],
      mime: 'text/typescript-jsx',
      extensions: ['tsx'],
      async load() {
        const m = await import('@codemirror/lang-javascript');
        return m.javascript({ jsx: true, typescript: true });
      }
    }),
    makeSpec({
      name: 'TypeScript',
      alias: ['ts'],
      mime: 'application/typescript',
      extensions: ['ts'],
      async load() {
        const m = await import('@codemirror/lang-javascript');
        return m.javascript({ typescript: true });
      }
    }),
    makeSpec({
      name: 'WebAssembly',
      mime: 'text/webassembly',
      extensions: ['wat', 'wast'],
      async load() {
        const m = await import('@codemirror/lang-wast');
        return m.wast();
      }
    }),
    makeSpec({
      name: 'XML',
      alias: ['rss', 'wsdl', 'xsd'],
      mime: ['application/xml', 'text/xml'],
      extensions: ['xml', 'xsl', 'xsd', 'svg'],
      async load() {
        const m = await import('@codemirror/lang-xml');
        return m.xml();
      }
    }),

    // Legacy modes ported from CodeMirror 5

    makeSpec({
      name: 'APL',
      mime: 'text/apl',
      extensions: ['dyalog', 'apl'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/apl');
        return legacy(m.apl);
      }
    }),
    makeSpec({
      name: 'PGP',
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
    }),
    makeSpec({
      name: 'ASN.1',
      mime: 'text/x-ttcn-asn',
      extensions: ['asn', 'asn1'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/asn1');
        return legacy(m.asn1({}));
      }
    }),
    makeSpec({
      name: 'Asterisk',
      mime: 'text/x-asterisk',
      filename: /^extensions\.conf$/i,
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/asterisk');
        return legacy(m.asterisk);
      }
    }),
    makeSpec({
      name: 'Brainfuck',
      mime: 'text/x-brainfuck',
      extensions: ['b', 'bf'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/brainfuck');
        return legacy(m.brainfuck);
      }
    }),
    makeSpec({
      name: 'Cobol',
      mime: 'text/x-cobol',
      extensions: ['cob', 'cpy'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/cobol');
        return legacy(m.cobol);
      }
    }),
    makeSpec({
      name: 'C#',
      alias: ['csharp', 'cs'],
      mime: 'text/x-csharp',
      extensions: ['cs'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/clike');
        return legacy(m.csharp);
      }
    }),
    makeSpec({
      name: 'Clojure',
      mime: 'text/x-clojure',
      extensions: ['clj', 'cljc', 'cljx'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/clojure');
        return legacy(m.clojure);
      }
    }),
    makeSpec({
      name: 'ClojureScript',
      mime: 'text/x-clojurescript',
      extensions: ['cljs'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/clojure');
        return legacy(m.clojure);
      }
    }),
    makeSpec({
      name: 'Closure Stylesheets (GSS)',
      mime: 'text/x-gss',
      extensions: ['gss'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/css');
        return legacy(m.gss);
      }
    }),
    makeSpec({
      name: 'CMake',
      mime: 'text/x-cmake',
      extensions: ['cmake', 'cmake.in'],
      filename: /^CMakeLists\.txt$/,
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/cmake');
        return legacy(m.cmake);
      }
    }),
    makeSpec({
      name: 'CoffeeScript',
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
    }),
    makeSpec({
      name: 'Common Lisp',
      alias: ['lisp'],
      mime: 'text/x-common-lisp',
      extensions: ['cl', 'lisp', 'el'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/commonlisp');
        return legacy(m.commonLisp);
      }
    }),
    makeSpec({
      name: 'Cypher',
      mime: 'application/x-cypher-query',
      extensions: ['cyp', 'cypher'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/cypher');
        return legacy(m.cypher);
      }
    }),
    makeSpec({
      name: 'Cython',
      mime: 'text/x-cython',
      extensions: ['pyx', 'pxd', 'pxi'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/python');
        return legacy(m.cython);
      }
    }),
    makeSpec({
      name: 'Crystal',
      mime: 'text/x-crystal',
      extensions: ['cr'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/crystal');
        return legacy(m.crystal);
      }
    }),
    makeSpec({
      name: 'D',
      mime: 'text/x-d',
      extensions: ['d'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/d');
        return legacy(m.d);
      }
    }),
    makeSpec({
      name: 'Dart',
      mime: ['application/dart', 'text/x-dart'],
      extensions: ['dart'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/clike');
        return legacy(m.dart);
      }
    }),
    makeSpec({
      name: 'diff',
      mime: 'text/x-diff',
      extensions: ['diff', 'patch'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/diff');
        return legacy(m.diff);
      }
    }),
    makeSpec({
      name: 'Dockerfile',
      mime: 'text/x-dockerfile',
      filename: /^Dockerfile$/,
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/dockerfile');
        return legacy(m.dockerFile);
      }
    }),
    makeSpec({
      name: 'DTD',
      mime: 'application/xml-dtd',
      extensions: ['dtd'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/dtd');
        return legacy(m.dtd);
      }
    }),
    makeSpec({
      name: 'Dylan',
      mime: 'text/x-dylan',
      extensions: ['dylan', 'dyl', 'intr'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/dylan');
        return legacy(m.dylan);
      }
    }),
    makeSpec({
      name: 'EBNF',
      mime: 'text/x-ebnf',
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/ebnf');
        return legacy(m.ebnf);
      }
    }),
    makeSpec({
      name: 'ECL',
      mime: 'text/x-ecl',
      extensions: ['ecl'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/ecl');
        return legacy(m.ecl);
      }
    }),
    makeSpec({
      name: 'edn',
      mime: 'application/edn',
      extensions: ['edn'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/clojure');
        return legacy(m.clojure);
      }
    }),
    makeSpec({
      name: 'Eiffel',
      mime: 'text/x-eiffel',
      extensions: ['e'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/eiffel');
        return legacy(m.eiffel);
      }
    }),
    makeSpec({
      name: 'Elm',
      mime: 'text/x-elm',
      extensions: ['elm'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/elm');
        return legacy(m.elm);
      }
    }),
    makeSpec({
      name: 'Erlang',
      mime: 'text/x-erlang',
      extensions: ['erl'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/erlang');
        return legacy(m.erlang);
      }
    }),
    makeSpec({
      name: 'Esper',
      mime: 'text/x-esper',
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/sql');
        return legacy(m.esper);
      }
    }),
    makeSpec({
      name: 'Factor',
      mime: 'text/x-factor',
      extensions: ['factor'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/factor');
        return legacy(m.factor);
      }
    }),
    makeSpec({
      name: 'FCL',
      mime: 'text/x-fcl',
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/fcl');
        return legacy(m.fcl);
      }
    }),
    makeSpec({
      name: 'Forth',
      mime: 'text/x-forth',
      extensions: ['forth', 'fth', '4th'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/forth');
        return legacy(m.forth);
      }
    }),
    makeSpec({
      name: 'Fortran',
      mime: 'text/x-fortran',
      extensions: ['f', 'for', 'f77', 'f90', 'f95'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/fortran');
        return legacy(m.fortran);
      }
    }),
    makeSpec({
      name: 'F#',
      alias: ['fsharp'],
      mime: 'text/x-fsharp',
      extensions: ['fs'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/mllike');
        return legacy(m.fSharp);
      }
    }),
    makeSpec({
      name: 'Gas',
      mime: 'text/x-gas',
      extensions: ['s'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/gas');
        return legacy(m.gas);
      }
    }),
    makeSpec({
      name: 'Gherkin',
      mime: 'text/x-feature',
      extensions: ['feature'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/gherkin');
        return legacy(m.gherkin);
      }
    }),
    makeSpec({
      name: 'Go',
      mime: 'text/x-go',
      extensions: ['go'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/go');
        return legacy(m.go);
      }
    }),
    makeSpec({
      name: 'Groovy',
      mime: 'text/x-groovy',
      extensions: ['groovy', 'gradle'],
      filename: /^Jenkinsfile$/,
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/groovy');
        return legacy(m.groovy);
      }
    }),
    makeSpec({
      name: 'Haskell',
      mime: 'text/x-haskell',
      extensions: ['hs'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/haskell');
        return legacy(m.haskell);
      }
    }),
    makeSpec({
      name: 'Haxe',
      mime: 'text/x-haxe',
      extensions: ['hx'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/haxe');
        return legacy(m.haxe);
      }
    }),
    makeSpec({
      name: 'HXML',
      mime: 'text/x-hxml',
      extensions: ['hxml'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/haxe');
        return legacy(m.hxml);
      }
    }),
    makeSpec({
      name: 'HTTP',
      mime: 'message/http',
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/http');
        return legacy(m.http);
      }
    }),
    makeSpec({
      name: 'IDL',
      mime: 'text/x-idl',
      extensions: ['pro'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/idl');
        return legacy(m.idl);
      }
    }),
    makeSpec({
      name: 'JSON-LD',
      alias: ['jsonld'],
      mime: 'application/ld+json',
      extensions: ['jsonld'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/javascript');
        return legacy(m.jsonld);
      }
    }),
    makeSpec({
      name: 'Jinja2',
      mime: 'text/jinja2',
      extensions: ['j2', 'jinja', 'jinja2'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/jinja2');
        return legacy(m.jinja2);
      }
    }),
    makeSpec({
      name: 'Julia',
      mime: 'text/x-julia',
      extensions: ['jl'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/julia');
        return legacy(m.julia);
      }
    }),
    makeSpec({
      name: 'Kotlin',
      mime: 'text/x-kotlin',
      extensions: ['kt'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/clike');
        return legacy(m.kotlin);
      }
    }),
    makeSpec({
      name: 'LESS',
      mime: 'text/x-less',
      extensions: ['less'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/css');
        return legacy(m.less);
      }
    }),
    makeSpec({
      name: 'LiveScript',
      alias: ['ls'],
      mime: 'text/x-livescript',
      extensions: ['ls'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/livescript');
        return legacy(m.liveScript);
      }
    }),
    makeSpec({
      name: 'Lua',
      mime: 'text/x-lua',
      extensions: ['lua'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/lua');
        return legacy(m.lua);
      }
    }),
    makeSpec({
      name: 'mIRC',
      mime: 'text/mirc',
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/mirc');
        return legacy(m.mirc);
      }
    }),
    makeSpec({
      name: 'Mathematica',
      mime: 'text/x-mathematica',
      extensions: ['m', 'nb', 'wl', 'wls'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/mathematica');
        return legacy(m.mathematica);
      }
    }),
    makeSpec({
      name: 'Modelica',
      mime: 'text/x-modelica',
      extensions: ['mo'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/modelica');
        return legacy(m.modelica);
      }
    }),
    makeSpec({
      name: 'MUMPS',
      mime: 'text/x-mumps',
      extensions: ['mps'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/mumps');
        return legacy(m.mumps);
      }
    }),
    makeSpec({
      name: 'mbox',
      mime: 'application/mbox',
      extensions: ['mbox'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/mbox');
        return legacy(m.mbox);
      }
    }),
    makeSpec({
      name: 'Nginx',
      mime: 'text/x-nginx-conf',
      filename: /nginx.*\.conf$/i,
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/nginx');
        return legacy(m.nginx);
      }
    }),
    makeSpec({
      name: 'NSIS',
      mime: 'text/x-nsis',
      extensions: ['nsh', 'nsi'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/nsis');
        return legacy(m.nsis);
      }
    }),
    makeSpec({
      name: 'NTriples',
      mime: ['application/n-triples', 'application/n-quads', 'text/n-triples'],
      extensions: ['nt', 'nq'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/ntriples');
        return legacy(m.ntriples);
      }
    }),
    makeSpec({
      name: 'Objective-C',
      alias: ['objective-c', 'objc'],
      mime: 'text/x-objectivec',
      extensions: ['m'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/clike');
        return legacy(m.objectiveC);
      }
    }),
    makeSpec({
      name: 'Objective-C++',
      alias: ['objective-c++', 'objc++'],
      mime: 'text/x-objectivec++',
      extensions: ['mm'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/clike');
        return legacy(m.objectiveCpp);
      }
    }),
    makeSpec({
      name: 'OCaml',
      mime: 'text/x-ocaml',
      extensions: ['ml', 'mli', 'mll', 'mly'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/mllike');
        return legacy(m.oCaml);
      }
    }),
    makeSpec({
      name: 'Octave',
      mime: 'text/x-octave',
      extensions: ['m'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/octave');
        return legacy(m.octave);
      }
    }),
    makeSpec({
      name: 'Oz',
      mime: 'text/x-oz',
      extensions: ['oz'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/oz');
        return legacy(m.oz);
      }
    }),
    makeSpec({
      name: 'Pascal',
      mime: 'text/x-pascal',
      extensions: ['p', 'pas'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/pascal');
        return legacy(m.pascal);
      }
    }),
    makeSpec({
      name: 'Perl',
      mime: 'text/x-perl',
      extensions: ['pl', 'pm'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/perl');
        return legacy(m.perl);
      }
    }),
    makeSpec({
      name: 'Pig',
      mime: 'text/x-pig',
      extensions: ['pig'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/pig');
        return legacy(m.pig);
      }
    }),
    makeSpec({
      name: 'PowerShell',
      mime: 'application/x-powershell',
      extensions: ['ps1', 'psd1', 'psm1'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/powershell');
        return legacy(m.powerShell);
      }
    }),
    makeSpec({
      name: 'Properties files',
      alias: ['ini', 'properties'],
      mime: 'text/x-properties',
      extensions: ['properties', 'ini', 'in'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/properties');
        return legacy(m.properties);
      }
    }),
    makeSpec({
      name: 'ProtoBuf',
      mime: 'text/x-protobuf',
      extensions: ['proto'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/protobuf');
        return legacy(m.protobuf);
      }
    }),
    makeSpec({
      name: 'Puppet',
      mime: 'text/x-puppet',
      extensions: ['pp'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/puppet');
        return legacy(m.puppet);
      }
    }),
    makeSpec({
      name: 'Q',
      mime: 'text/x-q',
      extensions: ['q'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/q');
        return legacy(m.q);
      }
    }),
    makeSpec({
      name: 'R',
      alias: ['rscript'],
      mime: 'text/x-rsrc',
      extensions: ['r', 'R'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/r');
        return legacy(m.r);
      }
    }),
    makeSpec({
      name: 'RPM Changes',
      mime: 'text/x-rpm-changes',
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/rpm');
        return legacy(m.rpmChanges);
      }
    }),
    makeSpec({
      name: 'RPM Spec',
      mime: 'text/x-rpm-spec',
      extensions: ['spec'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/rpm');
        return legacy(m.rpmSpec);
      }
    }),
    makeSpec({
      name: 'Ruby',
      alias: ['jruby', 'macruby', 'rake', 'rb', 'rbx'],
      mime: 'text/x-ruby',
      extensions: ['rb'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/ruby');
        return legacy(m.ruby);
      }
    }),
    makeSpec({
      name: 'SAS',
      mime: 'text/x-sas',
      extensions: ['sas'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/sas');
        return legacy(m.sas);
      }
    }),
    makeSpec({
      name: 'Scala',
      mime: 'text/x-scala',
      extensions: ['scala'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/clike');
        return legacy(m.scala);
      }
    }),
    makeSpec({
      name: 'Scheme',
      mime: 'text/x-scheme',
      extensions: ['scm', 'ss'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/scheme');
        return legacy(m.scheme);
      }
    }),
    makeSpec({
      name: 'SCSS',
      mime: 'text/x-scss',
      extensions: ['scss'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/css');
        return legacy(m.sCSS);
      }
    }),
    makeSpec({
      name: 'Shell',
      alias: ['bash', 'sh', 'zsh'],
      mime: ['text/x-sh', 'application/x-sh'],
      extensions: ['sh', 'ksh', 'bash'],
      filename: /^PKGBUILD$/,
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/shell');
        return legacy(m.shell);
      }
    }),
    makeSpec({
      name: 'Sieve',
      mime: 'application/sieve',
      extensions: ['siv', 'sieve'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/sieve');
        return legacy(m.sieve);
      }
    }),
    makeSpec({
      name: 'Smalltalk',
      mime: 'text/x-stsrc',
      extensions: ['st'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/smalltalk');
        return legacy(m.smalltalk);
      }
    }),
    makeSpec({
      name: 'Solr',
      mime: 'text/x-solr',
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/solr');
        return legacy(m.solr);
      }
    }),
    makeSpec({
      name: 'SML',
      mime: 'text/x-sml',
      extensions: ['sml', 'sig', 'fun', 'smackspec'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/mllike');
        return legacy(m.sml);
      }
    }),
    makeSpec({
      name: 'SPARQL',
      alias: ['sparul'],
      mime: 'application/sparql-query',
      extensions: ['rq', 'sparql'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/sparql');
        return legacy(m.sparql);
      }
    }),
    makeSpec({
      name: 'Spreadsheet',
      alias: ['excel', 'formula'],
      mime: 'text/x-spreadsheet',
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/spreadsheet');
        return legacy(m.spreadsheet);
      }
    }),
    makeSpec({
      name: 'SQL',
      mime: 'text/x-sql',
      extensions: ['sql'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/sql');
        return legacy(m.standardSQL);
      }
    }),
    makeSpec({
      name: 'SQLite',
      mime: 'text/x-sqlite',
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/sql');
        return legacy(m.sqlite);
      }
    }),
    makeSpec({
      name: 'Squirrel',
      mime: 'text/x-squirrel',
      extensions: ['nut'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/clike');
        return legacy(m.squirrel);
      }
    }),
    makeSpec({
      name: 'Stylus',
      mime: 'text/x-styl',
      extensions: ['styl'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/stylus');
        return legacy(m.stylus);
      }
    }),
    makeSpec({
      name: 'Swift',
      mime: 'text/x-swift',
      extensions: ['swift'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/swift');
        return legacy(m.swift);
      }
    }),
    makeSpec({
      name: 'sTeX',
      mime: 'text/x-stex',
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/stex');
        return legacy(m.stex);
      }
    }),
    makeSpec({
      name: 'LaTeX',
      alias: ['tex'],
      mime: 'text/x-latex',
      extensions: ['text', 'ltx', 'tex'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/stex');
        return legacy(m.stex);
      }
    }),
    makeSpec({
      name: 'SystemVerilog',
      mime: 'text/x-systemverilog',
      extensions: ['v', 'sv', 'svh'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/verilog');
        return legacy(m.verilog);
      }
    }),
    makeSpec({
      name: 'Tcl',
      mime: 'text/x-tcl',
      extensions: ['tcl'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/tcl');
        return legacy(m.tcl);
      }
    }),
    makeSpec({
      name: 'Textile',
      mime: 'text/x-textile',
      extensions: ['textile'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/textile');
        return legacy(m.textile);
      }
    }),
    makeSpec({
      name: 'TiddlyWiki',
      mime: 'text/x-tiddlywiki',
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/tiddlywiki');
        return legacy(m.tiddlyWiki);
      }
    }),
    makeSpec({
      name: 'Tiki wiki',
      mime: 'text/tiki',
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/tiki');
        return legacy(m.tiki);
      }
    }),
    makeSpec({
      name: 'TOML',
      mime: 'text/x-toml',
      extensions: ['toml'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/toml');
        return legacy(m.toml);
      }
    }),
    makeSpec({
      name: 'troff',
      mime: 'text/troff',
      extensions: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/troff');
        return legacy(m.troff);
      }
    }),
    makeSpec({
      name: 'TTCN',
      mime: 'text/x-ttcn',
      extensions: ['ttcn', 'ttcn3', 'ttcnpp'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/ttcn');
        return legacy(m.ttcn);
      }
    }),
    makeSpec({
      name: 'TTCN_CFG',
      mime: 'text/x-ttcn-cfg',
      extensions: ['cfg'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/ttcn-cfg');
        return legacy(m.ttcnCfg);
      }
    }),
    makeSpec({
      name: 'Turtle',
      mime: 'text/turtle',
      extensions: ['ttl'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/turtle');
        return legacy(m.turtle);
      }
    }),
    makeSpec({
      name: 'Web IDL',
      mime: 'text/x-webidl',
      extensions: ['webidl'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/webidl');
        return legacy(m.webIDL);
      }
    }),
    makeSpec({
      name: 'VB.NET',
      mime: 'text/x-vb',
      extensions: ['vb'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/vb');
        return legacy(m.vb);
      }
    }),
    makeSpec({
      name: 'VBScript',
      mime: 'text/vbscript',
      extensions: ['vbs'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/vbscript');
        return legacy(m.vbScript);
      }
    }),
    makeSpec({
      name: 'Velocity',
      mime: 'text/velocity',
      extensions: ['vtl'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/velocity');
        return legacy(m.velocity);
      }
    }),
    makeSpec({
      name: 'Verilog',
      mime: 'text/x-verilog',
      extensions: ['v'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/verilog');
        return legacy(m.verilog);
      }
    }),
    makeSpec({
      name: 'VHDL',
      mime: 'text/x-vhdl',
      extensions: ['vhd', 'vhdl'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/vhdl');
        return legacy(m.vhdl);
      }
    }),
    makeSpec({
      name: 'XQuery',
      mime: 'application/xquery',
      extensions: ['xy', 'xquery'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/xquery');
        return legacy(m.xQuery);
      }
    }),
    makeSpec({
      name: 'Yacas',
      mime: 'text/x-yacas',
      extensions: ['ys'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/yacas');
        return legacy(m.yacas);
      }
    }),
    makeSpec({
      name: 'YAML',
      alias: ['yml'],
      mime: ['text/x-yaml', 'text/yaml'],
      extensions: ['yaml', 'yml'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/yaml');
        return legacy(m.yaml);
      }
    }),
    makeSpec({
      name: 'Z80',
      mime: 'text/x-z80',
      extensions: ['z80'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/z80');
        return legacy(m.z80);
      }
    }),
    makeSpec({
      name: 'mscgen',
      mime: 'text/x-mscgen',
      extensions: ['mscgen', 'mscin', 'msc'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/mscgen');
        return legacy(m.mscgen);
      }
    }),
    makeSpec({
      name: 'xu',
      mime: 'text/x-xu',
      extensions: ['xu'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/mscgen');
        return legacy(m.xu);
      }
    }),
    makeSpec({
      name: 'msgenny',
      mime: 'text/x-msgenny',
      extensions: ['msgenny'],
      async load() {
        const m = await import('@codemirror/legacy-modes/mode/mscgen');
        return legacy(m.msgenny);
      }
    })
  ];

  /**
   * Get the raw list of available modes specs.
   */
  export function getModeInfo(): ISpec[] {
    return modeList as ISpec[];
  }

  /**
   * Find a codemirror mode by MIME.
   */
  export function findByMIME(mime: string | readonly string[]): ISpec | null {
    if (Array.isArray(mime)) {
      for (let i = 0; i < mime.length; i++) {
        const spec = findByMIME(mime[i]);
        if (spec) return spec;
      }
      return null;
    }
    mime = (mime as string).toLowerCase();
    for (let i = 0; i < modeList.length; i++) {
      let info = modeList[i];
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
    if (/\+xml$/.test(mime)) return findByMIME('application/xml');
    if (/\+json$/.test(mime)) return findByMIME('application/json');
    return null;
  }

  /**
   * Find a codemirror mode by name.
   */
  export function findByName(name: string): ISpec | null {
    name = name.toLowerCase();
    for (let i = 0; i < modeList.length; i++) {
      let info = modeList[i];
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
   */
  export function findByExtension(
    ext: string | readonly string[]
  ): ISpec | null {
    if (Array.isArray(ext)) {
      for (let i = 0; i < ext.length; i++) {
        const spec = findByExtension(ext[i]);
        if (spec) return spec;
      }
      return null;
    }
    ext = (ext as string).toLowerCase();
    for (let i = 0; i < modeList.length; i++) {
      let info = modeList[i];
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
   */
  export function findByFileName(name: string): ISpec | null {
    const basename = PathExt.basename(name);
    for (let i = 0; i < modeList.length; i++) {
      let info = modeList[i];
      if (info.filename && info.filename.test(basename)) {
        return info;
      }
    }
    let dot = basename.lastIndexOf('.');
    let ext = dot > -1 && basename.substring(dot + 1, basename.length);
    if (ext) {
      return findByExtension(ext);
    }
    return null;
  }

  /**
   * Find a codemirror mode by name or CodeMirror spec.
   */
  export function findBest(mode: string | ISpec): ISpec | null {
    const modename = typeof mode === 'string' ? mode : mode.name;
    const mimetype = typeof mode !== 'string' ? mode.mime : modename;
    const ext = typeof mode !== 'string' ? mode.extensions ?? [] : [];

    return (
      findByName(modename || '') ||
      findByMIME(mimetype || '') ||
      findByExtension(ext) ||
      findByMIME(IEditorMimeTypeService.defaultMimeType) ||
      findByMIME('text/plain')
    );
  }

  /**
   * Ensure a codemirror mode is available by name or Codemirror spec.
   *
   * @param mode - The mode to ensure.  If it is a string, uses [findBest]
   *   to get the appropriate spec.
   *
   * @returns A promise that resolves when the mode is available.
   */
  export async function ensure(mode: string | ISpec): Promise<ISpec | null> {
    const spec = findBest(mode);
    if (spec) {
      spec.support = await spec.load!();
      return spec;
    }
    return null;
  }

  /**
   *
   */
  export function registerModeInfo(mode: ISpec): void {
    const info = findBest(mode);
    if (info) {
      throw new Error(`$"mode.mime" already registered`);
    }
    modeList.push(makeSpec(mode));
  }

  export function run(code: string, mode: ISpec, el: HTMLElement): void {
    const language = mode.support?.language;
    if (!language) return;

    const tree = language.parser.parse(code);
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
}
