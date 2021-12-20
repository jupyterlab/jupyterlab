// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IEditorMimeTypeService } from '@jupyterlab/codeeditor';
import { PathExt } from '@jupyterlab/coreutils';
import { LanguageSupport, LanguageDescription } from '@codemirror/language';
import { StreamParser } from '@codemirror/stream-parser'

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

  export function legacy(parser: StreamParser<unknown>): Promise<LanguageSupport> {
    return import("@codemirror/stream-parser").then(m => new LanguageSupport(m.StreamLanguage.define(parser)))
  }

  function sql(dialectName: keyof typeof import("@codemirror/lang-sql")) {
    return import("@codemirror/lang-sql").then(m => m.sql({dialect: (m as any)[dialectName]}))
  }

  // Code mirror uses two similar structures, a plain object with optional fields,
  // and a class with the same fields but all mandatory. Maybe adopting the same
  // pattern would be less confusing (although far more verbose)
  function makeSpec(spec: ISpec): ISpec {
    let res = (LanguageDescription.of(spec) as unknown) as ISpec;
    res.mime = spec.mime;
    return res;
  }

  const goldorak = [
    makeSpec({
      name: "C",
      mime: "text/x-csrc",
      extensions: ['c', 'h', 'ino'],
      load() {
        return import("@codemirror/lang-cpp").then(m => m.cpp())
      }
    }),
    makeSpec({
      name: "C++",
      mime: "text/x-c++src",
      extensions: ["cpp","c++","cc","cxx","hpp","h++","hh","hxx"],
      load() {
        return import("@codemirror/lang-cpp").then(m => m.cpp())
      }
    }),
    makeSpec({
      name: "CQL",
      mime: "text/x-cassandra",
      extensions: ["cql"],
      load() {
        return sql("Cassandra")
      }
    }),
    makeSpec({
      name: "CSS",
      mime: "text/css",
      extensions: ["css"],
      load() {
        return import("@codemirror/lang-css").then(m => m.css())
      }
    }),
    makeSpec({
      name: "HTML",
      alias: ["xhtml"],
      mime: "text/html",
      extensions: ["html", "htm", "handlebars", "hbs"],
      load() {
        return import("@codemirror/lang-html").then(m => m.html())
      }
    }),
    makeSpec({
      name: "Java",
      mime: "text/x-java",
      extensions: ["java"],
      load() {
        return import("@codemirror/lang-java").then(m => m.java())
      }
    }),
    makeSpec({
      name: "Javascript",
      alias: ["ecmascript", "js", "node"],
      mime: ["text/javascript", "text/ecmascript", "application/javascript", "application/x-javascript", "application/ecmascript"],
      extensions: ["js", "mjs", "cjs"],
      load() {
        return import("@codemirror/lang-javascript").then(m => m.javascript())
      }
    }),
    makeSpec({
      name: "JSON",
      alias: ["json5"],
      mime: ["application/json", "application/x-json"],
      extensions: ["json", "map"],
      load() {
        return import("@codemirror/lang-json").then(m => m.json())
      }
    }),
    makeSpec({
      name: "JSX",
      mime: "text/jsx",
      extensions: ["jsx"],
      load() {
        return import("@codemirror/lang-javascript").then(m => m.javascript({jsx: true}))
      }
    }),
    makeSpec({
      name: "MariaDB SQL",
      mime: "text/x-mariadb",
      load() {
        return sql("MariaSQL")
      }
    }),
    makeSpec({
      name: "Markdown",
      mime: "text/x-markdown",
      extensions: ["md", "markdown", "mkd"],
      load() {
        return import("@codemirror/lang-markdown").then(m => m.markdown())
      }
    }),
    makeSpec({
      name: "MS SQL",
      mime: "text/x-mssql",
      load() { return sql("MSSQL") }
    }),
    makeSpec({
      name: "MySQL",
      mime: "text/x-mysql",
      load() { return sql("MySQL") }
    }),
    makeSpec({
      name: "PHP",
      mime: ["text/x-php", "application/x-httpd-php", "application/x-httpd-php-open"],
      extensions: ["php", "php3", "php4", "php5", "php7", "phtml"],
      load() {
        return import("@codemirror/lang-php").then(m => m.php())
      }
    }),
    makeSpec({
      name: "PLSQL",
      mime: "text/x-plsql",
      extensions: ["pls"],
      load() { return sql("PLSQL") }
    }),
    makeSpec({
      name: "PostgreSQL",
      mime: "text/x-pgsql",
      load() { return sql("PostgreSQL") }
    }),
    makeSpec({
      name: "Python",
      mime: "text/x-python",
      extensions: ["BUILD","bzl","py","pyw"],
      filename: /^(BUCK|BUILD)$/,
      load() {
        return import("@codemirror/lang-python").then(m => m.python())
      }
    }),
    makeSpec({
      name: "Rust",
      mime: "text/x-rustsrc",
      extensions: ["rs"],
      load() {
        return import("@codemirror/lang-rust").then(m => m.rust())
      }
    }),
    makeSpec({
      name: "SQL",
      mime: "text/x-sql",
      extensions: ["sql"],
      load() { return sql("StandardSQL") }
    }),
    makeSpec({
      name: "SQLite",
      mime: "text/x-sqlite",
      load() { return sql("SQLite") }
    }),
  makeSpec({
    name: "TSX",
    alias: ["TypeScript-JSX"],
    mime: "text/typescript-jsx",
    extensions: ["tsx"],
    load() {
      return import("@codemirror/lang-javascript").then(m => m.javascript({jsx: true, typescript: true}))
    }
    }),
    makeSpec({
      name: "TypeScript",
      alias: ["ts"],
      mime: "application/typescript",
      extensions: ["ts"],
      load() {
        return import("@codemirror/lang-javascript").then(m => m.javascript({typescript: true}))
      }
    }),
    makeSpec({
      name: "WebAssembly",
      mime: "text/webassembly",
      extensions: ["wat","wast"],
      load() {
        return import("@codemirror/lang-wast").then(m => m.wast())
      }
    }),
    makeSpec({
      name: "XML",
      alias: ["rss","wsdl","xsd"],
      mime: ["application/xml", "text/xml"],
      extensions: ["xml","xsl","xsd","svg"],
      load() {
        return import("@codemirror/lang-xml").then(m => m.xml())
      }
    }),

    // Legacy modes ported from CodeMirror 5

    makeSpec({
      name: "APL",
      mime: "text/apl",
      extensions: ["dyalog","apl"],
      load() {
        return import("@codemirror/legacy-modes/mode/apl").then(m => legacy(m.apl))
      }
    }),
    makeSpec({
      name: "PGP",
      alias: ["asciiarmor"],
      mime: ["application/pgp", "application/pgp-encrypted", "application/pgp-keys", "application/pgp-signature"],
      extensions: ["asc","pgp","sig"],
      load() {
        return import("@codemirror/legacy-modes/mode/asciiarmor").then(m => legacy(m.asciiArmor))
      }
    }),
    makeSpec({
      name: "ASN.1",
      mime: "text/x-ttcn-asn",
      extensions: ["asn","asn1"],
      load() {
        return import("@codemirror/legacy-modes/mode/asn1").then(m => legacy(m.asn1({})))
      }
    }),
    makeSpec({
      name: "Asterisk",
      mime: "text/x-asterisk",
      filename: /^extensions\.conf$/i,
      load() {
        return import("@codemirror/legacy-modes/mode/asterisk").then(m => legacy(m.asterisk))
      }
    }),
    makeSpec({
      name: "Brainfuck",
      mime: "text/x-brainfuck",
      extensions: ["b","bf"],
      load() {
        return import("@codemirror/legacy-modes/mode/brainfuck").then(m => legacy(m.brainfuck))
      }
    }),
    makeSpec({
      name: "Cobol",
      mime: "text/x-cobol",
      extensions: ["cob","cpy"],
      load() {
        return import("@codemirror/legacy-modes/mode/cobol").then(m => legacy(m.cobol))
      }
    }),
    makeSpec({
      name: "C#",
      alias: ["csharp","cs"],
      mime: "text/x-csharp", 
      extensions: ["cs"],
      load() {
        return import("@codemirror/legacy-modes/mode/clike").then(m => legacy(m.csharp))
      }
    }),
    makeSpec({
      name: "Clojure",
      mime: "text/x-clojure",
      extensions: ["clj","cljc","cljx"],
      load() {
        return import("@codemirror/legacy-modes/mode/clojure").then(m => legacy(m.clojure))
      }
    }),
    makeSpec({
      name: "ClojureScript",
      mime: "text/x-clojurescript",
      extensions: ["cljs"],
      load() {
        return import("@codemirror/legacy-modes/mode/clojure").then(m => legacy(m.clojure))
      }
    }),
    makeSpec({
      name: "Closure Stylesheets (GSS)",
      mime: "text/x-gss",
      extensions: ["gss"],
      load() {
        return import("@codemirror/legacy-modes/mode/css").then(m => legacy(m.gss))
      }
    }),
    makeSpec({
      name: "CMake",
      mime: "text/x-cmake",
      extensions: ["cmake","cmake.in"],
      filename: /^CMakeLists\.txt$/,
      load() {
        return import("@codemirror/legacy-modes/mode/cmake").then(m => legacy(m.cmake))
      }
    }),
    makeSpec({
      name: "CoffeeScript",
      alias: ["coffee","coffee-script"],
      mime: ["application/vnd.coffeescript", "text/coffeescript", "text/x-coffeescript"],
      extensions: ["coffee"],
      load() {
        return import("@codemirror/legacy-modes/mode/coffeescript").then(m => legacy(m.coffeeScript))
      }
    }),
    makeSpec({
      name: "Common Lisp",
      alias: ["lisp"],
      mime: "text/x-common-lisp",
      extensions: ["cl","lisp","el"],
      load() {
        return import("@codemirror/legacy-modes/mode/commonlisp").then(m => legacy(m.commonLisp))
      }
    }),
    makeSpec({
      name: "Cypher",
      mime: "application/x-cypher-query",
      extensions: ["cyp","cypher"],
      load() {
        return import("@codemirror/legacy-modes/mode/cypher").then(m => legacy(m.cypher))
      }
    }),
    makeSpec({
      name: "Cython",
      mime: "text/x-cython",
      extensions: ["pyx","pxd","pxi"],
      load() {
        return import("@codemirror/legacy-modes/mode/python").then(m => legacy(m.cython))
      }
    }),
    makeSpec({
      name: "Crystal",
      mime: "text/x-crystal",
      extensions: ["cr"],
      load() {
        return import("@codemirror/legacy-modes/mode/crystal").then(m => legacy(m.crystal))
      }
    }),
    makeSpec({
      name: "D",
      mime: "text/x-d",
      extensions: ["d"],
      load() {
        return import("@codemirror/legacy-modes/mode/d").then(m => legacy(m.d))
      }
    }),
    makeSpec({
      name: "Dart",
      mime: ["application/dart", "text/x-dart"],
      extensions: ["dart"],
      load() {
        return import("@codemirror/legacy-modes/mode/clike").then(m => legacy(m.dart))
      }
    }),
    makeSpec({
      name: "diff",
      mime: "text/x-diff", 
      extensions: ["diff","patch"],
      load() {
        return import("@codemirror/legacy-modes/mode/diff").then(m => legacy(m.diff))
      }
    }),
    makeSpec({
      name: "Dockerfile",
      mime: "text/x-dockerfile", 
      filename: /^Dockerfile$/,
      load() {
        return import("@codemirror/legacy-modes/mode/dockerfile").then(m => legacy(m.dockerFile))
      }
    }),
    makeSpec({
      name: "DTD",
      mime: "application/xml-dtd",
      extensions: ["dtd"],
      load() {
        return import("@codemirror/legacy-modes/mode/dtd").then(m => legacy(m.dtd))
      }
    }),
    makeSpec({
      name: "Dylan",
      mime: "text/x-dylan", 
      extensions: ["dylan","dyl","intr"],
      load() {
        return import("@codemirror/legacy-modes/mode/dylan").then(m => legacy(m.dylan))
      }
    }),
    makeSpec({
      name: "EBNF",
      mime: "text/x-ebnf", 
      load() {
        return import("@codemirror/legacy-modes/mode/ebnf").then(m => legacy(m.ebnf))
      }
    }),
    makeSpec({
      name: "ECL",
      mime: "text/x-ecl",
      extensions: ["ecl"],
      load() {
        return import("@codemirror/legacy-modes/mode/ecl").then(m => legacy(m.ecl))
      }
    }),
    makeSpec({
      name: "edn",
      mime: "application/edn", 
      extensions: ["edn"],
      load() {
        return import("@codemirror/legacy-modes/mode/clojure").then(m => legacy(m.clojure))
      }
    }),
    makeSpec({
      name: "Eiffel",
      mime: "text/x-eiffel", 
      extensions: ["e"],
      load() {
        return import("@codemirror/legacy-modes/mode/eiffel").then(m => legacy(m.eiffel))
      }
    }),
    makeSpec({
      name: "Elm",
      mime: "text/x-elm",
      extensions: ["elm"],
      load() {
        return import("@codemirror/legacy-modes/mode/elm").then(m => legacy(m.elm))
      }
    }),
    makeSpec({
      name: "Erlang",
      mime: "text/x-erlang",
      extensions: ["erl"],
      load() {
        return import("@codemirror/legacy-modes/mode/erlang").then(m => legacy(m.erlang))
      }
    }),
    makeSpec({
      name: "Esper",
      mime: "text/x-esper",
      load() {
        return import("@codemirror/legacy-modes/mode/sql").then(m => legacy(m.esper))
      }
    }),
    makeSpec({
      name: "Factor",
      mime: "text/x-factor",
      extensions: ["factor"],
      load() {
        return import("@codemirror/legacy-modes/mode/factor").then(m => legacy(m.factor))
      }
    }),
    makeSpec({
      name: "FCL",
      mime: "text/x-fcl",
      load() {
        return import("@codemirror/legacy-modes/mode/fcl").then(m => legacy(m.fcl))
      }
    }),
    makeSpec({
      name: "Forth",
      mime: "text/x-forth",
      extensions: ["forth","fth","4th"],
      load() {
        return import("@codemirror/legacy-modes/mode/forth").then(m => legacy(m.forth))
      }
    }),
    makeSpec({
      name: "Fortran",
      mime: "text/x-fortran",
      extensions: ["f","for","f77","f90","f95"],
      load() {
        return import("@codemirror/legacy-modes/mode/fortran").then(m => legacy(m.fortran))
      }
    }),
    makeSpec({
      name: "F#",
      alias: ["fsharp"],
      mime: "text/x-fsharp",
      extensions: ["fs"],
      load() {
        return import("@codemirror/legacy-modes/mode/mllike").then(m => legacy(m.fSharp))
      }
    }),
    makeSpec({
      name: "Gas",
      mime: "text/x-gas",
      extensions: ["s"],
      load() {
        return import("@codemirror/legacy-modes/mode/gas").then(m => legacy(m.gas))
      }
    }),
    makeSpec({
      name: "Gherkin",
      mime: "text/x-feature",
      extensions: ["feature"],
      load() {
        return import("@codemirror/legacy-modes/mode/gherkin").then(m => legacy(m.gherkin))
      }
    }),
    makeSpec({
      name: "Go",
      mime: "text/x-go",
      extensions: ["go"],
      load() {
        return import("@codemirror/legacy-modes/mode/go").then(m => legacy(m.go))
      }
    }),
    makeSpec({
      name: "Groovy",
      mime: "text/x-groovy",
      extensions: ["groovy","gradle"],
      filename: /^Jenkinsfile$/,
      load() {
        return import("@codemirror/legacy-modes/mode/groovy").then(m => legacy(m.groovy))
      }
    }),
    makeSpec({
      name: "Haskell",
      mime: "text/x-haskell",
      extensions: ["hs"],
      load() {
        return import("@codemirror/legacy-modes/mode/haskell").then(m => legacy(m.haskell))
      }
    }),
    makeSpec({
      name: "Haxe",
      mime: "text/x-haxe",
      extensions: ["hx"],
      load() {
        return import("@codemirror/legacy-modes/mode/haxe").then(m => legacy(m.haxe))
      }
    }),
    makeSpec({
      name: "HXML",
      mime: "text/x-hxml",
      extensions: ["hxml"],
      load() {
        return import("@codemirror/legacy-modes/mode/haxe").then(m => legacy(m.hxml))
      }
    }),
    makeSpec({
      name: "HTTP",
      mime: "message/http",
      load() {
        return import("@codemirror/legacy-modes/mode/http").then(m => legacy(m.http))
      }
    }),
    makeSpec({
      name: "IDL",
      mime: "text/x-idl",
      extensions: ["pro"],
      load() {
        return import("@codemirror/legacy-modes/mode/idl").then(m => legacy(m.idl))
      }
    }),
    makeSpec({
      name: "JSON-LD",
      alias: ["jsonld"],
      mime: "application/ld+json",
      extensions: ["jsonld"],
      load() {
        return import("@codemirror/legacy-modes/mode/javascript").then(m => legacy(m.jsonld))
      }
    }),
    makeSpec({
      name: "Jinja2",
      mime: "text/jinja2",
      extensions: ["j2","jinja","jinja2"],
      load() {
        return import("@codemirror/legacy-modes/mode/jinja2").then(m => legacy(m.jinja2))
      }
    }),
    makeSpec({
      name: "Julia",
      mime: "text/x-julia",
      extensions: ["jl"],
      load() {
        return import("@codemirror/legacy-modes/mode/julia").then(m => legacy(m.julia))
      }
    }),
    makeSpec({
      name: "Kotlin",
      mime: "text/x-kotlin",
      extensions: ["kt"],
      load() {
        return import("@codemirror/legacy-modes/mode/clike").then(m => legacy(m.kotlin))
      }
    }),
    makeSpec({
      name: "LESS",
      mime: "text/x-less",
      extensions: ["less"],
      load() {
        return import("@codemirror/legacy-modes/mode/css").then(m => legacy(m.less))
      }
    }),
    makeSpec({
      name: "LiveScript",
      alias: ["ls"],
      mime: "text/x-livescript",
      extensions: ["ls"],
      load() {
        return import("@codemirror/legacy-modes/mode/livescript").then(m => legacy(m.liveScript))
      }
    }),
    makeSpec({
      name: "Lua",
      mime: "text/x-lua",
      extensions: ["lua"],
      load() {
        return import("@codemirror/legacy-modes/mode/lua").then(m => legacy(m.lua))
      }
    }),
    makeSpec({
      name: "mIRC",
      mime: "text/mirc",
      load() {
        return import("@codemirror/legacy-modes/mode/mirc").then(m => legacy(m.mirc))
      }
    }),
    makeSpec({
      name: "Mathematica",
      mime: "text/x-mathematica",
      extensions: ["m","nb","wl","wls"],
      load() {
        return import("@codemirror/legacy-modes/mode/mathematica").then(m => legacy(m.mathematica))
      }
    }),
    makeSpec({
      name: "Modelica",
      mime: "text/x-modelica",
      extensions: ["mo"],
      load() {
        return import("@codemirror/legacy-modes/mode/modelica").then(m => legacy(m.modelica))
      }
    }),
    makeSpec({
      name: "MUMPS",
      mime: "text/x-mumps",
      extensions: ["mps"],
      load() {
        return import("@codemirror/legacy-modes/mode/mumps").then(m => legacy(m.mumps))
      }
    }),
    makeSpec({
      name: "mbox",
      mime: "application/mbox",
      extensions: ["mbox"],
      load() {
        return import("@codemirror/legacy-modes/mode/mbox").then(m => legacy(m.mbox))
      }
    }),
    makeSpec({
      name: "Nginx",
      mime: "text/x-nginx-conf",
      filename: /nginx.*\.conf$/i,
      load() {
        return import("@codemirror/legacy-modes/mode/nginx").then(m => legacy(m.nginx))
      }
    }),
    makeSpec({
      name: "NSIS",
      mime: "text/x-nsis",
      extensions: ["nsh","nsi"],
      load() {
        return import("@codemirror/legacy-modes/mode/nsis").then(m => legacy(m.nsis))
      }
    }),
    makeSpec({
      name: "NTriples",
      mime: ["application/n-triples", "application/n-quads", "text/n-triples"],
      extensions: ["nt","nq"],
      load() {
        return import("@codemirror/legacy-modes/mode/ntriples").then(m => legacy(m.ntriples))
      }
    }),
    makeSpec({
      name: "Objective-C",
      alias: ["objective-c","objc"],
      mime: "text/x-objectivec",
      extensions: ["m"],
      load() {
        return import("@codemirror/legacy-modes/mode/clike").then(m => legacy(m.objectiveC))
      }
    }),
    makeSpec({
      name: "Objective-C++",
      alias: ["objective-c++","objc++"],
      mime: "text/x-objectivec++",
      extensions: ["mm"],
      load() {
        return import("@codemirror/legacy-modes/mode/clike").then(m => legacy(m.objectiveCpp))
      }
    }),
    makeSpec({
      name: "OCaml",
      mime: "text/x-ocaml",
      extensions: ["ml","mli","mll","mly"],
      load() {
        return import("@codemirror/legacy-modes/mode/mllike").then(m => legacy(m.oCaml))
      }
    }),
    makeSpec({
      name: "Octave",
      mime: "text/x-octave",
      extensions: ["m"],
      load() {
        return import("@codemirror/legacy-modes/mode/octave").then(m => legacy(m.octave))
      }
    }),
    makeSpec({
      name: "Oz",
      mime: "text/x-oz",
      extensions: ["oz"],
      load() {
        return import("@codemirror/legacy-modes/mode/oz").then(m => legacy(m.oz))
      }
    }),
    makeSpec({
      name: "Pascal",
      mime: "text/x-pascal",
      extensions: ["p","pas"],
      load() {
        return import("@codemirror/legacy-modes/mode/pascal").then(m => legacy(m.pascal))
      }
    }),
    makeSpec({
      name: "Perl",
      mime: "text/x-perl",
      extensions: ["pl","pm"],
      load() {
        return import("@codemirror/legacy-modes/mode/perl").then(m => legacy(m.perl))
      }
    }),
    makeSpec({
      name: "Pig",
      mime: "text/x-pig",
      extensions: ["pig"],
      load() {
        return import("@codemirror/legacy-modes/mode/pig").then(m => legacy(m.pig))
      }
    }),
    makeSpec({
      name: "PowerShell",
      mime: "application/x-powershell",
      extensions: ["ps1","psd1","psm1"],
      load() {
        return import("@codemirror/legacy-modes/mode/powershell").then(m => legacy(m.powerShell))
      }
    }),
    makeSpec({
      name: "Properties files",
      alias: ["ini","properties"],
      mime: "text/x-properties",
      extensions: ["properties","ini","in"],
      load() {
        return import("@codemirror/legacy-modes/mode/properties").then(m => legacy(m.properties))
      }
    }),
    makeSpec({
      name: "ProtoBuf",
      mime: "text/x-protobuf",
      extensions: ["proto"],
      load() {
        return import("@codemirror/legacy-modes/mode/protobuf").then(m => legacy(m.protobuf))
      }
    }),
    makeSpec({
      name: "Puppet",
      mime: "text/x-puppet",
      extensions: ["pp"],
      load() {
        return import("@codemirror/legacy-modes/mode/puppet").then(m => legacy(m.puppet))
      }
    }),
    makeSpec({
      name: "Q",
      mime: "text/x-q",
      extensions: ["q"],
      load() {
        return import("@codemirror/legacy-modes/mode/q").then(m => legacy(m.q))
      }
    }),
    makeSpec({
      name: "R",
      alias: ["rscript"],
      mime: "text/x-rsrc",
      extensions: ["r","R"],
      load() {
        return import("@codemirror/legacy-modes/mode/r").then(m => legacy(m.r))
      }
    }),
    makeSpec({
      name: "RPM Changes",
      mime: "text/x-rpm-changes",
      load() {
        return import("@codemirror/legacy-modes/mode/rpm").then(m => legacy(m.rpmChanges))
      }
    }),
    makeSpec({
      name: "RPM Spec",
      mime: "text/x-rpm-spec",
      extensions: ["spec"],
      load() {
        return import("@codemirror/legacy-modes/mode/rpm").then(m => legacy(m.rpmSpec))
      }
    }),
    makeSpec({
      name: "Ruby",
      alias: ["jruby","macruby","rake","rb","rbx"],
      mime: "text/x-ruby",
      extensions: ["rb"],
      load() {
        return import("@codemirror/legacy-modes/mode/ruby").then(m => legacy(m.ruby))
      }
    }),
    makeSpec({
      name: "SAS",
      mime: "text/x-sas",
      extensions: ["sas"],
      load() {
        return import("@codemirror/legacy-modes/mode/sas").then(m => legacy(m.sas))
      }
    }),
    makeSpec({
      name: "Scala",
      mime: "text/x-scala",
      extensions: ["scala"],
      load() {
        return import("@codemirror/legacy-modes/mode/clike").then(m => legacy(m.scala))
      }
    }),
    makeSpec({
      name: "Scheme",
      mime: "text/x-scheme",
      extensions: ["scm","ss"],
      load() {
        return import("@codemirror/legacy-modes/mode/scheme").then(m => legacy(m.scheme))
      }
    }),
    makeSpec({
      name: "SCSS",
      mime: "text/x-scss",
      extensions: ["scss"],
      load() {
        return import("@codemirror/legacy-modes/mode/css").then(m => legacy(m.sCSS))
      }
    }),
    makeSpec({
      name: "Shell",
      alias: ["bash","sh","zsh"],
      mime: ["text/x-sh", "application/x-sh"],
      extensions: ["sh","ksh","bash"],
      filename: /^PKGBUILD$/,
      load() {
        return import("@codemirror/legacy-modes/mode/shell").then(m => legacy(m.shell))
      }
    }),
    makeSpec({
      name: "Sieve",
      mime: "application/sieve",
      extensions: ["siv","sieve"],
      load() {
        return import("@codemirror/legacy-modes/mode/sieve").then(m => legacy(m.sieve))
      }
    }),
    makeSpec({
      name: "Smalltalk",
      mime: "text/x-stsrc",
      extensions: ["st"],
      load() {
        return import("@codemirror/legacy-modes/mode/smalltalk").then(m => legacy(m.smalltalk))
      }
    }),
    makeSpec({
      name: "Solr",
      mime: "text/x-solr",
      load() {
        return import("@codemirror/legacy-modes/mode/solr").then(m => legacy(m.solr))
      }
    }),
    makeSpec({
      name: "SML",
      mime: "text/x-sml",
      extensions: ["sml","sig","fun","smackspec"],
      load() {
        return import("@codemirror/legacy-modes/mode/mllike").then(m => legacy(m.sml))
      }
    }),
    makeSpec({
      name: "SPARQL",
      alias: ["sparul"],
      mime: "application/sparql-query", 
      extensions: ["rq","sparql"],
      load() {
        return import("@codemirror/legacy-modes/mode/sparql").then(m => legacy(m.sparql))
      }
    }),
    makeSpec({
      name: "Spreadsheet",
      alias: ["excel","formula"],
      mime: "text/x-spreadsheet",
      load() {
        return import("@codemirror/legacy-modes/mode/spreadsheet").then(m => legacy(m.spreadsheet))
      }
    }),
    makeSpec({
      name: "SQL",
      mime: "text/x-sql",
      extensions: ["sql"],
      load() {
        return import("@codemirror/legacy-modes/mode/sql").then(m => legacy(m.standardSQL))
      }
    }),
    makeSpec({
      name: "SQLite",
      mime: "text/x-sqlite",
      load() {
        return import("@codemirror/legacy-modes/mode/sql").then(m => legacy(m.sqlite))
      }
    }),
    makeSpec({
      name: "Squirrel",
      mime: "text/x-squirrel",
      extensions: ["nut"],
      load() {
        return import("@codemirror/legacy-modes/mode/clike").then(m => legacy(m.squirrel))
      }
    }),
    makeSpec({
      name: "Stylus",
      mime: "text/x-styl",
      extensions: ["styl"],
      load() {
        return import("@codemirror/legacy-modes/mode/stylus").then(m => legacy(m.stylus))
      }
    }),
    makeSpec({
      name: "Swift",
      mime: "text/x-swift",
      extensions: ["swift"],
      load() {
        return import("@codemirror/legacy-modes/mode/swift").then(m => legacy(m.swift))
      }
    }),
    makeSpec({
      name: "sTeX",
      mime: "text/x-stex",
      load() {
        return import("@codemirror/legacy-modes/mode/stex").then(m => legacy(m.stex))
      }
    }),
    makeSpec({
      name: "LaTeX",
      alias: ["tex"],
      mime: "text/x-latex",
      extensions: ["text","ltx","tex"],
      load() {
        return import("@codemirror/legacy-modes/mode/stex").then(m => legacy(m.stex))
      }
    }),
    makeSpec({
      name: "SystemVerilog",
      mime: "text/x-systemverilog",
      extensions: ["v","sv","svh"],
      load() {
        return import("@codemirror/legacy-modes/mode/verilog").then(m => legacy(m.verilog))
      }
    }),
    makeSpec({
      name: "Tcl",
      mime: "text/x-tcl",
      extensions: ["tcl"],
      load() {
        return import("@codemirror/legacy-modes/mode/tcl").then(m => legacy(m.tcl))
      }
    }),
    makeSpec({
      name: "Textile",
      mime: "text/x-textile",
      extensions: ["textile"],
      load() {
        return import("@codemirror/legacy-modes/mode/textile").then(m => legacy(m.textile))
      }
    }),
    makeSpec({
      name: "TiddlyWiki",
      mime: "text/x-tiddlywiki",
      load() {
        return import("@codemirror/legacy-modes/mode/tiddlywiki").then(m => legacy(m.tiddlyWiki))
      }
    }),
    makeSpec({
      name: "Tiki wiki",
      mime: "text/tiki",
      load() {
        return import("@codemirror/legacy-modes/mode/tiki").then(m => legacy(m.tiki))
      }
    }),
    makeSpec({
      name: "TOML",
      mime: "text/x-toml",
      extensions: ["toml"],
      load() {
        return import("@codemirror/legacy-modes/mode/toml").then(m => legacy(m.toml))
      }
    }),
    makeSpec({
      name: "troff",
      mime: "text/troff",
      extensions: ["1","2","3","4","5","6","7","8","9"],
      load() {
        return import("@codemirror/legacy-modes/mode/troff").then(m => legacy(m.troff))
      }
    }),
    makeSpec({
      name: "TTCN",
      mime: "text/x-ttcn",
      extensions: ["ttcn","ttcn3","ttcnpp"],
      load() {
        return import("@codemirror/legacy-modes/mode/ttcn").then(m => legacy(m.ttcn))
      }
    }),
    makeSpec({
      name: "TTCN_CFG",
      mime: "text/x-ttcn-cfg",
      extensions: ["cfg"],
      load() {
        return import("@codemirror/legacy-modes/mode/ttcn-cfg").then(m => legacy(m.ttcnCfg))
      }
    }),
    makeSpec({
      name: "Turtle",
      mime: "text/turtle",
      extensions: ["ttl"],
      load() {
        return import("@codemirror/legacy-modes/mode/turtle").then(m => legacy(m.turtle))
      }
    }),
    makeSpec({
      name: "Web IDL",
      mime: "text/x-webidl",
      extensions: ["webidl"],
      load() {
        return import("@codemirror/legacy-modes/mode/webidl").then(m => legacy(m.webIDL))
      }
    }),
    makeSpec({
      name: "VB.NET",
      mime: "text/x-vb",
      extensions: ["vb"],
      load() {
        return import("@codemirror/legacy-modes/mode/vb").then(m => legacy(m.vb))
      }
    }),
    makeSpec({
      name: "VBScript",
      mime: "text/vbscript",
      extensions: ["vbs"],
      load() {
        return import("@codemirror/legacy-modes/mode/vbscript").then(m => legacy(m.vbScript))
      }
    }),
    makeSpec({
      name: "Velocity",
      mime: "text/velocity",
      extensions: ["vtl"],
      load() {
        return import("@codemirror/legacy-modes/mode/velocity").then(m => legacy(m.velocity))
      }
    }),
    makeSpec({
      name: "Verilog",
      mime: "text/x-verilog",
      extensions: ["v"],
      load() {
        return import("@codemirror/legacy-modes/mode/verilog").then(m => legacy(m.verilog))
      }
    }),
    makeSpec({
      name: "VHDL",
      mime: "text/x-vhdl",
      extensions: ["vhd","vhdl"],
      load() {
        return import("@codemirror/legacy-modes/mode/vhdl").then(m => legacy(m.vhdl))
      }
    }),
    makeSpec({
      name: "XQuery",
      mime: "application/xquery",
      extensions: ["xy","xquery"],
      load() {
        return import("@codemirror/legacy-modes/mode/xquery").then(m => legacy(m.xQuery))
      }
    }),
    makeSpec({
      name: "Yacas",
      mime: "text/x-yacas",
      extensions: ["ys"],
      load() {
        return import("@codemirror/legacy-modes/mode/yacas").then(m => legacy(m.yacas))
      }
    }),
    makeSpec({
      name: "YAML",
      alias: ["yml"],
      mime: ["text/x-yaml", "text/yaml"],
      extensions: ["yaml","yml"],
      load() {
        return import("@codemirror/legacy-modes/mode/yaml").then(m => legacy(m.yaml))
      }
    }),
    makeSpec({
      name: "Z80",
      mime: "text/x-z80",
      extensions: ["z80"],
      load() {
        return import("@codemirror/legacy-modes/mode/z80").then(m => legacy(m.z80))
      }
    }),
    makeSpec({
      name: "mscgen",
      mime: "text/x-mscgen",
      extensions: ["mscgen","mscin","msc"],
      load() {
        return import("@codemirror/legacy-modes/mode/mscgen").then(m => legacy(m.mscgen))
      }
    }),
    makeSpec({
      name: "xu",
      mime: "text/x-xu",
      extensions: ["xu"],
      load() {
        return import("@codemirror/legacy-modes/mode/mscgen").then(m => legacy(m.xu))
      }
    }),
    makeSpec({
      name: "msgenny",
      mime: "text/x-msgenny",
      extensions: ["msgenny"],
      load() {
        return import("@codemirror/legacy-modes/mode/mscgen").then(m => legacy(m.msgenny))
      }
    })
  ];

  /**
   * Get the raw list of available modes specs.
   */
  export function getModeInfo(): ISpec[] {
    return goldorak as ISpec[];
  }

  /**
   * Find a codemirror mode by MIME.
   */
  export function findByMIME(mime: string | readonly string[]): ISpec | null {
    if (Array.isArray(mime)) {
      for (var i = 0; i < mime.length; i++) {
        const spec = findByMIME(mime[i]);
        if (spec) return spec;
      }
      return null;
    }
    mime = (mime as string).toLowerCase();
    for (var i = 0; i < goldorak.length; i++) {
      var info = goldorak[i];
      if (Array.isArray(info.mime)) {
        for (var j = 0; j < info.mime.length; j++) {
          if (info.mime[j] == mime) {
            return info;
          }
        }
      }
      else if (info.mime == mime) {
        return info;
      }
    }
    if (/\+xml$/.test(mime)) return findByMIME("application/xml")
    if (/\+json$/.test(mime)) return findByMIME("application/json")
    return null;
  }

  /**
   * Find a codemirror mode by name.
   */
  export function findByName(name: string): ISpec | null {
    name = name.toLowerCase();
    for (var i = 0; i < goldorak.length; i++) {
      var info = goldorak[i];
      if (info.name.toLowerCase() == name) return info;
      if (info.alias) {
        for (var j = 0; j < info.alias.length; j++)
        {
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
  export function findByExtension(ext: string | readonly string[]): ISpec | null {
    if (Array.isArray(ext)) {
      for (var i = 0; i < ext.length; i++) {
        const spec = findByExtension(ext[i]);
        if (spec) return spec;
      }
      return null;
    }
    ext = (ext as string).toLowerCase();
    for (var i = 0; i < goldorak.length; i++) {
      var info = goldorak[i];
      for (var j = 0; j < info.extensions!.length; j++) {
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
    for (var i = 0; i < goldorak.length; i++) {
      var info = goldorak[i];
      if (info.filename && info.filename.test(basename)) {
        return info;
      }
    }
    var dot = basename.lastIndexOf(".");
    var ext = dot > -1 && basename.substring(dot + 1, basename.length);
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

    if(await spec?.load!()) {
      return spec;
    }
    return null;
  }

  /**
   * 
   */
  export function registerModeInfo(mode: ISpec) {
    const info = findBest(mode);
    if (info) {
      throw new Error(`$"mode.mime" already registered`);
    }
    goldorak.push(makeSpec(mode));
  }
}

