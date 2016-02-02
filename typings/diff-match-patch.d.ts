// Type definitions for Diff-match-patch
// Project: https://code.google.com/p/google-diff-match-patch/
//    as bundled by https://www.npmjs.com/package/diff-match-patch
// Definitions by: Jason Grout <https://github.com/jasongrout/>


declare module diff_match_patch {
    class diff_match_patch {
        match_main(text: string, pattern: string, loc: number): number
    }
}

declare module 'diff-match-patch' {
    export = diff_match_patch;
}
