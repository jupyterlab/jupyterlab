import { VirtualElement, h } from '@phosphor/virtualdom';

import { Menu } from '@phosphor/widgets';

const fontCandidates = [
  'Adobe Arabic',
  'Adobe Caslon Pro',
  'Adobe Devanagari',
  'Adobe Fan Heiti Std',
  'Adobe Fangsong Std',
  'Adobe Garamond Pro',
  'Adobe Gothic Std',
  'Adobe Hebrew',
  'Adobe Heiti Std',
  'Adobe Kaiti Std',
  'Adobe Ming Std',
  'Adobe Myungjo Std',
  'Adobe Naskh',
  'Adobe Song Std',
  'Al Bayan',
  'Al Nile',
  'Al Tarikh',
  'American Typewriter',
  'Andale Mono',
  'Apple Braille',
  'Apple Chancery',
  'Apple SD Gothic Neo',
  'Apple Symbols',
  'AppleGothic',
  'AppleMyungjo',
  'Arial',
  'Arial Black',
  'Arial Hebrew',
  'Arial Narrow',
  'Arial Rounded MT Bold',
  'Arial Unicode MS',
  'Athelas',
  'Avenir',
  'Avenir Next',
  'Avenir Next Condensed',
  'Ayuthaya',
  'Baghdad',
  'Bangla MN',
  'Bangla Sangam MN',
  'Baskerville',
  'Batang',
  'Beirut',
  'Big Caslon',
  'Birch Std',
  'Bitstream Vera Sans',
  'Bitstream Vera Sans Mono',
  'Bitstream Vera Serif',
  'Blackoak Std',
  'Bodoni 72',
  'Bodoni 72 Oldstyle',
  'Bodoni 72 Smallcaps',
  'Bodoni Ornaments',
  'Bookshelf Symbol 7',
  'Bradley Hand',
  'Brush Script MT',
  'Brush Script Std',
  'CALLIG15',
  'Calibri',
  'Cambria',
  'Cambria Math',
  'Candara',
  'Chalkboard',
  'Chalkboard SE',
  'Chalkduster',
  'Chaparral Pro',
  'Charlemagne Std',
  'Charter',
  'Cochin',
  'Comic Sans MS',
  'Consolas',
  'Constantia',
  'Cooper Std',
  'Copperplate',
  'Corbel',
  'Corsiva Hebrew',
  'Courier New',
  'DIN Alternate',
  'DIN Condensed',
  'Damascus',
  'DecoType Naskh',
  'DejaVu Sans',
  'DejaVu Sans Display',
  'DejaVu Sans Mono',
  'DejaVu Serif',
  'DejaVu Serif Display',
  'Devanagari MT',
  'Devanagari Sangam MN',
  'Didot',
  'Diwan Kufi',
  'Diwan Thuluth',
  'East Syriac Adiabene',
  'East Syriac Ctesiphon',
  'Estrangelo Antioch',
  'Estrangelo Edessa',
  'Estrangelo Midyat',
  'Estrangelo Nisibin',
  'Estrangelo Nisibin Outline',
  'Estrangelo Quenneshrin',
  'Estrangelo Talada',
  'Estrangelo TurAbdin',
  'Euphemia UCAS',
  'Farah',
  'Farisi',
  'Fira Code',
  'Franklin Gothic Book',
  'Franklin Gothic Medium',
  'Futura',
  'Gabriola',
  'Geeza Pro',
  'Georgia',
  'Giddyup Std',
  'Gill Sans',
  'Gill Sans MT',
  'Goha-Tibeb Zemen',
  'Gujarati MT',
  'Gujarati Sangam MN',
  'Gulim',
  'Gurmukhi MN',
  'Gurmukhi MT',
  'Gurmukhi Sangam MN',
  'Heiti TC',
  'Helvetica',
  'Helvetica Neue',
  'Herculanum',
  'Hiragino Maru Gothic Pro',
  'Hiragino Mincho ProN',
  'Hiragino Sans',
  'Hiragino Sans GB',
  'Hobo Std',
  'Hoefler Text',
  'ITF Devanagari',
  'Impact',
  'InaiMathi',
  'Inconsolata',
  'Iowan Old Style',
  'Kailasa',
  'Kannada MN',
  'Kannada Sangam MN',
  'Kefa',
  'Khmer MN',
  'Khmer Sangam MN',
  'Kohinoor Bangla',
  'Kohinoor Devanagari',
  'Kohinoor Telugu',
  'Kokonor',
  'Kozuka Gothic Pr6N',
  'Kozuka Gothic Pro',
  'Kozuka Mincho Pr6N',
  'Kozuka Mincho Pro',
  'Krungthep',
  'KufiStandardGK',
  'Lao MN',
  'Lao Sangam MN',
  'Letter Gothic Std',
  'Lithos Pro',
  'Lucida Console',
  'Lucida Grande',
  'Lucida Sans Unicode',
  'Luminari',
  'Luxi Mono',
  'Luxi Sans',
  'Luxi Serif',
  'MS Gothic',
  'MS Mincho',
  'MS PGothic',
  'MS PMincho',
  'MS Reference Sans Serif',
  'MS Reference Specialty',
  'Maitree',
  'Malayalam MN',
  'Malayalam Sangam MN',
  'Marion',
  'Marker Felt',
  'Marlett',
  'Meiryo',
  'Menlo',
  'Merriweather',
  'Mesquite Std',
  'Microsoft Himalaya',
  'Microsoft Sans Serif',
  'Microsoft Tai Le',
  'Microsoft Yi Baiti',
  'MingLiU',
  'MingLiU-ExtB',
  'MingLiU_HKSCS',
  'MingLiU_HKSCS-ExtB',
  'Minion Pro',
  'Mishafi',
  'Mishafi Gold',
  'Mongolian Baiti',
  'Mshtakan',
  'Muna',
  'Myanmar MN',
  'Myanmar Sangam MN',
  'Myriad Arabic',
  'Myriad Hebrew',
  'Myriad Pro',
  'Nadeem',
  'New Peninim MT',
  'Noteworthy',
  'Noto Nastaliq Urdu',
  'Noto Serif',
  'Nueva Std',
  'OCR A Std',
  'Optima',
  'Orator Std',
  'Oriya MN',
  'Oriya Sangam MN',
  'PMingLiU',
  'PMingLiU-ExtB',
  'PT Mono',
  'PT Sans',
  'PT Serif',
  'PT Serif Caption',
  'Palatino',
  'Palatino Linotype',
  'Papyrus',
  'Perpetua',
  'Phosphate',
  'PingFang HK',
  'Plantagenet Cherokee',
  'Poplar Std',
  'Prestige Elite Std',
  'Raanana',
  'Rockwell',
  'Rosewood Std',
  'SF Mono',
  'SF Pro Display',
  'SF Pro Text',
  'SF UI Display',
  'SF UI Text',
  'STIXGeneral',
  'STIXIntegralsD',
  'STIXIntegralsSm',
  'STIXIntegralsUp',
  'STIXIntegralsUpD',
  'STIXIntegralsUpSm',
  'STIXNonUnicode',
  'STIXSizeFiveSym',
  'STIXSizeFourSym',
  'STIXSizeOneSym',
  'STIXSizeThreeSym',
  'STIXSizeTwoSym',
  'STIXVariants',
  'Sana',
  'Sathu',
  'Savoye LET',
  'Seravek',
  'Serto Batnan',
  'Serto Jerusalem',
  'Serto Jerusalem Outline',
  'Serto Kharput',
  'Serto Malankara',
  'Serto Mardin',
  'Serto Urhoy',
  'Shree Devanagari 714',
  'SignPainter',
  'Silom',
  'SimHei',
  'SimSun',
  'SimSun-ExtB',
  'Sinhala MN',
  'Sinhala Sangam MN',
  'Skia',
  'Slabo 27px',
  'Snell Roundhand',
  'Songti SC',
  'Stencil Std',
  'Sukhumvit Set',
  'Superclarendon',
  'Suravaram',
  'Symbol',
  'System Font',
  'Tahoma',
  'Tamil MN',
  'Tamil Sangam MN',
  'Tekton Pro',
  'Telugu MN',
  'Telugu Sangam MN',
  'Thonburi',
  'Times',
  'Times New Roman',
  'Trajan Pro',
  'Trattatello',
  'Trebuchet MS',
  'Tw Cen MT',
  'Verdana',
  'Waseem',
  'Webdings',
  'Wingdings',
  'Wingdings 2',
  'Wingdings 3',
  'XITS',
  'XITS Math',
  'Zapf Dingbats',
  'Zapfino'
];

