// Extracted from https://github.com/DefinitelyTyped/DefinitelyTyped/blob/1ad10bb0dd35f98e27d4d848bfe3d5dfc919e9f0/node/node.d.ts
// Type definitions for Node.js v6.x
// Project: http://nodejs.org/
// Definitions by: Microsoft TypeScript <http://typescriptlang.org>, DefinitelyTyped <https://github.com/DefinitelyTyped/DefinitelyTyped>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare module "url" {
    export interface Url {
        href?: string;
        protocol?: string;
        auth?: string;
        hostname?: string;
        port?: string;
        host?: string;
        pathname?: string;
        search?: string;
        query?: string | any;
        slashes?: boolean;
        hash?: string;
        path?: string;
    }

    export function parse(urlStr: string, parseQueryString?: boolean, slashesDenoteHost?: boolean): Url;
    export function format(url: Url): string;
    export function resolve(from: string, to: string): string;
}