// Type definitions for ansi-to-html
// Project: https://github.com/rburns/ansi-to-html

declare class Filter {
  constructor(options?: {
    fg?: string;
    bg?: string;
    newline?: boolean;
    escapeXML?: boolean;
    stream?: boolean;
  });
  toHtml(input: string): string;
}

declare module "ansi-to-html" {
    export = Filter;
}