/**
 * adapted from https://stackoverflow.com/a/3368855/425458
 */
export class FontChecker {
  constructor() {
    this.h = document.getElementsByTagName('body')[0];

    // create a SPAN in the document to get the width of the text we use to test
    this.s = document.createElement('span');
    this.s.style.fontSize = FontChecker.testSize;
    this.s.innerHTML = FontChecker.testString;

    for (const index in FontChecker.baseFonts) {
      // get the default width for the three base fonts
      this.s.style.fontFamily = FontChecker.baseFonts[index];
      this.h.appendChild(this.s);

      // height and width for the default font
      this.defaultHeight[FontChecker.baseFonts[index]] = this.s.offsetHeight;
      this.defaultWidth[FontChecker.baseFonts[index]] = this.s.offsetWidth;

      this.h.removeChild(this.s);
    }
  }

  check(font: string): boolean {
    let detected = false;
    for (const index in FontChecker.baseFonts) {
      // name of the font along with the base font for fallback
      this.s.style.fontFamily = font + ',' + FontChecker.baseFonts[index];

      this.h.appendChild(this.s);
      const matched =
        this.s.offsetWidth !==
          this.defaultWidth[FontChecker.baseFonts[index]] ||
        this.s.offsetHeight !==
          this.defaultHeight[FontChecker.baseFonts[index]];
      this.h.removeChild(this.s);
      detected = detected || matched;
    }
    return detected;
  }

