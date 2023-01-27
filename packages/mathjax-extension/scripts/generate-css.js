/*
 * Prints the @font-face CSS directives for the CHTML TeX font
 */
const fs = require('fs');
const TeXFont = require('mathjax-full/js/output/chtml/fonts/tex');

const CssStyles = require('mathjax-full/js/output/common/CssStyles');

class myFont extends TeXFont.TeXFont {}
myFont.defaultVariants = [];
myFont.defaultDelimiters = {};
myFont.defaultChars = {};
myFont.defaultVariantClasses = {};
myFont.defaultStyles = {};

const font = new myFont({
  fontURL: '~mathjax-full/es5/output/chtml/fonts/woff-v2', // Path to fonts.
});

const styles = new CssStyles.CssStyles();
styles.addStyles(font.styles);

fs.writeFileSync('style/fonts.css', styles.cssText);
