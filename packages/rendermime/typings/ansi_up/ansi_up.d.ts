// Type definitions for ansi-to-html v.0.4.1
// Project: https://github.com/rburns/ansi-to-html
// Definitions by: Steven Silvester <https://github.com/blink1073>


declare module "ansi_up" {
    export
    function escape_for_html(txt: string): string;

    export
    function linkify(txt: string): string;

    export
    function ansi_to_html(txt: string, options?: any): string;

    export
    function ansi_to_text(txt: string): string;
}

