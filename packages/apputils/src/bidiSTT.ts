/**
 * The bidi event raised when an HTML element's content is changed  
 */
var event: Event = null;
  
export
namespace bidiSTT {
  export
  /**
   * Attach a bidi event to an HTML element 
   * When bidi event is raised the relevant handler is activated to parse and display the content of the element in the relevant structure
   * Structures can be file paths, bread crumbs, e-mails, formulas etc. Currently only file paths are supported.   
   * 
   * @param element The HTML element to attach the event to
   * @param type    The handler type - The type of structured text required. 
   */  
  function attachElement(element: HTMLElement, type: string) {
    if (!element || element.nodeType != 1)
      return false;
    if (!event) {
      event = document.createEvent('Event');
      event.initEvent('TF', true, true);
    }
    element.setAttribute("data-tf-type", type);
    var dir = "ltr";
    if (element.dir) {
      dir = element.dir;
    }
    else if(element.style && element.style.direction) {
      dir = element.style.direction;
    }
    var isRtl = dir.toLowerCase() === "rtl"? 'rtl': 'ltr';
    element.setAttribute("data-tf-dir", isRtl);
    element.setAttribute("data-tf-locale", Private.misc.getLocaleDetails().lang);
    if (Private.isInputEventSupported(element)) {
      element.oninput = function(event) {
        Private.displayWithStructure(event.target as HTMLElement);
      };
    }
    else {
      element.onkeyup = function(e) {
        Private.displayWithStructure(e.target as HTMLElement);
        element.dispatchEvent(event);
      };
      element.onmouseup = function(e) {
        Private.displayWithStructure(e.target as HTMLElement);
        element.dispatchEvent(event);
      };
    } 
    Private.displayWithStructure(element);
    return true;
  }
    
