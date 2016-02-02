// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

declare type Transformer = (mimetype: string, 
                           data: string, 
                           document: HTMLDocument) => HTMLElement;


declare module 'transformime' {
    export interface TransformResult {
        mimetype: string
        el: HTMLElement;
    }
    export class Transformime {
        constructor(transformers: Transformer[])
        transform(bundle: any, document: HTMLDocument): Promise<TransformResult>
    }
    export var TextTransformer: Transformer
    export var ImageTransformer: Transformer
    export var HTMLTransformer: Transformer
}

declare module 'transformime-jupyter-transformers' {
    export var consoleTextTransform: Transformer;
    export var markdownTransform: Transformer;
    export var LaTeXTransform: Transformer;
    export var PDFTransform: Transformer;
    export var SVGTransform: Transformer;
    export var ScriptTransform: Transformer; 
}
