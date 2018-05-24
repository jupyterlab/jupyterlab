// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/// <reference path="../../codemirror/typings/codemirror/codemirror.d.ts"/>
/// <reference path="../../coreutils/typings/path-posix/path-posix.d.ts"/>
/// <reference path="../../coreutils/typings/url-parse/url-parse.d.ts"/>
/// <reference path="../../terminal/src/xterm.d.ts"/>
/// <reference path="../../vdom-extension/src/transform-vdom.d.ts"/>
/// <reference path="../../vega3-extension/src/json.d.ts"/>

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
