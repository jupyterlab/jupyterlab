// Type definitions for ansi-to-html v.0.4.1
// Project: https://github.com/rburns/ansi-to-html
// Definitions by: Steven Silvester <https://github.com/blink1073>


interface IConvertOptions {
    fg?: string;
    bg?: string;
    newline?: boolean;
    escapeXML?: boolean;
    stream?: boolean;
}

declare class Convert {
  constructor(options?: IConvertOptions);
  toHtml(data: string): string;
}


interface ConvertConstructor {
  new (options?: IConvertOptions): Convert;
  (options?: IConvertOptions): Convert;
}


declare module "ansi-to-html" {
  export = convert;
}

declare var convert: ConvertConstructor;
