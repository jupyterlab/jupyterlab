export
namespace bidiSTT {
    
    var event: Event = null;
    
    export
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
    
    //return true if browser is running a bidi language. 
    //return false is browser is running any language other than bidi
    export
    function isBidiLocale () {
        if (Private.misc.getLocaleDetails().lang === 'not-bidi') {
            return false;
        }
        return true;
    }

    
    /**
     * A namespace for private data.
     */
    namespace Private {
        
        export
        class TextSegment {
            content: string = "";
            actual: string = "";
            textDirection: string = "";
            localGui: string = "";
            isVisible: boolean = true;
            isSeparator: boolean = false;
            isParsed: boolean = false;
            keep: boolean = false;
            inBounds: boolean = false;
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
            function initBounds(bounds: any) {
                if (!bounds) {
                    return false;
                }
                if (typeof(bounds.start) === "undefined") {
                    bounds.start = "";
                }
                if (typeof(bounds.end) === "undefined") {
                    bounds.end = "";
                }
                if (typeof(bounds.startAfter) !== "undefined") {
                    bounds.start = bounds.startAfter;
                    bounds.after = true;
                } else {
                    bounds.after = false;
                }
                if (typeof(bounds.endBefore) !== "undefined") {
                    bounds.end = bounds.endBefore;
                    bounds.before = true;
                } else {
                    bounds.before = false;
                }
                var startPos = parseInt(bounds.startPos, 10);
                if (!isNaN(startPos)) {
                    bounds.usePos = true;
                } else {
                    bounds.usePos = false;
                }
                var bLength = parseInt(bounds.length, 10);
                if (!isNaN(bLength)) {
                    bounds.useLength = true;
                } else {
                    bounds.useLength = false;
                }
                bounds.loops = typeof(bounds.loops) !== "undefined" ? !!bounds.loops : true;
                return true;
            }
    
            function getBounds(segment: TextSegment, src: any[]) {
                var bounds = {} as any;
                for (var prop in src) {
                    if (src.hasOwnProperty(prop)) {
                        bounds[prop] = src[prop];
                    }
                }
                var content = segment.content;
                var usePos = bounds.usePos && bounds.startPos < content.length;
                if (usePos) {
                    bounds.start = "";
                    bounds.loops = false;
                }
                bounds.bStart = usePos ? bounds.startPos : bounds.start.length > 0 ? content.indexOf(bounds.start) : 0;
                var useLength = bounds.useLength && bounds.length > 0 && bounds.bStart + bounds.length < content.length;
                if (useLength) {
                    bounds.end = "";
                }
                if (bounds.end.length > 0 && content.indexOf(bounds.end, bounds.bStart + bounds.start.length) < 0)
                    bounds.bEnd = -1;
                else
                    bounds.bEnd = useLength ? bounds.bStart + bounds.length : bounds.end.length > 0 ?                   
                        content.indexOf(bounds.end, bounds.bStart + bounds.start.length) + 1 : content.length;
                        
                if (!bounds.after) {
                    bounds.start = "";
                }
                if (!bounds.before) {
                    bounds.end = "";
                }
                return bounds;
            }
    
