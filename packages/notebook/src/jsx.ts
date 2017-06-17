import {
    ElementAttrs, VirtualElement
} from '@phosphor/virtualdom';



/**
 * Define global element types to JSX namespace.
 */
declare global {
  namespace JSX {
    interface IntrinsicElements {
      a: ElementAttrs;
      abbr: ElementAttrs;
      address: ElementAttrs;
      area: ElementAttrs;
      article: ElementAttrs;
      aside: ElementAttrs;
      audio: ElementAttrs;
      b: ElementAttrs;
      bdi: ElementAttrs;
      bdo: ElementAttrs;
      blockquote: ElementAttrs;
      br: ElementAttrs;
      button: ElementAttrs;
      canvas: ElementAttrs;
      caption: ElementAttrs;
      cite: ElementAttrs;
      code: ElementAttrs;
      col: ElementAttrs;
      colgroup: ElementAttrs;
      data: ElementAttrs;
      datalist: ElementAttrs;
      dd: ElementAttrs;
      del: ElementAttrs;
      dfn: ElementAttrs;
      div: ElementAttrs;
      dl: ElementAttrs;
      dt: ElementAttrs;
      em: ElementAttrs;
      embed: ElementAttrs;
      fieldset: ElementAttrs;
      figcaption: ElementAttrs;
      figure: ElementAttrs;
      footer: ElementAttrs;
      form: ElementAttrs;
      h1: ElementAttrs;
      h2: ElementAttrs;
      h3: ElementAttrs;
      h4: ElementAttrs;
      h5: ElementAttrs;
      h6: ElementAttrs;
      header: ElementAttrs;
      hr: ElementAttrs;
      i: ElementAttrs;
      iframe: ElementAttrs;
      img: ElementAttrs;
      input: ElementAttrs;
      ins: ElementAttrs;
      kbd: ElementAttrs;
      label: ElementAttrs;
      legend: ElementAttrs;
      li: ElementAttrs;
      main: ElementAttrs;
      map: ElementAttrs;
      mark: ElementAttrs;
      meter: ElementAttrs;
      nav: ElementAttrs;
      noscript: ElementAttrs;
      object: ElementAttrs;
      ol: ElementAttrs;
      optgroup: ElementAttrs;
      option: ElementAttrs;
      output: ElementAttrs;
      p: ElementAttrs;
      param: ElementAttrs;
      pre: ElementAttrs;
      progress: ElementAttrs;
      q: ElementAttrs;
      rp: ElementAttrs;
      rt: ElementAttrs;
      ruby: ElementAttrs;
      s: ElementAttrs;
      samp: ElementAttrs;
      section: ElementAttrs;
      select: ElementAttrs;
      small: ElementAttrs;
      source: ElementAttrs;
      span: ElementAttrs;
      strong: ElementAttrs;
      sub: ElementAttrs;
      summary: ElementAttrs;
      sup: ElementAttrs;
      table: ElementAttrs;
      tbody: ElementAttrs;
      td: ElementAttrs;
      textarea: ElementAttrs;
      tfoot: ElementAttrs;
      th: ElementAttrs;
      thead: ElementAttrs;
      time: ElementAttrs;
      title: ElementAttrs;
      tr: ElementAttrs;
      track: ElementAttrs;
      u: ElementAttrs;
      ul: ElementAttrs;
      var_: ElementAttrs;
      video: ElementAttrs;
      wbr: ElementAttrs;
    }
    interface Element extends VirtualElement { }
  }
}