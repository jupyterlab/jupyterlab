// declare default class SystemFonts {
//   constructor(options?: any);
//
//   getFonts(): Promise<string[]>;
//
//   getFontsSync(): string[];
// }

declare module 'system-font-families' {
  export default class SystemFonts {
    constructor(options?: any);

    getFonts(): Promise<string[]>;

    getFontsSync(): string[];
  }
}

// declare module 'system-font-families' {
//   export interface ISystemFonts {
//     getFonts(): Promise<string[]>;
//
//     getFontsSync(): string[];
//   }
//
//   export function SystemFonts(options?: any): ISystemFonts
// }
