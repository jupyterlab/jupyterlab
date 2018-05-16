// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/*
 * TODO: remove this file and the excludes entry in tsconfig.json
 * after typedoc understands the lib compiler option and @types packages.
 */
/// <reference path="../node_modules/@types/text-encoding/index.d.ts"/>
/// <reference path="../node_modules/typescript/lib/lib.es2015.promise.d.ts"/>
/// <reference path="../node_modules/typescript/lib/lib.dom.d.ts"/>
/// <reference path="../node_modules/typescript/lib/lib.es5.d.ts"/>
/// <reference path="../node_modules/typescript/lib/lib.es2015.collection.d.ts"/>

// TextEncoder interfaces for typedoc, since typedoc is still using TypeScript 2.7
// Remove these when typedoc is updated to use TypeScript 2.8

interface TextDecodeOptions {
    stream?: boolean;
}

interface TextDecoderOptions {
    fatal?: boolean;
    ignoreBOM?: boolean;
}

interface TextDecoder {
    readonly encoding: string;
    readonly fatal: boolean;
    readonly ignoreBOM: boolean;
    decode(input?: Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array | DataView | ArrayBuffer | null, options?: TextDecodeOptions): string;
}

declare var TextDecoder: {
    prototype: TextDecoder;
    new(label?: string, options?: TextDecoderOptions): TextDecoder;
};

interface TextEncoder {
    readonly encoding: string;
    encode(input?: string): Uint8Array;
}

declare var TextEncoder: {
    prototype: TextEncoder;
    new(): TextEncoder;
};
