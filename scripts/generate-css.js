/*
 * Prints the @font-face CSS directives for the CHTML TeX font
 */
const fs = require('fs');
const TeXFont = require('mathjax3/mathjax3/output/chtml/fonts/tex');

const CssStyles = require('mathjax3/mathjax3/output/chtml/CssStyles');

class myFont extends TeXFont.TeXFont {}
myFont.defaultVariants = [];
myFont.defaultDelimiters = {};
myFont.defaultChars = {};
myFont.defaultVariantClasses = {};
myFont.defaultStyles = {};

const font = new myFont({
    fontURL: 'node_modules/mathjax3/mathjax2/css'  // Path to fonts 
});

const styles = new CssStyles.CssStyles();
styles.addStyles(font.styles);

fs.writeFileSync('style/fonts.css', styles.cssText);