  /**
   * Compare the browser's language with an array of bidi languages
   * Return true if language is bidi
   * Return false if language is non bidi
   * 
   * @param locale - The browser's language.
   */     
  export
  function isBidiLocale(locale?: string) {
    if (!locale) {
      locale = typeof navigator === "undefined" ? "" : (navigator.language || "");
    }
    var lang = !locale ? "" : locale.split("-")[0];
    if (!lang || lang.length < 2) {
      return false;
    }
    return ["iw", "he", "ar", "fa", "ur"].some(function (bidiLang) {
      return bidiLang === lang;
    });        
  }
}

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Creates a TextSegment class.
   * Represents a string or an array of fragments of a string used for parsing purposes.
   * At the initial state a TextSegment will contain an array of one element - the base string. e.g. ['c:\folderName']
   * Parsing process will result in an array of TextSgements each containing a segment of the base string.
   *  e.g. ['c', ':', '\', 'folderName']
   * Each TextSegment has helper attributes used during the parsing process:
   *    
   * content - the content of the segment. e.g. 'c:\folderName' or 'c' or '\' etc.
   * actual - the value of the base string (before broken into separate segments)
   * textDirection - direction of the content of a segment
   * localGui - required direction of the displayed string
   *   e.g. for file paths, folder and file names may be in a RTL language but should be displayed in a LTR layout.
   * isVisible - indicates whether or not this segment should be displayed. 
   *  for file path purposes, this attribute will always be true.
   * isSeparator - indicates whether or not this segment is a separator or not. 
   *  in a segment containing a '\' this attribute will be true.  
   *  in a segment containing a 'folderName' this attribute will be false.
   * isParsed - indicates whether or not this segment has already been parsed.
   * inPoints - flags a segment that has been separated by a delimiter
   */           
  export
  class TextSegment {
    content: string = "";
    actual: string = "";
    textDirection: string = "";
    localGui: string = "";
    isVisible: boolean = true;
    isSeparator: boolean = false;
    isParsed: boolean = false;  
    inPoints: boolean = false;
    constructor(obj: Object) {
      for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
          (<any>this)[key] = (<any>obj)[key];
        }
      }
    }
  }
      
  var tools = (function() {
  
    return {
      /**
       * Parses a string using a set of delimiters and returns an array of separated TextSegments
       * Example for a filePath "c:\folderA\folderB"
       * This string will be broken down to separate TextSegments using the file path delimiters / \ : .
       * Returns an array : ['c', ':', '\', 'folderA', '\', 'folderB']
       * 
       * @param segments  the string/s to be parsed 
       * @param args      a set of arguments needed to parse a string in a specific structure. e.g. direction 
       * @param points    a string or array of delimiters used to parse the string
       */        
      handlePoints: function (segments: TextSegment[], args: any, points: any[]) {
        for (var i = 0; i < points.length; i++) {
          for (var j = 0; true; j++) {
            if (j >= segments.length) {
              break;
            }
            if (segments[j].isParsed || segments[j].isSeparator) {
              continue;
            }
            var content = segments[j].content;
            var pos = content.indexOf(points[i]);
            if (pos >= 0) {
              segments.splice(j, 1);
              if (pos > 0) {
                segments.splice(j, 0, new TextSegment({
                  content: content.substring(0, pos),
                  textDirection: args.subDir,
                  localGui: args.dir,
                  inPoints: true
                }));
                j++;
              }
              segments.splice(j, 0, new TextSegment({
                content: points[i],
                localGui: args.dir,
                isSeparator: true
              }));
              if (pos + points[i].length + 1 <= content.length) {
                segments.splice(j + 1, 0, new TextSegment({
                  content: content.substring(pos + points[i].length),
                  textDirection: args.subDir,
                  localGui: args.dir,
                  inPoints: true
                }));
              }
            }
          }
        }
        for (i = 0; i < segments.length; i++) {
          if(segments[i].inPoints){
            segments[i].isParsed = true;
            segments[i].inPoints = false;
          }
        }
        return segments;
      }
    }
  })();
      
  export
  var common = (function() {
    return {
      /**
       * Handle parsing of all structured text types. Currently only file paths are supported.
       * Returns a segments array containing the parsed strings
       * For example: for a file path 'c:\folder'
       * input content = 'c:\folder'
       * returned segments: ['c', ':', '\', 'folder']
       * 
       * @param content   original string to be parsed 
       * @param segments  a TextSegment representation of the string to be parsed
       * @param args      a set of arguments needed to parse a string in a specific structure. e.g. direction
       * @param local     the browser's language
       */            
      handle: function (content: string, segments: TextSegment[], args: any, locale: string) {    
        var points = [];
        if (typeof(args.points) !== "undefined") {
          if (Array.isArray(args.points)) {
            points = args.points;
          } else if (typeof(args.points) === "string") {
            points = args.points.split("");
          }
        }
        tools.handlePoints(segments, args, points); 
        
        return segments;
      }
    };
  })();   
      
  export
  var misc = (function() {
    // bidi unicode characters      
    var LRE = "\u202A"; //LEFT-TO-RIGHT EMBEDDING     
    var RLE = "\u202B"; //RIGHT-TO-LEFT EMBEDDING     
    var PDF = "\u202C"; //POP DIRECTIONAL FORMATTING  (Ends the scope of the last LRE or RLE)
    var LRM = "\u200E"; //LEFT-TO-RIGHT MARK
    var RLM = "\u200F"; //RIGHT-TO-LEFT MARK

    return {
      LRE: LRE, 
      RLE: RLE, 
      PDF: PDF, 
      LRM: LRM, 
      RLM: RLM, 
      
      /**
       * Extract the browser's language.
       * Return the language if it belongs to the bidi languages (iw/he/ar/fa/ur). Otherwise, return 'not-bidi'
       */           
      getLocaleDetails: function () {
        var locale = typeof navigator === "undefined" ? "" : (navigator.language || "");
        locale = locale.toLowerCase();
        if (bidiSTT.isBidiLocale(locale)) {
          var full = locale.split("-");
          return {lang: full[0], country: full[1] ? full[1] : ""};
        }
        return {lang: "not-bidi"};
      },
          
      /**
       * Finds the first strong (directional) character.
       * If it is Latin, return LTR. If it is bidi, return RTL. Otherwise, return LTR as default.
       * 
       * For future work. This function is used when app supports bidi preferences and direction is set to auto -
       * (LTR when string starts with a LTR character and RTL when strings starts with RTL character).
       *   
       * @param text    the text to be examined
       * @param dir     text direction
       * @param guiDir  GUI direction
       * @returns text direction. RTL or LTR.
       */           
      getDirection: function (text: string, dir: string, guiDir: string) {
        if (dir !== "auto" && (/^(rtl|ltr)$/i).test(dir)) {
          return dir;
        }
        guiDir = (/^(rtl|ltr)$/i).test(guiDir) ? guiDir : "ltr";
        // look for strong (directional) characters
        var fdc = /[A-Za-z\u05d0-\u065f\u066a-\u06ef\u06fa-\u07ff\ufb1d-\ufdff\ufe70-\ufefc]/.exec(text);
        // if found, return the direction that is defined by the character, else return LTR as default.
        return fdc ? (fdc[0] <= "z" ? "ltr" : "rtl") : guiDir;
      }
    };
  })();        
      
  export
  var stext = (function() {
    /**
     * Populate arguments array with default values (dir, guidir, points) if values have not been initialized.
     * Arguments array contain a set of arguments needed to parse a string in a specific structure:
     *  guidir - GUI direction. Default value is LTR 
     *  dir -    The direction of the structured text. Default value is GUI direction. 
     *            For example: for file paths direction should be LTR regardless of GUI direction which can be LTR or RTL.
     *  points - array of delimiters. Used to separate the string into segments for parsing purposes based on direction
     *            For example: for file paths, delimiters include / \ : and .
     * 
     * @param fArgs     structure specific arguments array 
     * @param fullCheck false when check should be done on basic argument only (like direction)
     *                  true when check should be done on all arguments (including structure specific arguments like points)
     * @returns initiated arguments array 
     */         
    function checkArguments(fArgs: {}, fullCheck: boolean) {
      var args = Array.isArray(fArgs)? fArgs[0] : fArgs;
      if (!args.guiDir) {
        args.guiDir = "ltr";
      }
      if (!args.dir) {
        args.dir = args.guiDir;
      }
      if (!fullCheck) {
        return args;
      }
      if (typeof(args.points) === "undefined") {
        args.points = [];
      }
      args.commonHandler = Private.common;
      return args;
    }
    
    /**
     * Wraps text with UCC (Unicode control characters) according to text direction
     * Used when text directionality cannot be achieved using HTML.
     * @param segments   the text segments to be wrapped
     * @param args       a set of arguments needed to parse a string in a specific structure. e.g. direction 
     * @returns the formated text to be displayed.
     */     
    function getResultWithUcc(segments: TextSegment[], args: any) {
      var result = "";
      var prevDir = "";
      var stop = false;
      for (var i = 0; i < segments.length; i++) {
        if (segments[i].isVisible) {
          var dir = segments[i].textDirection;
          var lDir = segments[i].localGui;
          if (lDir !== "" && prevDir === "") {
            result += (lDir === "rtl" ? Private.misc.RLE : Private.misc.LRE);
          }
          else if(prevDir !== "" && (lDir === "" || lDir !== prevDir || stop)) {
            result += Private.misc.PDF + (i == segments.length - 1 && lDir !== ""? "" : args.dir === "rtl" ? Private.misc.RLM : Private.misc.LRM);
            if (lDir !== "") {
              result += (lDir === "rtl" ? Private.misc.RLE : Private.misc.LRE);
            }
          }
          if (dir === "auto") {
            dir = Private.misc.getDirection(segments[i].content, dir, args.guiDir);
          }
          if ((/^(rtl|ltr)$/i).test(dir)) {
            result += (dir === "rtl" ? Private.misc.RLE : Private.misc.LRE) + segments[i].content + Private.misc.PDF;
          }
          else {
            result += segments[i].content;
          }
          if (i < segments.length - 1) {
            var locDir = lDir && segments[i+1].localGui? lDir : args.dir;
            result += locDir === "rtl" ? Private.misc.RLM : Private.misc.LRM;
          }
          else if(prevDir !== "") {
            result += Private.misc.PDF;
          }
          prevDir = lDir;
          stop = false;
        }
        else {
          stop = true;
        }
      }
      var sttDir = args.dir === "auto" ? Private.misc.getDirection(segments[0].actual, args.dir, args.guiDir) : args.dir;
      if (sttDir !== args.guiDir) {
        result = (sttDir === "rtl" ? Private.misc.RLE : Private.misc.LRE) + result + Private.misc.PDF;
      }
      return result;
    }
    
    /**
     * Wraps text with HTML directional elements according to text direction
     * 
     * @param segments   the text segments to be wrapped
     * @param args       a set of arguments needed to parse a string in a specific structure. e.g. direction 
     * @returns the formated HTML string to be displayed.
     */         
    function getResultWithHtml(segments: TextSegment[], args: any) {
      var result = "";
      var prevDir = "";
      var stop = false;
      for (var i = 0; i < segments.length; i++) {
        if (segments[i].isVisible) {
          var dir = segments[i].textDirection;
          var lDir = segments[i].localGui;
          if (lDir !== "" && prevDir === "") {
            result += "<bdi dir='" + (lDir === "rtl" ? "rtl" : "ltr") + "'>";
          }
          else if(prevDir !== "" && (lDir === "" || lDir !== prevDir || stop)) {
            result += "</bdi>" + (i == segments.length - 1 && lDir !== ""? "" : "<span style='unicode-bidi: embed; direction: " + (args.dir === "rtl" ? "rtl" : "ltr") + ";'></span>");
            if (lDir !== "") {
              result += "<bdi dir='" + (lDir === "rtl" ? "rtl" : "ltr") + "'>";
            }
          }
          
          if (dir === "auto") {
            dir = Private.misc.getDirection(segments[i].content, dir, args.guiDir);
          }
          if ((/^(rtl|ltr)$/i).test(dir)) {
            result += "<bdi dir='" + (dir === "rtl" ? "rtl" : "ltr") + "'>" + segments[i].content + "</bdi>";
          }
          else {
            result += segments[i].content.replace(/&/g, "&amp;");
          }
          if (i < segments.length - 1) {
            var locDir = lDir && segments[i+1].localGui? lDir : args.dir;
            result += "<span style='unicode-bidi: embed; direction: " + (locDir === "rtl" ? "rtl" : "ltr") + ";'></span>";
          }
          else if(prevDir !== "") {
            result += "</bdi>";
          }
          prevDir = lDir;
          stop = false;
        }
        else {
          stop = true;
        }
      }
      
      var sttDir = args.dir === "auto" ? Private.misc.getDirection(segments[0].actual, args.dir, args.guiDir) : args.dir;
      if (sttDir !== args.guiDir) {
        result = "<bdi dir='" + (sttDir === "rtl" ? "rtl" : "ltr") + "'>" + result + "</bdi>";
      }
      return result;
    }
    
    return {
      /**
       * Gets a string and returns the parsed string to display 
       * 
       * @param content   the string to parse
       * @param fArgs     a set of arguments needed to parse a string in a specific structure. e.g. direction  
       * @param isHtml    true if the text structure should be displayed using HTML
       *                  false if the text structure should be displayed using unicode
       * @param locale    the browser's language                   
       */      
      parseAndDisplayStructure: function (content: string, fArgs: {}, isHtml: boolean, locale: string) {
        if (!content || !fArgs) {
          return content;
        }
        return Private.stext.displayStructure(Private.stext.parseStructure(content, fArgs, locale), fArgs, isHtml);
      },
      
      /**
       * Gets a string, converts it to a TextSegment and sends it to be parsed by the relevant handler.
       * Example for a filePath "c:\folderA\folderB"
       * This string will be broken down to separate TextSegments using the file path delimiters / \ : .
       * Returns an array : ['c', ':', '\', 'folderA', '\', 'folderB']
       * 
       * @param content the string/s to be parsed 
       * @param args    a set of arguments needed to parse a string in a specific structure. e.g. direction 
       * @param local   the browser's language
       */              
      parseStructure: function (content: string, fArgs: {}, locale: string) {
        if (!content || !fArgs) {
          return [new TextSegment({content: ""})];
        }
        
        var args = <any>{};
        args = checkArguments(fArgs, true);
        var segments: TextSegment[] = [new TextSegment({
          content: content,
          actual: content,
          localGui: args.dir
        })];
        
        var parse = Private.common.handle;
        if (args.handler && typeof(args.handler) === "function") {
          parse = args.handler.handle;
        }
        parse(content, segments, args, locale);
        return segments;
      },
      
      /**
       * Gets an array of parsed segments ['c', ':', '\', 'folderA', '\', 'folderB']
       * and calls the rendering functions.
       * Direction can be achieved using HTML bidi elements or by enforcing direction with bidi unicode characters.
       * 
       * @param segments  the text segments to be parsed
       * @param fArgs     a set of the structure specific arguments needed to parse a string in the specific structure. e.g. direction 
       * @param isHtml    true if the text structure should be displayed using HTML
       *                  false if the text structure should be displayed using unicode
       */
      displayStructure: function(segments: TextSegment[], fArgs: {}, isHtml:boolean) {
        var args = checkArguments(fArgs, false);
        if (isHtml) {
          return getResultWithHtml(segments, args);
        }
        else {
          return getResultWithUcc(segments, args);
        }
      }
    }
  })();  
  
  export
  /**
   * format the given text in a file path structure
   * 
   * @param text
   * @param isRtl 
   * @param isHtml    true if the text structure should be displayed using HTML
   *                  false if the text structure should be displayed using unicode
   * @param locale    the browser's language 
   * @param parseOnly                    
   */                
  var filePath = (function() {
    return {
      format: function (text: string, isRtl: boolean, isHtml: boolean, locale: string, parseOnly: boolean) {
        var fArgs = {
          guiDir: isRtl ? "rtl" : "ltr",
          dir:"ltr",
          points: "/\\:."
        };   
        
        if (!parseOnly) {
          return stext.parseAndDisplayStructure(text, fArgs, !!isHtml, locale);
        }
        else {
          return text;
        }
      }
    }
  })();
      
  export
  /**
   * Check if oninput event is supported in the HTML element
   *  
   * @param   element The HTML element to attach the event to
   * @returns true if event is supported. false if the event is not supported.
   */  
  function isInputEventSupported(element: HTMLElement) {
    var agent = window.navigator.userAgent;
    if (agent.indexOf("MSIE") >=0 || agent.indexOf("Trident") >=0 || agent.indexOf("Edge") >=0)
      return false;
    var checked = document.createElement(element.tagName);
    checked.contentEditable = 'true';
    var isSupported = ("oninput" in checked);
    if (!isSupported) {
      checked.setAttribute('oninput', 'return;');
      isSupported = typeof checked['oninput'] == 'function';
    }
    checked = null;
    return isSupported;
  }
      
  export
  /**
   * Display the structured text in the given HTML element
   * 
   * This function is called for each user's input into the attached editable HTML element
   * It controls correct display of the structured text in the element, a content which is changed dynamically.
   * Attributes needed to display the structure, are added previously as custom attributes of
   * the element (see function attachElement()) . The main attribute is 'type' ("data-tf-type"), which represents
   * one of predefined types of text structures (currently only file paths are supported). Some types of text structure
   * additionally require flow direction (e.g. direction, in which separate segments of the text
   * are displayed) and locale(e.g. language of the text). 
   *  
   * @param element The HTML element that displays the text
   */    
  function displayWithStructure(element: HTMLElement) {
    var txt = element.textContent || "";
    if (txt.length == 0) {
      element.dispatchEvent(event);
      return;
    }
    var selection = document.getSelection();
    var range = selection.getRangeAt(0);
    var tempRange = range.cloneRange(), startNode, startOffset;
    startNode = range.startContainer;
    startOffset = range.startOffset;
    var textOffset = 0;
    if (startNode.nodeType === 3) {
      textOffset += startOffset;
    }
    tempRange.setStart(element,0);
    tempRange.setEndBefore(startNode);
    var div = document.createElement('div');
    div.appendChild(tempRange.cloneContents());
    textOffset += div.textContent.length;
    
    element.innerHTML = getHandler(element.getAttribute("data-tf-type")).
    format(txt, (element.getAttribute("data-tf-dir") === "rtl"? true : false), true, element.getAttribute("data-tf-locale"), false);
    
    var parent = element;
    var node = element;
    var newOffset = 0;
    var inEnd = false;
    selection.removeAllRanges();
    range.setStart(element,0);
    range.setEnd(element,0);
    while (node) {
      if (node.nodeType === 3) {
        if (newOffset + node.nodeValue.length >= textOffset) {
          range.setStart(node, textOffset - newOffset);
          break;
        } 
        else {
          newOffset += node.nodeValue.length;
          node = node.nextSibling as HTMLElement;
        }
      }
      else if(node.hasChildNodes()) {
        parent = node;
        node = parent.firstChild as HTMLElement;
        continue;
      }
      else
        node = node.nextSibling as HTMLElement;
      while (!node) {
        if (parent === element) {
          inEnd = true;
          break;
        }
        node = parent.nextSibling as HTMLElement;
        parent = parent.parentNode as HTMLElement;
      }
      if (inEnd)
        break;
    }
    
    selection.addRange(range);
    element.dispatchEvent(event);
  }
      
  export
  /**
   * Gets the handler type and activates the relevant handler function
   *  
   * @param type  The handler type - The type of structured text required.
   */  
  function getHandler(type: string) {
    switch (type) {
    case 'filepath' :
      return Private.filePath;  
      // other structures (bread crumbs, urls, formulas etc) to be added as work progresses 
    }
  }    
}