            return {
                handleSubcontents: function (segments: TextSegment[], args: any, subs: any, origContent: string, locale: string) {
                    if (!subs.content || typeof(subs.content) !== "string" || subs.content.length === 0) {
                        return segments;
                    }
                    var sLoops = true;
                    if (typeof(subs.loops) !== "undefined") {
                        sLoops = !!subs.loops;
                    }
                    for (var j = 0; true; j++) {
                        if (j >= segments.length) {
                            break;
                        }
                        if (segments[j].isParsed || segments[j].keep || segments[j].isSeparator) {
                            continue;
                        }
                        var content = segments[j].content;
                        var start = content.indexOf(subs.content);
                        if (start < 0) {
                            continue;
                        }
                        var end;
                        var length = 0;
                        if (subs.continued) {
                            do {
                                length++;
                                end = content.indexOf(subs.content, start + length * subs.content.length);
                            } while (end === 0);
                        } else {
                            length = 1;
                        }
                        end = start + length * subs.content.length;
                        segments.splice(j, 1);
                        if (start > 0) {
                            segments.splice(j, 0, new TextSegment({
                                content: content.substring(0, start),
                                localGui: args.dir,
                                keep: true
                            }));
                            j++;
                        }
                        segments.splice(j, 0, new TextSegment({
                            content: content.substring(start, end),
                            textDirection: subs.subDir,
                            localGui: args.dir
                        }));
                        if (end < content.length) {
                            segments.splice(j + 1, 0, new TextSegment({
                                content: content.substring(end, content.length),
                                localGui: args.dir,
                                keep: true
                            }));
                        }
                        if (!sLoops) {
                            break;
                        }
                    }
                },

                handleBounds: function (segments: TextSegment[], args: any, aBounds: any[], origContent: string, locale: string) {
                    for (var i = 0; i < aBounds.length; i++) {
                        if (!initBounds(aBounds[i])) {
                            continue;
                        }
                        for (var j = 0; true; j++) {
                            if (j >= segments.length) {
                                break;
                            }
                            if (segments[j].isParsed || segments[j].inBounds || segments[j].keep || segments[j].isSeparator) {
                                continue;
                            }
                            var bounds = getBounds(segments[j], aBounds[i]);
                            var start = bounds.bStart;
                            var end = bounds.bEnd;
                            if (start < 0 || end < 0) {
                                continue;
                            }
                            var content = segments[j].content;
                            
                            segments.splice(j, 1);
                            if (start > 0) {
                                segments.splice(j, 0, new TextSegment({
                                    content: content.substring(0, start),
                                    localGui: args.dir,
                                    keep: true
                                }));
                                j++;
                            }
                            if (bounds.start) {
                                segments.splice(j, 0, new TextSegment({
                                    content: bounds.start,
                                    localGui: args.dir,
                                    isSeparator: true
                                }));
                                j++;
                            }
                            segments.splice(j, 0, new TextSegment({
                                content: content.substring(start + bounds.start.length, end - bounds.end.length),
                                textDirection: bounds.subDir,
                                localGui: args.dir,
                                inBounds: true
                            }));
                            if (bounds.end) {
                                j++;
                                segments.splice(j, 0, new TextSegment({
                                    content: bounds.end,
                                    localGui: args.dir,
                                    isSeparator: true
                                }));
                            }
                            if (end < content.length) {
                                segments.splice(j + 1, 0, new TextSegment({
                                    content: content.substring(end, content.length),
                                    localGui: args.dir,
                                    keep: true
                                }));
                            }
                            if (!bounds.loops) {
                                break;
                            }
                        }
                    }
                    for (i = 0; i < segments.length; i++) {
                        segments[i].inBounds = false;
                    }
                    return segments;
                },
    
                handleCases: function (segments: TextSegment[], args: any, cases: any[], origContent: string, locale: string) {
                    if (cases.length === 0) {
                        return segments;
                    }
                    var hArgs = {} as any;
                    for (var prop in args) {
                        hArgs[prop] = args[prop];
                    }
                    for (var i =  0; i < cases.length; i++) {
                        if (!cases[i].handler || typeof(cases[i].handler.handle) !== "function") {
                            cases[i].handler = args.commonHandler;
                        }
                        if (cases[i].args) {
                            hArgs.cases = cases[i].args.cases;
                            hArgs.points = cases[i].args.points;
                            hArgs.bounds = cases[i].args.bounds;
                            hArgs.subs = cases[i].args.subs;
                        } else {
                            hArgs.cases = [];
                            hArgs.points = [];
                            hArgs.bounds = [];
                            hArgs.subs = {};
                        }
                        cases[i].handler.handle(origContent, segments, hArgs, locale);
                    }
                    return segments;
                },
    
                handlePoints: function (segments: TextSegment[], args: any, points: any[], origContent: string, locale: string) {
                    for (var i = 0; i < points.length; i++) {
                        for (var j = 0; true; j++) {
                            if (j >= segments.length) {
                                break;
                            }
                            if (segments[j].isParsed || segments[j].keep || segments[j].isSeparator) {
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
                        if (segments[i].keep) {
                            segments[i].keep = false;
                        } else if(segments[i].inPoints){
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
                handle: function (content: string, segments: TextSegment[], args: any, locale: string) {    
                    var cases = [];
                    if (Array.isArray(args.cases)) {
                        cases = args.cases;
                    }
                    var points = [];
                    if (typeof(args.points) !== "undefined") {
                        if (Array.isArray(args.points)) {
                            points = args.points;
                        } else if (typeof(args.points) === "string") {
                            points = args.points.split("");
                        }
                    }
                    var subs = {};
                    if (typeof(args.subs) === "object") {
                        subs = args.subs;
                    }
                    var aBounds = [];
                    if (Array.isArray(args.bounds)) {
                        aBounds = args.bounds;
                    }
        
                    tools.handleBounds(segments, args, aBounds, content, locale);
                    tools.handleSubcontents(segments, args, subs, content, locale);
                    tools.handleCases(segments, args, cases, content, locale);
                    tools.handlePoints(segments, args, points, content, locale); 
                    
                    return segments;
                }
            };
        })();   
        
        export
        var misc = (function() {
            
            function isBidiLocale(locale: string) {
                var lang = !locale ? "" : locale.split("-")[0];
                if (!lang || lang.length < 2) {
                    return false;
                }
                return ["iw", "he", "ar", "fa", "ur"].some(function (bidiLang) {
                    return bidiLang === lang;
                });        
            }
            
            var LRE = "\u202A";
            var RLE = "\u202B";
            var PDF = "\u202C";
            var LRM = "\u200E";
            var RLM = "\u200F";
            var LRO = "\u202D";
            var RLO = "\u202E";

            return {
                LRE: LRE,
                RLE: RLE,
                PDF: PDF,
                LRM: LRM,
                RLM: RLM,
                LRO: LRO,
                RLO: RLO,
                
                // get the local (language) of the browser
                getLocaleDetails: function () {
                    var locale = typeof navigator === "undefined" ? "" : (navigator.language || "");
                    locale = locale.toLowerCase();
                    if (isBidiLocale(locale)) {
                        var full = locale.split("-");
                        return {lang: full[0], country: full[1] ? full[1] : ""};
                    }
                    return {lang: "not-bidi"};
                },
            
                removeUcc: function (text: string) {
                    if (text) {
                        return text.replace(/[\u200E\u200F\u202A-\u202E]/g, "");
                    }
                    return text;
                },
        
                removeTags: function (text: string) {
                    if (text) {
                        return text.replace(/<[^<]*>/g, "");
                    }
                    return text;
                },

                getDirection: function (text: string, dir: string, guiDir: string, checkEnd?: boolean) {
                        if (dir !== "auto" && (/^(rtl|ltr)$/i).test(dir)) {
                            return dir;
                        }
                        guiDir = (/^(rtl|ltr)$/i).test(guiDir) ? guiDir : "ltr";
                        var txt = !checkEnd ? text : text.split("").reverse().join("");
                        var fdc = /[A-Za-z\u05d0-\u065f\u066a-\u06ef\u06fa-\u07ff\ufb1d-\ufdff\ufe70-\ufefc]/.exec(txt);
                        return fdc ? (fdc[0] <= "z" ? "ltr" : "rtl") : guiDir;
                },
        
                hasArabicChar: function (text: string) {
                    var fdc = /[\u0600-\u065f\u066a-\u06ef\u06fa-\u07ff\ufb1d-\ufdff\ufe70-\ufefc]/.exec(text);
                    return !!fdc;
                },
        
                showMarks: function (text: string, guiDir: string) {
                    var result = "";
                    for (var i = 0; i < text.length; i++) {
                        var c = "" + text.charAt(i);
                        switch (c) {
                        case LRM:
                            result += "<LRM>";
                            break;
                        case RLM:
                            result += "<RLM>";
                            break;
                        case LRE:
                            result += "<LRE>";
                            break;
                        case RLE:
                            result += "<RLE>";
                            break;
                        case LRO:
                            result += "<LRO>";
                            break;
                        case RLO:
                            result += "<RLO>";
                            break;
                        case PDF:
                            result += "<PDF>";
                            break;
                        default:
                            result += c;
                        }
                    }
                    var mark = typeof(guiDir) === "undefined" || !((/^(rtl|ltr)$/i).test(guiDir)) ? "" :
                            guiDir === "rtl" ? RLO : LRO;
                    return mark + result + (mark === "" ? "" : PDF);
                },

                hideMarks: function (text: string) {
                    var txt = text.replace(/<LRM>/g, this.LRM).replace(/<RLM>/g, this.RLM).replace(/<LRE>/g, this.LRE);
                    return txt.replace(/<RLE>/g, this.RLE).replace(/<LRO>/g, this.LRO).replace(/<RLO>/g, this.RLO).replace(/<PDF>/g, this.PDF);
                },
                    
                showTags: function (text: string) {
                    return "<xmp>" + text + "</xmp>";
                },
                    
                hideTags: function (text: string) {
                    return text.replace(/<xmp>/g,"").replace(/<\/xmp>/g,"");
                }
            };
        })();        
        
        export
        var stext = (function() {
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
                if (!args.cases) {
                    args.cases = [];
                }
                if (!args.bounds) {
                    args.bounds = [];
                }
                args.commonHandler = Private.common;
                return args;
            }

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
                parseAndDisplayStructure: function (content: string, fArgs: {}, isHtml: boolean, locale: string) {
                  if (!content || !fArgs) {
                    return content;
                  }
                  return Private.stext.displayStructure(Private.stext.parseStructure(content, fArgs, locale), fArgs, isHtml);
                },
        
                parseStructure: function (content: string, fArgs: {}, locale: string) {
                  if (!content || !fArgs) {
                      return [new TextSegment({content: ""})];
                  }
                  
                  var args = <any>{};
                  args = checkArguments(fArgs, true);
                  var segments: TextSegment[] = [new TextSegment(
                    {
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
        //format the given text in a file path structure
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
            format(txt, (element.getAttribute("data-tf-dir") === "true"? true : false), true, element.getAttribute("data-tf-locale"), undefined);            
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
        function getHandler(type: string) {
            switch (type) {
                case 'filepath' :
                    return Private.filePath;  
                // other structures (bread crumb, url, formulas etc) to be added as work progresses 
            }
        }    
    }
}