  h: HTMLElement;
  s: HTMLElement;
  defaultWidth: { [key: string]: number } = {};
  defaultHeight: { [key: string]: number } = {};
}

export namespace FontChecker {
  // a font will be compared against all the three default fonts.
  // And if it doesn't match all 3 then that font is not available
  export const baseFonts = ['monospace', 'sans-serif', 'serif'];

  // we use m or w because these two characters take up the maximum width.
  // And we use a LLi so that the same matching fonts can get separated
  export const testString = 'mmmmmmmmmmlli';

  // we test using 72px font size, we may use any size. I guess larger the better
  export const testSize = '72px';
}

export const getFonts = (): string[] => {
  const fontChecker = new FontChecker();

  return fontCandidates.reduce((arr, font) => {
    if (fontChecker.check(font)) {
      arr.push(font);
    }
    return arr;
  }, []);
};

export const validFonts = getFonts();

export class FontMenu extends Menu {
  constructor(options: Menu.IOptions) {
    if (!options.renderer) {
      options.renderer = new FontMenu.Renderer();
    }

    super(options);
  }
}

export namespace FontMenu {
  export class Renderer extends Menu.Renderer {
    /**
     * Render the label element for a menu item.
     *
     * @param data - The data to use for rendering the label.
     *
     * @returns A virtual element representing the item label.
     */
    renderLabel(data: Menu.IRenderData): VirtualElement {
      let content = this.formatLabel(data);
      return h.div(
        {
          className: 'p-Menu-itemLabel',
          style: { fontFamily: data.item.args['font'] as string }
        },
        content
      );
    }
  }
}
