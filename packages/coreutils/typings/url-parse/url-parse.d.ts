// Type definitions for url-parse v1.1.8
// Project: https://github.com/unshiftio/url-parse
// Definitions by: Steven Silvester <https://github.com/blink1073>

// We use the hack mentioned in https://github.com/Microsoft/TypeScript/issues/5073
// to enable `import * as urlparse from 'url-parse';`

declare module 'url-parse' {
  interface IURL {
    protocol: string;
    slashes: boolean;
    auth: string;
    username: string;
    password: string;
    host: string;
    hostname: string;
    port: string;
    pathname: string;
    query: any;
    hash: string;
    href: string;
    origin: string;
  }
  function parse(url: string, parseQuery?: boolean): IURL;
  namespace parse { }
  export = parse;
}
