// jsio/browser.js

;(function() {
	var ENV, sourceCache = {
	'std.base64': {"src": "/*\n\"URL-safe\" Base64 Codec, by Jacob Rus\n\nThis library happily strips off as many trailing '=' as are included in the\ninput to 'decode', and doesn't worry whether its length is an even multiple\nof 4. It does not include trailing '=' in its own output. It uses the\n'URL safe' base64 alphabet, where the last two characters are '-' and '_'.\n\n--------------------\n\nCopyright (c) 2009 Jacob Rus\n\nPermission is hereby granted, free of charge, to any person\nobtaining a copy of this software and associated documentation\nfiles (the \"Software\"), to deal in the Software without\nrestriction, including without limitation the rights to use,\ncopy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the\nSoftware is furnished to do so, subject to the following\nconditions:\n\nThe above copyright notice and this permission notice shall be\nincluded in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND,\nEXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES\nOF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND\nNONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT\nHOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,\nWHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING\nFROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR\nOTHER DEALINGS IN THE SOFTWARE.\n*/\n\njsio('import logging');\nvar logger = logging.getLogger('base64');\n\nvar alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';\nvar pad = '=';\nvar padChar = alphabet.charAt(alphabet.length - 1);\n\nvar shorten = function (array, number) {\n\t// remove 'number' characters from the end of 'array', in place (no return)\n\tfor (var i = number; i > 0; i--){ array.pop(); };\n};\n\nvar decode_map = {};\nfor (var i=0, n=alphabet.length; i < n; i++) {\n\tdecode_map[alphabet.charAt(i)] = i;\n};\n\n\n// use this regexp in the decode function to sniff out invalid characters.\nvar alphabet_inverse = new RegExp('[^' + alphabet.replace('-', '\\\\-') + ']');\n\n\n\nvar Base64CodecError = exports.Base64CodecError = function (message) { \n\tthis.message = message;\n};\nBase64CodecError.prototype.toString = function () {\n  return 'Base64CodecError' + (this.message ? ': ' + this.message : '');\n};\n\nvar assertOrBadInput = function (exp, message) {\n\tif (!exp) { throw new Base64CodecError(message) };\n};\n\nexports.encode = function (bytes) {\n\tassertOrBadInput(!(/[^\\x00-\\xFF]/.test(bytes)), // disallow two-byte chars\n\t\t'Input contains out-of-range characters.');\n\tvar padding = '\\x00\\x00\\x00'.slice((bytes.length % 3) || 3);\n\tbytes += padding; // pad with null bytes\n\tvar out_array = [];\n\tfor (var i=0, n=bytes.length; i < n; i+=3) {\n\t\tvar newchars = (\n\t\t\t(bytes.charCodeAt(i)   << 020) +\n\t\t\t(bytes.charCodeAt(i+1) << 010) +\n\t\t\t(bytes.charCodeAt(i+2)));\n\t\tout_array.push(\n\t\t\talphabet.charAt((newchars >> 18) & 077),\n\t\t\talphabet.charAt((newchars >> 12) & 077),\n\t\t\talphabet.charAt((newchars >> 6)  & 077), \n\t\t\talphabet.charAt((newchars)\t   & 077));\t  \n\t};\n\tshorten(out_array, padding.length);\n\treturn out_array.join('');\n};\n\nexports.decode = function (b64text) {\n\tlogger.debug('decode', b64text);\n\tb64text = b64text.replace(/\\s/g, '') // kill whitespace\n\t// strip trailing pad characters from input; // XXX maybe some better way?\n\tvar i = b64text.length; while (b64text.charAt(--i) === pad) {}; b64text = b64text.slice(0, i + 1);\n\tassertOrBadInput(!alphabet_inverse.test(b64text), 'Input contains out-of-range characters.');\n\tvar padding = Array(5 - ((b64text.length % 4) || 4)).join(padChar);\n\tb64text += padding; // pad with last letter of alphabet\n\tvar out_array = [];\n\tfor (var i=0, n=b64text.length; i < n; i+=4) {\n\t\tnewchars = (\n\t\t\t(decode_map[b64text.charAt(i)]   << 18) +\n\t\t\t(decode_map[b64text.charAt(i+1)] << 12) +\n\t\t\t(decode_map[b64text.charAt(i+2)] << 6)  +\n\t\t\t(decode_map[b64text.charAt(i+3)]));\n\t\tout_array.push(\n\t\t\t(newchars >> 020) & 0xFF,\n\t\t\t(newchars >> 010) & 0xFF, \n\t\t\t(newchars)\t\t& 0xFF);\n\t};\n\tshorten(out_array, padding.length);\n\tvar result = String.fromCharCode.apply(String, out_array);\n\tlogger.debug('decoded', result);\n\treturn result;\n};\n", "filePath": "jsio/std/base64.js"},
'net.env': {"src": "jsio('from base import *');\njsio('import logging'); \nvar logger = logging.getLogger('net.env');\n\nfunction getObj(objectName, transportName, envName) {\n\ttry {\n\t\tjsio('from .env.' + (envName || jsio.__env.name) + '.' + transportName + ' import ' + objectName + ' as result');\n\t} catch(e) {\n\t\tthrow logger.error('Invalid transport (', transportName, ') or environment (', envName, ')');\n\t}\n\treturn result;\n}\n\nexports.getListener = bind(this, getObj, 'Listener');\nexports.getConnector = bind(this, getObj, 'Connector');\n", "filePath": "jsio/net/env.js"},
'logging': {"src": "jsio('from base import *');\n\nvar loggers = {}\nvar levels = exports.levels = {\n\tDEBUG: 0,\n\tLOG: 1,\n\tINFO: 2,\n\tWARN: 3,\n\tERROR: 4\n};\n\nvar production = false;\n\nexports.setProduction = function(prod) {\n\tproduction = !!prod;\n}\n\nexports.getLogger = function(name) {\n\tif (!(name in loggers)) {\n\t\tloggers[name] = new exports.Logger(name);\n\t}\n\treturn loggers[name];\n}\n\nexports.Logger = Class(function() {\n\t\n\tthis.init = function(name, level) {\n\t\tif (!level) {\n\t\t\tlevel = levels.LOG;\n\t\t}\n\t\tthis.name = name;\n\t\tthis.level = level;\n\t}\n\tthis.setLevel = function(level) {\n\t\tthis.level = level;\n\t}\n\tfunction makeLogFunction(level, type) {\n\t\treturn function() {\n\t\t\tif (!production && level >= this.level) {\n\t\t\t\treturn log.apply(log, [type, this.name].concat(Array.prototype.slice.call(arguments, 0)));\n\t\t\t}\n\t\t\treturn arguments[0];\n\t\t}\n\t}\n\n\tthis.debug = makeLogFunction(levels.DEBUG, \"DEBUG\");\n\tthis.log = makeLogFunction(levels.LOG, \"LOG\");\n\tthis.info = makeLogFunction(levels.INFO, \"INFO\");\n\tthis.warn = makeLogFunction(levels.WARN, \"WARN\");\n\tthis.error = makeLogFunction(levels.ERROR, \"ERROR\");\n\n})\n", "filePath": "jsio/logging.js"},
'net.csp.errors': {"src": "var makeErrorClass = function(name, _code) {\n\tvar out = function(message, code) {\n\t\tthis.message = message;\n\t\tthis.code = code || _code;\n\t}\n\tout.prototype.toString = function() {\n\t\treturn name + (this.message ? ': ' + this.message : '');\n\t}\n\treturn out;\n}\n\nexports.ReadyStateError = makeErrorClass(\"ReadyStateError\");\nexports.InvalidEncodingError = makeErrorClass(\"InvalidEncodingError\");\n\nexports.HandshakeTimeout = makeErrorClass(\"HandshakeTimeout\", 100);\nexports.SessionTimeout = makeErrorClass(\"HandshakeTimeout\", 101);\n\nexports.ServerProtocolError = makeErrorClass(\"ServerProtocolError\", 200);\n\n", "filePath": "jsio/net/csp/errors.js"},
'net.env.browser.csp': {"src": "jsio('from base import *');\njsio('import logging, net.interfaces');\njsio('from net.csp.client import CometSession');\n\nvar logger = logging.getLogger('env.browser.csp');\n\nexports.Connector = Class(net.interfaces.Connector, function() {\n\tthis.connect = function() {\n\t\tvar conn = new CometSession();\n\t\tconn.onconnect = bind(this, function() {\n\t\t\tlogger.debug('conn has opened');\n\t\t\tthis.onConnect(new Transport(conn));\n\t\t});\n\t\tconn.ondisconnect = bind(this, function(code) {\n\t\t\tlogger.debug('conn closed without opening, code:', code);\n\t\t});\n\t\tlogger.debug('open the conection');\n\t\tthis._opts.encoding = 'plain';\n\t\tvar url = this._opts.url;\n\t\tdelete this._opts.url;\n\t\tconn.connect(url, this._opts);//{encoding: 'plain'});\n\t}\n});\n\nvar Transport = Class(net.interfaces.Transport, function() {\n\tthis.init = function(conn) {\n\t\tthis._conn = conn;\n\t}\n\t\n\tthis.makeConnection = function(protocol) {\n\t\tthis._conn.onread = bind(protocol, 'dataReceived');\n\t\tthis._conn.ondisconnect = bind(protocol, 'connectionLost'); // TODO: map error codes\n\t}\n\t\n\tthis.write = function(data, encoding) {\n\t\tthis._conn.write(data);\n\t}\n\t\n\tthis.loseConnection = function(protocol) {\n\t\tthis._conn.close();\n\t}\n});\n", "filePath": "jsio/net/env/browser/csp.js"},
'net.csp.transports': {"src": "jsio('from base import *');\njsio('import std.uri as uri'); \njsio('import std.base64 as base64');\njsio('import .errors');\njsio('from util.browserdetect import BrowserDetect');\n\nvar createXHR = exports.createXHR = function() {\n\treturn window.XMLHttpRequest ? new XMLHttpRequest()\n\t\t: window.XDomainRequest ? new XDomainRequest()\n\t\t: window.ActiveXObject ? new ActiveXObject(\"Msxml2.XMLHTTP\")\n\t\t: null;\n};\n\nfunction isLocalFile(url) { return /^file:\\/\\//.test(url); }\nfunction isWindowDomain(url) { return uri.isSameDomain(url, window.location.href); }\n\nfunction canUseXHR(url) {\n\t// always use jsonp for local files\n\tif (isLocalFile(url)) { return false; }\n\t\n\t// try to create an XHR using the same function the XHR transport uses\n\tvar xhr = createXHR();\n\tif (!xhr) { return false; }\n\t\n\t// if the URL requested is the same domain as the window,\n\t// then we can use same-domain XHRs\n\tif (isWindowDomain(url)) { return true; }\n\t\n\t// if the URL requested is a different domain than the window,\n\t// then we need to check for cross-domain support\n\tif (window.XMLHttpRequest\n\t\t\t&& (xhr.__proto__ == XMLHttpRequest.prototype // WebKit Bug 25205\n\t\t\t\t|| xhr instanceof window.XMLHttpRequest)\n\t\t\t&& xhr.withCredentials !== undefined\n\t\t|| window.XDomainRequest \n\t\t\t&& xhr instanceof window.XDomainRequest) {\n\t\treturn true;\n\t}\n};\n\nvar transports = exports.transports = {};\n\nexports.chooseTransport = function(url, options) {\n\tswitch(options.preferredTransport) {\n\t\tcase 'jsonp':\n\t\t\treturn transports.jsonp;\n\t\tcase 'xhr':\n\t\tdefault:\n\t\t\tif (canUseXHR(url)) { return transports.xhr; };\n\t\t\treturn transports.jsonp;\n\t}\n};\n\nvar PARAMS = {\n\t'xhrstream':   {\"is\": \"1\", \"bs\": \"\\n\"},\n\t'xhrpoll':     {\"du\": \"0\"},\n\t'xhrlongpoll': {},\n\t'sselongpoll': {\"bp\": \"data: \", \"bs\": \"\\r\\n\", \"se\": \"1\"},\n\t'ssestream':   {\"bp\": \"data: \", \"bs\": \"\\r\\n\", \"se\": \"1\", \"is\": \"1\"}\n};\n\nexports.Transport = Class(function(supr) {\n\tthis.handshake = function(url, options) {\n\t\tthrow new Error(\"handshake Not Implemented\"); \n\t};\n\tthis.comet = function(url, sessionKey, lastEventId, options) { \n\t\tthrow new Error(\"comet Not Implemented\"); \n\t};\n\tthis.send = function(url, sessionKey, data, options) { \n\t\tthrow new Error(\"send Not Implemented\");\n\t};\n\tthis.encodePacket = function(packetId, data, options) { \n\t\tthrow new Error(\"encodePacket Not Implemented\"); \n\t};\n\tthis.abort = function() { \n\t\tthrow new Error(\"abort Not Implemented\"); \n\t};\n});\n\nvar baseTransport = Class(exports.Transport, function(supr) {\n\tthis.init = function() {\n\t\tthis._handshakeArgs = {\n\t\t\td:'{}',\n\t\t\tct:'application/javascript'\n\t\t};\n\t};\n\t\n\tthis.handshake = function(url, options) {\n\t\tlogger.debug('handshake:', url, options);\n\t\tthis._makeRequest('send', url + '/handshake', \n\t\t\t\t\t\t  this._handshakeArgs, \n\t\t\t\t\t\t  this.handshakeSuccess, \n\t\t\t\t\t\t  this.handshakeFailure);\n\t};\n\t\n\tthis.comet = function(url, sessionKey, lastEventId, options) {\n\t\tlogger.debug('comet:', url, sessionKey, lastEventId, options);\n\t\targs = {\n\t\t\ts: sessionKey,\n\t\t\ta: lastEventId\n\t\t};\n\t\tthis._makeRequest('comet', url + '/comet', \n\t\t\t\t\t\t  args, \n\t\t\t\t\t\t  this.cometSuccess, \n\t\t\t\t\t\t  this.cometFailure);\n\t};\n\t\n\tthis.send = function(url, sessionKey, data, options) {\n\t\tlogger.debug('send:', url, sessionKey, data, options);\n\t\targs = {\n\t\t\td: data,\n\t\t\ts: sessionKey\n\t\t};\n\t\tthis._makeRequest('send', url + '/send', \n\t\t\t\t\t\t  args, \n\t\t\t\t\t\t  this.sendSuccess, \n\t\t\t\t\t\t  this.sendFailure);\n\t};\n});\n\ntransports.xhr = Class(baseTransport, function(supr) {\n\tvar abortXHR = function(xhr) {\n\t\tlogger.debug('aborting XHR');\n\t\ttry {\n\t\t\tif('onload' in xhr) {\n\t\t\t\txhr.onload = xhr.onerror = xhr.ontimeout = null;\n\t\t\t} else if('onreadystatechange' in xhr) {\n\t\t\t\txhr.onreadystatechange = null;\n\t\t\t}\n\t\t\tif(xhr.abort) { xhr.abort(); }\n\t\t} catch(e) {\n\t\t\tlogger.debug('error aborting xhr', e);\n\t\t}\n\t};\n\n\tthis.init = function() {\n\t\tsupr(this, 'init');\n\t\n\t\tthis._xhr = {\n\t\t\t'send': createXHR(),\n\t\t\t'comet': createXHR()\n\t\t};\n\t};\n\n\tthis.abort = function() {\n\t\tfor(var i in this._xhr) {\n\t\t\tif(this._xhr.hasOwnProperty(i)) {\n\t\t\t\tabortXHR(this._xhr[i]);\n\t\t\t}\n\t\t}\n\t};\n\n\tthis.encodePacket = function(packetId, data, options) {\n\t\t// we don't need to base64 encode things unless there's a null character in there\n\t\treturn data.indexOf('\\0') == -1 ? [ packetId, 0, data ] : [ packetId, 1, base64.encode(data) ];\n\t};\n\n\tthis._onReadyStateChange = function(rType, cb, eb) {\n\t\ttry {\n\t\t\tvar xhr = this._xhr[rType];\n\t\t\tif(xhr.readyState != 4) { return; }\n\t\t\tif(xhr.status != 200) { \n\t\t\t\tlogger.debug('XHR failed with status ', xhr.status);\n\t\t\t\teb();\n\t\t\t\treturn;\n\t\t\t}\n\t\t\n\t\t\tlogger.debug('XHR data received');\n\t\t\tcb(eval(xhr.responseText));\n\t\t} catch(e) {\n\t\t\tvar xhr = this._xhr[rType];\n\t\t\tlogger.debug('Error in XHR::onReadyStateChange', e);\n\t\t\teb();\n\t\t\tabortXHR(xhr);\n\t\t\tlogger.debug('done handling XHR error');\n\t\t}\n\t};\n\n\t/**\n\t * even though we encode the POST body as in application/x-www-form-urlencoded\n\t */\n\tthis._makeRequest = function(rType, url, args, cb, eb) {\n\t\tvar xhr = this._xhr[rType], data = args.d || null;\n\t\tif('d' in args) { delete args.d; }\n\t\txhr.open('POST', url + '?' + uri.buildQuery(args)); // must open XHR first\n\t\txhr.setRequestHeader('Content-Type', 'text/plain'); // avoid preflighting\n\t\tif('onload' in xhr) {\n\t\t\txhr.onload = bind(this, '_onReadyStateChange', rType, cb, eb);\n\t\t\txhr.onerror = xhr.ontimeout = eb;\n\t\t} else if('onreadystatechange' in xhr) {\n\t\t\txhr.onreadystatechange = bind(this, '_onReadyStateChange', rType, cb, eb);\n\t\t}\n\t\tsetTimeout(bind(xhr, xhr.send, data), 0);\n\t};\n});\n\ntransports.jsonp = Class(baseTransport, function(supr) {\n\tvar createIframe = function() {\n\t\tvar i = document.createElement(\"iframe\");\n\t\twith(i.style) { display = 'block'; width = height = border = margin = padding = '0'; overflow = visibility = 'hidden'; }\n\t\ti.cbId = 0;\n\t\ti.src = 'javascript:document.open();document.write(\"<html><body></body></html>\")';\n\t\tdocument.body.appendChild(i);\n\t\treturn i;\n\t};\n\n\tvar abortIframe = function(ifr) {\n\t\tvar win = ifr.contentWindow, doc = win.document;\n\t\tlogger.debug('removing script tags');\n\t\tvar scripts = doc.getElementsByTagName('script');\n\t\tvar s1 = doc.getElementsByTagName('script')[0];\n\t\tvar s2 = doc.getElementsByTagName('script')[1];\n\t\tif(s1) s1.parentNode.removeChild(s1);\n\t\tif(s2) s2.parentNode.removeChild(s2);\n\n\t\tlogger.debug('deleting iframe callbacks');\n\t\twin['cb' + (ifr.cbId - 1)] = function(){};\n\t\twin['eb' + (ifr.cbId - 1)] = function(){};\n\t};\n\n\tvar removeIframe = function(ifr) {\n\t\t$setTimeout(function() {\n\t\t\t\tif(ifr && ifr.parentNode) { ifr.parentNode.removeChild(ifr); }\n\t\t\t}, 60000);\n\t};\n\n\tthis.init = function() {\n\t\tsupr(this, 'init');\n\n\t\tthis._onReady = [];\n\t\tthis._isReady = false;\n\n\t\tthis._createIframes();\n\t};\n\n\tthis._createIframes = function() {\n\t\tif(!document.body) { return $setTimeout(bind(this, '_createIframes'), 100); }\n\t\t\n\t\tthis._isReady = true;\n\t\tthis._ifr = {\n\t\t\t'send':\t createIframe(),\n\t\t\t'comet': createIframe()\n\t\t};\n\n\t\tvar readyArgs = this._onReady;\n\t\tthis._onReady = [];\n\t\tfor(var i = 0, args; args = readyArgs[i]; ++i) {\n\t\t\tthis._makeRequest.apply(this, args);\n\t\t}\n\t};\n\n\tthis.encodePacket = function(packetId, data, options) {\n\t\treturn [ packetId, 1, base64.encode(data) ];\n\t};\n\n\tthis.abort = function() {\n\t\tfor(var i in this._ifr) {\n\t\t\tif(this._ifr.hasOwnProperty(i)) {\n\t\t\t\tvar ifr = this._ifr[i];\n\t\t\t\tabortIframe(ifr);\n\t\t\t\tremoveIframe(ifr);\n\t\t\t}\n\t\t}\n\t};\n\n\tthis._makeRequest = function(rType, url, args, cb, eb) {\n\t\tif(!this._isReady) { return this._onReady.push(arguments); }\n\n\t\targs.n = Math.random();\n\t\t$setTimeout(bind(this, function() {\n\t\t\tvar ifr = this._ifr[rType];\n\t\t\t// IE6+ uses contentWindow.document, the others use temp.contentDocument.\n\t\t\tvar win = ifr.contentWindow, doc = win.document, body = doc.body;\n\t\t\tvar completed = false;\n\t\t\tvar jsonpId = ifr.cbId++;\n\t\t\tvar onFinish = win['eb' + jsonpId] = function(scriptTag) {\n\t\t\t\t// IE6 onReadyStateChange\n\t\t\t\tif(scriptTag && scriptTag.readyState != 'loaded') { return; }\n\t\t\t\tif (!completed) { logger.debug('error making request:', fullUrl); }\n\n\t\t\t\tabortIframe(ifr);\n\n\t\t\t\tif (!completed) {\n\t\t\t\t\tlogger.debug('calling eb');\n\t\t\t\t\teb.apply(null, arguments);\n\t\t\t\t}\n\t\t\t};\n\n\t\t\twin['cb' + jsonpId] = function callback() {\n\t\t\t\tlogger.debug('successful: ', fullUrl, [].slice.call(arguments, 0));\n\t\t\t\tcompleted = true;\n\t\t\t\tlogger.debug('calling the cb');\n\t\t\t\tcb.apply(null, arguments);\n\t\t\t\tlogger.debug('cb called');\n\t\t\t};\n\n\t\t\tswitch(rType) {\n\t\t\t\tcase 'send': args.rs = ';'; args.rp = 'cb' + jsonpId; break;\n\t\t\t\tcase 'comet': args.bs = ';'; args.bp = 'cb' + jsonpId; break;\n\t\t\t}\n\n\t\t\tvar fullUrl = url + '?' + uri.buildQuery(args);\n\n\t\t\tif(BrowserDetect.isWebKit) {\n\t\t\t\tdoc.open();\n\t\t\t\tdoc.write('<scr'+'ipt src=\"'+fullUrl+'\"></scr'+'ipt>');\n\t\t\t\tdoc.write('<scr'+'ipt>eb'+jsonpId+'(false)</scr'+'ipt>');\n\t\t\t} else {\n\t\t\t\tvar s = doc.createElement('script');\n\t\t\t\ts.src = fullUrl;\n\t\t\t\tif(s.onreadystatechange === null) { s.onreadystatechange = bind(window, onFinish, s); } // IE\n\t\t\t\tbody.appendChild(s);\n\t\t\t\tif(!BrowserDetect.isIE) {\n\t\t\t\t\tvar s = doc.createElement('script');\n\t\t\t\t\ts.innerHTML = 'eb'+jsonpId+'(false)';\n\t\t\t\t\tbody.appendChild(s);\n\t\t\t\t}\n\t\t\t}\n\t\t\t\n\t\t\tkillLoadingBar();\n\t\t}), 0);\n\t};\n\n\tvar killLoadingBar = BrowserDetect.isFirefox ? function() {\n\t\tif(!killLoadingBar.iframe) { killLoadingBar.iframe = document.createElement('iframe'); }\n\t\tif(document.body) {\n\t\t\tdocument.body.insertBefore(killLoadingBar.iframe, document.body.firstChild);\n\t\t\tdocument.body.removeChild(killLoadingBar.iframe); \n\t\t}\n\t} : function() {};\n});\n\t", "filePath": "jsio/net/csp/transports.js"},
'net.interfaces': {"src": "// Sort of like a twisted protocol\njsio('from base import *');\njsio('import net');\n\nvar ctx = jsio.__env.global;\n\nexports.Protocol = Class(function() {\n\tthis.connectionMade = function(isReconnect) {}\n\tthis.dataReceived = function(data) {}\n\tthis.connectionLost = function(reason) {}\n\tthis.connectionFailed = function() {}\n});\n\nexports.Client = Class(function() {\n\tthis.init = function(protocol) {\n\t\tthis._protocol = protocol;\n\t}\n\t\n\tthis.connect = function(transportName, opts) {\n\t\tthis._remote = new this._protocol();\n\t\tthis._remote._client = this;\n\t\tnet.connect(this._remote, transportName, opts);\n\t}\n});\n\n// Sort of like a twisted factory\nexports.Server = Class(function() {\n\tthis.init = function(protocolClass) {\n\t\tthis._protocolClass = protocolClass;\n\t}\n\n\tthis.buildProtocol = function() {\n\t\treturn new this._protocolClass();\n\t}\n\t\n\tthis.listen = function(how, port) {\n\t\tnet.listen(this, how, port);\n\t}\n});\n\nexports.Transport = Class(function() {\n\tthis.write = function(data, encoding) {\n\t\tthrow new Error(\"Not implemented\");\n\t}\n\tthis.getPeer = function() {\n\t\tthrow new Error(\"Not implemented\");\n\t}\n});\n\nexports.Listener = Class(function() {\n\tthis.init = function(server, opts) {\n\t\tthis._server = server;\n\t\tthis._opts = opts || {};\n\t}\n\t\n\tthis.onConnect = function(transport) {\n\t\ttry {\n\t\t\tvar p = this._server.buildProtocol();\n\t\t\tp.transport = transport;\n\t\t\tp.server = this._server;\n\t\t\ttransport.protocol = p;\n\t\t\ttransport.makeConnection(p);\n\t\t\tp.connectionMade();\n\t\t} catch(e) {\n\t\t\tlogger.error(e);\n\t\t}\n\t}\n\t\n\tthis.listen = function() { throw new Error('Abstract class'); }\n\tthis.stop = function() {}\n});\n\nexports.Connector = Class(function() {\n\tthis.init = function(protocol, opts) {\n\t\tthis._protocol = protocol;\n\t\tthis._opts = opts;\n\t}\n\t\n\tthis.onConnect = function(transport) {\n\t\ttransport.makeConnection(this._protocol);\n\t\tthis._protocol.transport = transport;\n\t\ttry {\n\t\t\tthis._protocol.connectionMade();\n\t\t} catch(e) {\n\t\t\tthrow logger.error(e);\n\t\t}\n\t}\n\t\n\tthis.onDisconnect = function() {\n\t\ttry {\n\t\t\tthis._protocol.connectionLost();\n\t\t} catch(e) {\n\t\t\tthrow logger.error(e);\n\t\t}\n\t}\n\t\n\tthis.getProtocol = function() { return this._protocol; }\n});\n", "filePath": "jsio/net/interfaces.js"},
'net.buffer': {"src": "jsio('from base import *');\njsio('import logging');\njsio('from net.interfaces import Protocol');\n\nvar logger = logging.getLogger('net.buffer.Buffer');\n\nvar EmptyBufferError = exports.EmptyBufferError = Class(function () {\n\tthis.init = function(message) { this.message = message; }\n})\n\nexports.Buffer = Class(function(supr) {\n\n\tthis.init = function(rawBuffer) {\n\t\t\n\t\tthis._rawBuffer = !!rawBuffer ? rawBuffer : \"\";\n\t}\n\n\tthis.getLength = function() {\n\t\treturn this._rawBuffer.length;\n\t}\n\n\tthis.append = function(data) {\n\t\tlogger.debug('append', JSON.stringify(data));\n\t\tthis._rawBuffer += data;\n\t}\n\n\tthis.peekBytes = function(num) {\n\t\tif (!!num)\n\t\t\treturn this._rawBuffer.slice(0, num);\n\t\telse \n\t\t\treturn this._rawBuffer;\n\t}\n\n\tthis.peekToDelimiter = function(delimiter) {\n\t\tdelimiter = delimiter ? delimiter : '\\n';\n\t\tvar i = this._rawBuffer.indexOf(delimiter);\n\t\tif (i == -1)\n\t\t\tthrow new EmptyBufferError(\"delimiter \" + delmiter + \"not present in buffer\");\n\t\telse\n\t\t\treturn this._rawBuffer.slice(0, i);\n\t}\n\n\tthis.consumeBytes = function(num) {\n\t\tvar output = this.peekBytes(num);\n\t\tthis._rawBuffer = this._rawBuffer.slice(output.length);\n\t\treturn output;\n\t}\n\tthis.consumeMaxBytes = function(num) {\n\t\tvar output = this._rawBuffer.slice(0, num);\n\t\tthis._rawBuffer = this._rawBuffer(num);\n\t\treturn output;\n\t}\n\tthis.consumeAllBytes = function() {\n\t\tvar temp = this._rawBuffer;\n\t\tthis._rawBuffer = \"\";\n\t\treturn temp;\n\t}\n\t\n\tthis.consumeThroughDelimiter = function(delimiter) {\n\t\treturn this.consumeToDelimiter(delimiter) + this.consumeBytes(delimiter.length);\n\t}\n\n\tthis.consumeToDelimiter = function(delimiter) {\n\t\tdelimiter = !!delimiter ? delimiter : \"\\n\"\n\t\tvar output = this.peekToDelimiter(delimiter);\n\t\tthis._rawBuffer = this._rawBuffer.slice(output.length);\n\t\treturn output;\n\t}\n\n\tthis.hasBytes = function(num) {\n\t\tnum = num ? num : 0;\n\t\treturn this._rawBuffer.length >= num;\n\t}\n\n\tthis.hasDelimiter = function(delimiter) {\n\t\tdelimiter = !!delimiter ? delimiter : '\\n';\n\t\treturn (this._rawBuffer.indexOf(delimiter) != -1);\n\t}\n\n})\n", "filePath": "jsio/net/buffer.js"},
'net.csp.client': {"src": "jsio('from base import *');\njsio('import std.base64 as base64');\njsio('import std.utf8 as utf8');\njsio('import std.uri as uri'); \njsio('import logging');\njsio('import .errors');\njsio('import .transports');\n\nvar logger = logging.getLogger(\"csp.client\");\n\nvar READYSTATE = exports.READYSTATE = {\n\tINITIAL: 0,\n\tCONNECTING: 1,\n\tCONNECTED: 2,\n\tDISCONNECTING: 3,\n\tDISCONNECTED:  4\n};\n\nexports.CometSession = Class(function(supr) {\n\tvar id = 0;\n\tvar kDefaultBackoff = 50;\n\tvar kDefaultTimeoutInterval = 45000;\n\tvar kDefaultHandshakeTimeout = 10000;\n\tthis.init = function() {\n\t\tthis._id = ++id;\n\t\tthis._url = null;\n\t\tthis.readyState = READYSTATE.INITIAL;\n\t\tthis._sessionKey = null;\n\t\tthis._transport = null;\n\t\tthis._options = null;\n\t\t\n\t\tthis._utf8ReadBuffer = \"\";\n\t\tthis._writeBuffer = \"\";\n\t\t\n\t\tthis._packetsInFlight = null;\n\t\tthis._lastEventId = null;\n\t\tthis._lastSentId = null;\n\t\t\n\t\tthis._handshakeLater = null;\n\t\tthis._handshakeBackoff = kDefaultBackoff;\n\t\tthis._handshakeRetryTimer = null;\n\t\tthis._handshakeTimeoutTimer = null;\n\n\t\tthis._timeoutTimer = null;\n\n\t\t\n\t\tthis._writeBackoff = kDefaultBackoff;\n\t\tthis._writeRetryTimer = null;\n\t\t\n\t\tthis._cometBackoff = kDefaultBackoff;\n\t\tthis._cometRetryTimer = null;\n\t\t\n\t}\n\t\n\t\n\tthis.setEncoding = function(encoding) {\n\t\tif (encoding == this._options.encoding) { \n\t\t\treturn; \n\t\t}\n\t\tif (encoding != 'utf8' && encoding != 'plain') {\n\t\t\tthrow new errors.InvalidEncodingError();\n\t\t}\n\t\tif (encoding == 'plain' && this._buffer) {\n\t\t\tvar buffer = this._utf8ReadBuffer;\n\t\t\tthis._utf8ReadBuffer = \"\";\n\t\t\tthis._doOnRead(buffer);\n\t\t}\n\t\tthis._options.encoding = encoding;\n\t}\n\n\n\tthis.connect = function(url, options) {\n\t\tthis._url = url.replace(/\\/$/,'');\n\t\tthis._options = options || {};\n\t\t\n\t\tthis._options.encoding = this._options.encoding || 'utf8';\n\t\tthis.setEncoding(this._options.encoding); // enforce encoding constraints\n\t\t\n\t\tthis._options.connectTimeout = this._options.connectTimeout || kDefaultHandshakeTimeout;\n\t\t\n\t\tvar transportClass = transports.chooseTransport(url, this._options);\n\t\tthis._transport = new transportClass();\n\t\t\n\t\tthis._transport.handshakeFailure = bind(this, this._handshakeFailure);\n\t\tthis._transport.handshakeSuccess = bind(this, this._handshakeSuccess);\n\t\t\n\t\tthis._transport.cometFailure = bind(this, this._cometFailure);\n\t\tthis._transport.cometSuccess = bind(this, this._cometSuccess);\n\t\t\n\t\tthis._transport.sendFailure = bind(this, this._writeFailure);\n\t\tthis._transport.sendSuccess = bind(this, this._writeSuccess);\n\t\tthis.readyState = READYSTATE.CONNECTING;\n\t\tthis._transport.handshake(this._url, this._options);\n\t\tthis._handshakeTimeoutTimer = $setTimeout(bind(this, this._handshakeTimeout), \n\t\t\tthis._options.connectTimeout);\n\t}\n\n\tthis.write = function(data, encoding) {\n\t\tif (this.readyState != READYSTATE.CONNECTED) {\n\t\t\tthrow new errors.ReadyStateError();\n\t\t}\n\t\tencoding = encoding || this._options.encoding || 'utf8';\n\t\tif (encoding == 'utf8') {\n\t\t\tdata = utf8.encode(data);\n\t\t}\n\t\tthis._writeBuffer += data;\n\t\tthis._doWrite();\n\t}\n\tthis.close = function(err) {\n\t\tswitch(this.readyState) {\n\t\t\tcase READYSTATE.CONNECTING:\n\t\t\t\tclearTimeout(this._handshakeRetryTimer);\n\t\t\t\tclearTimeout(this._handshakeTimeoutTimer);\n\t\t\t\tbreak;\n\t\t\tcase READYSTATE.CONNECTED:\n\t\t\t\tthis._transport.abort();\n\t\t\t\tclearTimeout(this._cometRetryTimer);\n\t\t\t\tclearTimeout(this._writeRetryTimer);\n\t\t\t\tclearTimeout(this._timeoutTimer);\n\t\t\t\tbreak;\n\t\t\tcase READYSTATE.DISCONNECTED:\n\t\t\t\tthrow new errors.ReadyStateError(\"Session is already disconnected\");\n\t\t\t\tbreak;\n\t\t}\n\t\tthis._doOnDisconnect(err);\n\t}\n\n\t\n\tthis._handshakeTimeout = function() {\n\t\tlogger.debug('handshake timeout');\n\t\tthis._handshakeTimeoutTimer = null;\n\t\tthis._doOnDisconnect(new errors.HandshakeTimeout());\n\t}\n\t\n\tthis._handshakeSuccess = function(d) {\n\t\tlogger.debug('handshake success', d);\n\t\tif (this.readyState != READYSTATE.CONNECTING) { \n\t\t\tlogger.debug('received handshake success in invalid readyState:', this.readyState);\n\t\t\treturn; \n\t\t}\n\t\tclearTimeout(this._handshakeTimeoutTimer);\n\t\tthis._handshakeTimeoutTimer = null;\n\t\tthis._sessionKey = d.session;\n\t\tthis._opened = true;\n\t\tthis.readyState = READYSTATE.CONNECTED;\n\t\tthis._doOnConnect();\n\t\tthis._doConnectComet();\n\t}\n\t\n\tthis._handshakeFailure = function(e) {\n\t\tlogger.debug('handshake failure', e);\n\t\tif (this.readyState != READYSTATE.CONNECTING) { return; }\n\t\t\n\t\tlogger.debug('trying again in ', this._handshakeBackoff);\n\t\tthis._handshakeRetryTimer = $setTimeout(bind(this, function() {\n\t\t\tthis._handshakeRetryTimer = null;\n\t\t\tthis._transport.handshake(this._url, this._options);\n\t\t}), this._handshakeBackoff);\n\t\t\n\t\tthis._handshakeBackoff *= 2;\n\t}\n\t\n\tthis._writeSuccess = function() {\n\t\tif (this.readyState != READYSTATE.CONNECTED) { return; }\n\t\tthis._resetTimeoutTimer();\n\t\tthis.writeBackoff = kDefaultBackoff;\n\t\tthis._packetsInFlight = null;\n\t\tif (this._writeBuffer) {\n\t\t\tthis._doWrite();\n\t\t}\n\t}\n\t\n\tthis._writeFailure = function() {\n\t\tif (this.readyState != READYSTATE.CONNECTED) { return; }\n\t\tthis._writeTimer = $setTimeout(bind(this, function() {\n\t\t\tthis._writeTimer = null;\n\t\t\tthis._doWrite();\n\t\t}), this._writeBackoff);\n\t\tthis._writeBackoff *= 2;\n\t}\t\n\t\n\tthis._doWrite = function() {\n\t\tif(this._packetsInFlight) { return; }\n\t\tlogger.debug('_writeBuffer:', this._writeBuffer);\n\t\tthis._packetsInFlight = [this._transport.encodePacket(++this._lastSentId, this._writeBuffer, this._options)];\n\t\tthis._writeBuffer = \"\";\n\t\tlogger.debug('sending packets:', JSON.stringify(this._packetsInFlight));\n\t\tthis._transport.send(this._url, this._sessionKey, JSON.stringify(this._packetsInFlight), this._options);\n\t}\n\t\n\tthis._doConnectComet = function() {\n\t\tlogger.debug('_doConnectComet');\n//\t\treturn;\n\t\tthis._transport.comet(this._url, this._sessionKey, this._lastEventId || 0, this._options);\n\t}\n\n\tthis._cometFailure = function() {\n\t\tif (this.readyState != READYSTATE.CONNECTED) { return; }\n\t\tthis._cometTimer = $setTimeout(bind(this, function() {\n\t\t\tthis._doConnectComet();\n\t\t}), this._cometBackoff);\n\t\tthis._cometBackoff *= 2;\n\t}\n\t\n\tthis._cometSuccess = function(packets) {\n\t\tif (this.readyState != READYSTATE.CONNECTED) { return; }\n\t\tlogger.debug('comet Success:', packets);\n\t\tthis._cometBackoff = kDefaultBackoff;\n\t\tthis._resetTimeoutTimer();\n\t\tfor (var i = 0, packet; (packet = packets[i]) || i < packets.length; i++) {\n\t\t\tlogger.debug('process packet:', packet);\n\t\t\tif (packet === null) {\n\t\t\t\treturn self.close();\n\t\t\t}\n\t\t\tlogger.debug('process packet', packet);\n\t\t\tvar ackId = packet[0];\n\t\t\tvar encoding = packet[1];\n\t\t\tvar data = packet[2];\n\t\t\tif (typeof(this._lastEventId) == 'number' && ackId <= this._lastEventId) {\n\t\t\t\tcontinue;\n\t\t\t}\n\t\t\tif (typeof(this._lastEventId) == 'number' && ackId != this._lastEventId+1) {\n\t\t\t\treturn this.close(new errors.ServerProtocolError(201));\n\t\t\t}\n\t\t\tthis._lastEventId = ackId;\n\t\t\tif (encoding == 1) { // base64 encoding\n\t\t\t\ttry {\n\t\t\t\t\tlogger.debug('before base64 decode:', data);\n\t\t\t\t\tdata = base64.decode(data);\n\t\t\t\t\tlogger.debug('after base64 decode:', data);\n\t\t\t\t} catch(e) {\n\t\t\t\t\treturn this.close(new errors.ServerProtocolError(202));\n\t\t\t\t}\n\t\t\t}\n\t\t\tif (this._options.encoding == 'utf8') {\n\t\t\t\t// TODO: need an incremental utf8 decoder for this stuff.\n\t\t\t\tthis._utf8ReadBuffer += data;\n\t\t\t\tlogger.debug('before utf8 decode, _utf8ReadBuffer:', this._utf8ReadBuffer);\n\t\t\t\tvar result = utf8.decode(this._utf8ReadBuffer);\n\t\t\t\tdata = result[0];\n\t\t\t\tthis._utf8ReadBuffer = this._utf8ReadBuffer.slice(result[1]);\n\t\t\t\tlogger.debug('after utf8 decode, _utf8ReadBuffer:', this._utf8ReadBuffer, 'data:', data );\n\t\t\t}\n\t\t\tlogger.debug('dispatching data:', data);\n\t\t\ttry {\n\t\t\t\tthis._doOnRead(data);\n\t\t\t} catch(e) {\n\t\t\t\tlogger.error('application code threw an error. (re-throwing in timeout):', e);\n\t\t\t\t// throw the error later\n\t\t\t\tsetTimeout(function() {\n\t\t\t\t\tlogger.debug('timeout fired, throwing error', e);\n\t\t\t\t\tthrow e;\n\t\t\t\t}, 0);\n\t\t\t}\n\t\t}\n\t\t// reconnect comet last, after we process all of the packet ids\n\t\tthis._doConnectComet();\n\t\t\n\t}\n\n\tthis._doOnRead = function(data) {\n\t\tif (typeof(this.onread) == 'function') {\n\t\t\tlogger.debug('call onread function', data);\n\t\t\tthis.onread(data);\n\t\t}\n\t\telse {\n\t\t\tlogger.debug('skipping onread callback (function missing)');\n\t\t}\n\t}\n\t\n\tthis._doOnDisconnect = function(err) {\n\t\tif (typeof(this.ondisconnect) == 'function') {\n\t\t\tlogger.debug('call ondisconnect function', err);\n\t\t\tthis.ondisconnect(err);\n\t\t}\n\t\telse {\n\t\t\tlogger.debug('skipping ondisconnect callback (function missing)');\n\t\t}\n\t}\n\t\n\tthis._doOnConnect = function() {\n\t\tif (typeof(this.onconnect) == 'function') {\n\t\t\tlogger.debug('call onconnect function');\n\t\t\ttry {\n\t\t\t\tthis.onconnect();\n\t\t\t} catch(e) {\n\t\t\t\tlogger.debug('onconnect caused errror', e);\n\t\t\t\t// throw error later\n\t\t\t\tsetTimeout(function() { throw e }, 0);\n\t\t\t}\n\t\t}\n\t\telse {\n\t\t\tlogger.debug('skipping onconnect callback (function missing)');\n\t\t}\n\t}\n\n\tthis._resetTimeoutTimer = function() {\n\t\tclearTimeout(this._timeoutTimer);\n\t\tthis._timeoutTimer = $setTimeout(bind(this, function() {\n\t\t\tlogger.debug('connection timeout expired');\n\t\t\tthis.close(new errors.SessionTimeout())\n\t\t}), this._getTimeoutInterval())\n\t}\n\t\n\tthis._getTimeoutInterval = function() {\n\t\treturn kDefaultTimeoutInterval;\n\t}\n\n});\n", "filePath": "jsio/net/csp/client.js"},
'base': {"src": "exports.log = jsio.__env.log;\n\nexports.bind = function(context, method /*, VARGS*/) {\n\tif(arguments.length > 2) {\n\t\tvar args = Array.prototype.slice.call(arguments, 2);\n\t\treturn typeof method == 'string'\n\t\t\t? function() {\n\t\t\t\tif (context[method]) {\n\t\t\t\t\treturn context[method].apply(context, args.concat(Array.prototype.slice.call(arguments, 0)));\n\t\t\t\t} else {\n\t\t\t\t\tthrow logger.error('No method:', method, 'for context', context);\n\t\t\t\t}\n\t\t\t}\n\t\t\t: function() { return method.apply(context, args.concat(Array.prototype.slice.call(arguments, 0))); }\n\t} else {\n\t\treturn typeof method == 'string'\n\t\t\t? function() {\n\t\t\t\tif (context[method]) {\n\t\t\t\t\treturn context[method].apply(context, arguments);\n\t\t\t\t} else {\n\t\t\t\t\tthrow logger.error('No method:', method, 'for context', context);\n\t\t\t\t}\n\t\t\t}\n\t\t\t: function() { return method.apply(context, arguments); }\n\t}\n}\n\nexports.Class = function(parent, proto) {\n\tif(!parent) { throw new Error('parent or prototype not provided'); }\n\tif(!proto) { proto = parent; }\n\telse if(parent instanceof Array) { // multiple inheritance, use at your own risk =)\n\t\tproto.prototype = {};\n\t\tfor(var i = 0, p; p = parent[i]; ++i) {\n\t\t\tfor(var item in p.prototype) {\n\t\t\t\tif(!(item in proto.prototype)) {\n\t\t\t\t\tproto.prototype[item] = p.prototype[item];\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t\tparent = parent[0]; \n\t} else {\n\t\tproto.prototype = parent.prototype;\n\t}\n\n\tvar cls = function() { if(this.init) { return this.init.apply(this, arguments); }}\n\tcls.prototype = new proto(function(context, method, args) {\n\t\tvar args = args || [];\n\t\tvar target = proto;\n\t\twhile(target = target.prototype) {\n\t\t\tif(target[method]) {\n\t\t\t\treturn target[method].apply(context, args);\n\t\t\t}\n\t\t}\n\t\tthrow new Error('method ' + method + ' does not exist');\n\t});\n\tcls.prototype.constructor = cls;\n\treturn cls;\n}\n\nexports.$setTimeout = function(f, t/*, VARGS */) {\n\tvar args = Array.prototype.slice.call(arguments, 2);\n\treturn setTimeout(function() {\n\t\ttry {\n\t\t\tf.apply(this, args);\n\t\t} catch(e) {\n\t\t\t// log?\n\t\t}\n\t}, t)\n}\n\nexports.$setInterval = function(f, t/*, VARGS */) {\n\tvar args = Array.prototype.slice.call(arguments, 2);\n\treturn setInterval(function() {\n\t\ttry {\n\t\t\tf.apply(this, args);\n\t\t} catch(e) {\n\t\t\t// log?\n\t\t}\n\t}, t)\n}\n\n// node doesn't let you call clearTimeout(null)\nexports.$clearTimeout = function (timer) { return timer ? clearTimeout(timer) : null; };\nexports.$clearInterval = function (timer) { return timer ? clearInterval(timer) : null; };\n\n// keep logging local variables out of other closures in this file!\nexports.logging = (function() {\n\t\n\t// logging namespace, this is what is exported\n\tvar logging = {\n\t\tDEBUG: 1,\n\t\tLOG: 2,\n\t\tINFO: 3,\n\t\tWARN: 4,\n\t\tERROR: 5\n\t};\n\n\t// effectively globals - all loggers and a global production state\n\tvar loggers = {}\n\tvar production = false;\n\n\tlogging.setProduction = function(prod) { production = !!prod; }\n\tlogging.get = function(name) {\n\t\treturn loggers.hasOwnProperty(name) ? loggers[name]\n\t\t\t: (loggers[name] = new Logger(name));\n\t}\n  logging.set = function(name, _logger) {\n\t\tloggers[name] = _logger;\n\t}\n\t\n\tlogging.getAll = function() { return loggers; }\n\n\tlogging.__create = function(pkg, ctx) { ctx.logger = logging.get(pkg); }\n\t\n\tvar Logger = exports.Class(function() {\n\t\tthis.init = function(name, level) {\n\t\t\tthis._name = name;\n\t\t\tthis._level = level || logging.LOG;\n\t\t}\n\t\t\n\t\tthis.setLevel = function(level) { this._level = level; }\n\t\n\t\tvar slice = Array.prototype.slice;\n\t\tvar log = exports.log;\n\t\tfunction makeLogFunction(level, type) {\n\t\t\treturn function() {\n\t\t\t\tif (!production && level >= this._level) {\n\t\t\t\t\treturn log.apply(log, [type, this._name].concat(slice.call(arguments, 0)));\n\t\t\t\t}\n\t\t\t\treturn arguments[0];\n\t\t\t}\n\t\t}\n\t\n\t\tthis.debug = makeLogFunction(logging.DEBUG, \"DEBUG\");\n\t\tthis.log = makeLogFunction(logging.LOG, \"LOG\");\n\t\tthis.info = makeLogFunction(logging.INFO, \"INFO\");\n\t\tthis.warn = makeLogFunction(logging.WARN, \"WARN\");\n\t\tthis.error = makeLogFunction(logging.ERROR, \"ERROR\");\n\t});\n\n\treturn logging;\n})();\n\nvar logger = exports.logging.get('jsiocore');\n", "filePath": "jsio/base.js"},
'Orbited': {"src": "jsio('from net.protocols.mspp import MSPPStream, MSPPProtocol');\njsio('import std.utf8')\n\nexports.logging = logging;\nexports.utf8 = std.utf8\nexports.settings = { 'host': 'localhost', 'port': 8000, 'path': '/csp'};\n\nvar multiplexer = null;\nexports.TCPSocket = Class(MSPPStream, function() {\n    this.init = function() {\n        this.setEncoding('plain');\n        if (multiplexer == null) {\n            multiplexer = new MSPPProtocol();\n            multiplexer.setTransport('csp', {\"url\": \"http://\" + exports.settings.host + \":\" + exports.settings.port + exports.settings.path});\n        }\n        this.setMultiplexer(multiplexer);\n    }\n});\n", "filePath": "Orbited.js"},
'std.JSON': {"src": "// Based on json2.js (version 2009-09-29) http://www.JSON.org/json2.js\n// exports createGlobal, stringify, parse, stringifyDate\n\n/**\n * if a global JSON object doesn't exist, create one\n */\nexports.createGlobal = function() {\n\tif(typeof JSON == 'undefined') { JSON = {}; }\n\tif(typeof JSON.stringify !== 'function') {\n\t\tJSON.stringify = exports.stringify;\n\t}\n\tif(typeof JSON.parse !== 'function') {\n\t\tJSON.parse = exports.parse;\n\t}\n};\n\n;(function() {\n\tvar cx = /[\\u0000\\u00ad\\u0600-\\u0604\\u070f\\u17b4\\u17b5\\u200c-\\u200f\\u2028-\\u202f\\u2060-\\u206f\\ufeff\\ufff0-\\uffff]/g,\n\t\tescapable = /[\\\\\\\"\\x00-\\x1f\\x7f-\\x9f\\u00ad\\u0600-\\u0604\\u070f\\u17b4\\u17b5\\u200c-\\u200f\\u2028-\\u202f\\u2060-\\u206f\\ufeff\\ufff0-\\uffff]/g,\n\t\tgap,\n\t\tindent,\n\t\tmeta = {\t// table of character substitutions\n\t\t\t'\\b': '\\\\b',\n\t\t\t'\\t': '\\\\t',\n\t\t\t'\\n': '\\\\n',\n\t\t\t'\\f': '\\\\f',\n\t\t\t'\\r': '\\\\r',\n\t\t\t'\"' : '\\\\\"',\n\t\t\t'\\\\': '\\\\\\\\'\n\t\t},\n\t\trep;\n\t\n\tfunction quote(string) {\n\t\t// quote the string if it doesn't contain control characters, quote characters, and backslash characters\n\t\t// otherwise, replace those characters with safe escape sequences\n\t\tescapable.lastIndex = 0;\n\t\treturn escapable.test(string)\n\t\t\t? '\"' + string.replace(escapable, function (a) {\n\t\t\t\t\tvar c = meta[a];\n\t\t\t\t\treturn typeof c === 'string' ? c : '\\\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);\n\t\t\t\t}) + '\"'\n\t\t\t: '\"' + string + '\"';\n\t}\n\t\n\t// Produce a string from holder[key].\n\tfunction str(key, holder) {\n\t\tvar mind = gap, value = holder[key];\n\t\t\n\t\t// If the value has a toJSON method, call it to obtain a replacement value.\n\t\tif (value && typeof value === 'object' && typeof value.toJSON === 'function') {\n\t\t\tvalue = value.toJSON(key);\n\t\t}\n\t\t\n\t\t// If we were called with a replacer function, then call the replacer to\n\t\t// obtain a replacement value.\n\t\tif (typeof rep === 'function') { value = rep.call(holder, key, value); }\n\t\t\n\t\tswitch (typeof value) {\n\t\t\tcase 'string':\n\t\t\t\treturn quote(value);\n\t\t\tcase 'number':\n\t\t\t\t// JSON numbers must be finite\n\t\t\t\treturn isFinite(value) ? String(value) : 'null';\n\t\t\tcase 'boolean':\n\t\t\t\treturn String(value);\n\t\t\tcase 'object': // object, array, date, null\n\t\t\t\tif (value === null) { return 'null'; } // typeof null == 'object'\n\t\t\t\tif (value.constructor === Date) { return exports.stringifyDate(value); }\n\t\t\t\n\t\t\t\tgap += indent;\n\t\t\t\tvar partial = [];\n\t\t\t\t\n\t\t\t\t// Is the value an array?\n\t\t\t\tif (value.constructor === Array) {\n\t\t\t\t\tvar length = value.length;\n\t\t\t\t\tfor (var i = 0; i < length; i += 1) {\n\t\t\t\t\t\tpartial[i] = str(i, value) || 'null';\n\t\t\t\t\t}\n\t\t\t\t\t\n\t\t\t\t\t// Join all of the elements together, separated with commas, and wrap them in brackets.\n\t\t\t\t\tvar v = partial.length === 0 ? '[]' :\n\t\t\t\t\t\tgap ? '[\\n' + gap +\n\t\t\t\t\t\t\t\tpartial.join(',\\n' + gap) + '\\n' +\n\t\t\t\t\t\t\t\t\tmind + ']' :\n\t\t\t\t\t\t\t  '[' + partial.join(',') + ']';\n\t\t\t\t\tgap = mind;\n\t\t\t\t\treturn v;\n\t\t\t\t}\n\t\t\t\t\n\t\t\t\tif (rep && typeof rep === 'object') { // rep is an array\n\t\t\t\t\tvar length = rep.length;\n\t\t\t\t\tfor (var i = 0; i < length; i += 1) {\n\t\t\t\t\t\tvar k = rep[i];\n\t\t\t\t\t\tif (typeof k === 'string') {\n\t\t\t\t\t\t\tvar v = str(k, value);\n\t\t\t\t\t\t\tif (v) {\n\t\t\t\t\t\t\t\tpartial.push(quote(k) + (gap ? ': ' : ':') + v);\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t} else { // iterate through all of the keys in the object.\n\t\t\t\t\tfor (var k in value) {\n\t\t\t\t\t\tif (Object.hasOwnProperty.call(value, k)) {\n\t\t\t\t\t\t\tvar v = str(k, value);\n\t\t\t\t\t\t\tif (v) {\n\t\t\t\t\t\t\t\tpartial.push(quote(k) + (gap ? ': ' : ':') + v);\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t}\n\n\t\t\t\t// Join all of the member texts together, separated with commas,\n\t\t\t\t// and wrap them in braces.\n\t\t\t\tvar v = partial.length === 0 ? '{}' :\n\t\t\t\t\tgap ? '{\\n' + gap + partial.join(',\\n' + gap) + '\\n' +\n\t\t\t\t\t\t\tmind + '}' : '{' + partial.join(',') + '}';\n\t\t\t\tgap = mind;\n\t\t\t\treturn v;\n\t\t}\n\t}\n\n\n\t/**\n\t * The stringify method takes a value and an optional replacer, and an optional\n\t * space parameter, and returns a JSON text. The replacer can be a function\n\t * that can replace values, or an array of strings that will select the keys.\n \t * A default replacer method can be provided. Use of the space parameter can\n\t * produce text that is more easily readable.\n\t */\n\texports.stringify = function (value, replacer, space) {\n\t\tgap = '';\n\t\tindent = '';\n\t\t\n\t\t// If the space parameter is a number, make an indent string containing that many spaces.\n\t\tif (typeof space === 'number') {\n\t\t\tfor (var i = 0; i < space; i += 1) {\n\t\t\t\tindent += ' ';\n\t\t\t}\n\t\t} else if (typeof space === 'string') {\n\t\t\tindent = space;\n\t\t}\n\t\t\n\t\t// If there is a replacer, it must be a function or an array.\n\t\trep = replacer;\n\t\tif (replacer && typeof replacer !== 'function' &&\n\t\t\t\t(typeof replacer !== 'object' ||\n\t\t\t\t typeof replacer.length !== 'number')) {\n\t\t\tthrow new Error('JSON stringify: invalid replacer');\n\t\t}\n\t\t\n\t\t// Make a fake root object containing our value under the key of ''.\n\t\t// Return the result of stringifying the value.\n\t\treturn str('', {'': value});\n\t};\n\t\n\texports.stringifyDate = function(d) {\n\t\tvar year = d.getUTCFullYear(),\n\t\t\tmonth = d.getUTCMonth() + 1,\n\t\t\tday = d.getUTCDate(),\n\t\t\thours = d.getUTCHours(),\n\t\t\tminutes = d.getUTCMinutes(),\n\t\t\tseconds = d.getUTCSeconds(),\n\t\t\tms = d.getUTCMilliseconds();\n\t\t\n\t\tif (month < 10) { month = '0' + month; }\n\t\tif (day < 10) { day = '0' + day; }\n\t\tif (hours < 10) { hours = '0' + hours; }\n\t\tif (minutes < 10) { minutes = '0' + minutes; }\n\t\tif (seconds < 10) { seconds = '0' + seconds; }\n\t\tif (ms < 10) { ms = '00' + ms; }\n\t\telse if (ms < 100) { ms = '0' + ms; }\n\n\t\treturn '\"' + year\n\t\t\t+ '-' + month\n\t\t\t+ '-' + day\n\t\t\t+ 'T' + hours\n\t\t\t+ ':' + minutes\n\t\t\t+ ':' + seconds\n\t\t\t+ '.' + ms\n\t\t\t+ 'Z\"';\n\t}\n\t\n\t/**\n\t * The parse method takes a text and an optional reviver function, and returns\n\t * a JavaScript value if the text is a valid JSON text.\n\t */\n\texports.parse = function (text, reviver) {\n\t\t// Parsing happens in four stages. In the first stage, we replace certain\n\t\t// Unicode characters with escape sequences. JavaScript handles many characters\n\t\t// incorrectly, either silently deleting them, or treating them as line endings.\n\t\tcx.lastIndex = 0;\n\t\tif (cx.test(text)) {\n\t\t\ttext = text.replace(cx, function (a) {\n\t\t\t\treturn '\\\\u' +\n\t\t\t\t\t('0000' + a.charCodeAt(0).toString(16)).slice(-4);\n\t\t\t});\n\t\t}\n\t\t\n\t\t// In the second stage, we run the text against regular expressions that look\n\t\t// for non-JSON patterns. We are especially concerned with '()' and 'new'\n\t\t// because they can cause invocation, and '=' because it can cause mutation.\n\t\t// But just to be safe, we want to reject all unexpected forms.\n\n\t\t// We split the second stage into 4 regexp operations in order to work around\n\t\t// crippling inefficiencies in IE's and Safari's regexp engines. First we\n\t\t// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we\n\t\t// replace all simple value tokens with ']' characters. Third, we delete all\n\t\t// open brackets that follow a colon or comma or that begin the text. Finally,\n\t\t// we look to see that the remaining characters are only whitespace or ']' or\n\t\t// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.\n\n\t\tif (/^[\\],:{}\\s]*$/\n\t\t\t\t.test(text.replace(/\\\\(?:[\"\\\\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')\n\t\t\t\t.replace(/\"[^\"\\\\\\n\\r]*\"|true|false|null|-?\\d+(?:\\.\\d*)?(?:[eE][+\\-]?\\d+)?/g, ']')\n\t\t\t\t.replace(/(?:^|:|,)(?:\\s*\\[)+/g, '')))\n\t\t{\n\t\t\tvar j = eval('(' + text + ')');\n\t\t\tif(!reviver) {\n\t\t\t\treturn j;\n\t\t\t} else {\n\t\t\t\t// In the optional fourth stage, we recursively walk the new structure, passing\n\t\t\t\t// each name/value pair to a reviver function for possible transformation.\n\t\t\t\tvar walk = function(holder, key) {\n\t\t\t\t\t// The walk method is used to recursively walk the resulting structure so\n\t\t\t\t\t// that modifications can be made.\n\t\t\t\t\tvar k, v, value = holder[key];\n\t\t\t\t\tif (value && typeof value === 'object') {\n\t\t\t\t\t\tfor (k in value) {\n\t\t\t\t\t\t\tif (Object.hasOwnProperty.call(value, k)) {\n\t\t\t\t\t\t\t\tv = walk(value, k);\n\t\t\t\t\t\t\t\tif (v !== undefined) {\n\t\t\t\t\t\t\t\t\tvalue[k] = v;\n\t\t\t\t\t\t\t\t} else {\n\t\t\t\t\t\t\t\t\tdelete value[k];\n\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t\treturn reviver.call(holder, key, value);\n\t\t\t\t}\n\t\t\t\treturn walk({'': j}, '');\n\t\t\t}\n\t\t}\n\n\t\t// If the text is not JSON parseable, then a SyntaxError is thrown.\n\t\tthrow new SyntaxError('JSON.parse');\n\t};\n}());", "filePath": "jsio/std/JSON.js"},
'std.uri': {"src": "jsio('from base import *');\njsio('import logging');\n\nvar logger = logging.getLogger('uri');\n\nvar attrs = [ \n\t\"source\",\n\t\"protocol\",\n\t\"authority\",\n\t\"userInfo\",\n\t\"user\",\n\t\"password\",\n\t\"host\",\n\t\"port\",\n\t\"relative\",\n\t\"path\",\n\t\"directory\",\n\t\"file\",\n\t\"query\",\n\t\"anchor\"\n];\n\nexports.Uri = Class(function(supr) {\n\tthis.init = function(url, isStrict) {\n\t\tvar uriData = exports.parse(url, isStrict)\n\t\tfor (attr in uriData) {\n\t\t\tthis['_' + attr] = uriData[attr];\n\t\t};\n\t};\n  \n\tfor (var i = 0, attr; attr = attrs[i]; ++i) {\n\t\t(function(attr) {\n\t\t\tvar fNameSuffix = attr.charAt(0).toUpperCase() + attr.slice(1);\n\t\t\tthis['get' + fNameSuffix] = function() {\n\t\t\t\treturn this['_' + attr];\n\t\t\t};\n\t\t\tthis['set' + fNameSuffix] = function(val) {\n\t\t\t\tthis['_' + attr] = val;\n\t\t\t};\n\t\t}).call(this, attr);\n\t};\n\n\tthis.toString = this.render = function() {\n\t\t// XXX: implement in terms of the keys. Reasonable fallbacks?\n\t\treturn this._source;\n\t};\n});\n\nexports.buildQuery = function(kvp) {\n\tvar pairs = [];\n\tfor (key in kvp) {\n\t\tpairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(kvp[key]));\n\t}\n\treturn pairs.join('&');\n}\n\n// Regexs are based on parseUri 1.2.2\n// Original: (c) Steven Levithan <stevenlevithan.com>\n// Original: MIT License\n\nvar strictRegex = /^(?:([^:\\/?#]+):)?(?:\\/\\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\\/?#]*)(?::(\\d*))?))?((((?:[^?#\\/]*\\/)*)([^?#]*))(?:\\?([^#]*))?(?:#(.*))?)/;\nvar looseRegex = /^(?:(?![^:@]+:[^:@\\/]*@)([^:\\/?#.]+):)?(?:\\/\\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\\/?#]*)(?::(\\d*))?)(((\\/(?:[^?#](?![^?#\\/]*\\.[^?#\\/.]+(?:[?#]|$)))*\\/?)?([^?#\\/]*))(?:\\?([^#]*))?(?:#(.*))?)/;\nvar queryStringRegex = /(?:^|&)([^&=]*)=?([^&]*)/g;\n\nexports.parse = function(str, isStrict) {\n\tvar regex = isStrict ? strictRegex : looseRegex;\n\tvar result = {};\n\tvar match = regex.exec(str);\n\tfor (var i = 0, attr; attr = attrs[i]; ++i) {\n\t\tresult[attr] = match[i] || \"\";\n\t}\n\t\n\tvar qs = result['queryKey'] = {};\n\tresult['query'].replace(queryStringRegex, function(check, key, val) {\n\t\tif (check) {\n\t\t\tqs[key] = val;\n\t\t}\n\t});\n\t\n\treturn result;\n}\n\nexports.isSameDomain = function(urlA, urlB) {\n\tvar a = exports.parse(urlA);\n\tvar b = exports.parse(urlB);\n\treturn ((a.port == b.port ) && (a.host == b.host) && (a.protocol == b.protocol));\n};\n", "filePath": "jsio/std/uri.js"},
'net.protocols.buffered': {"src": "jsio('from base import *');\n\njsio('import logging');\njsio('from net.interfaces import Protocol');\njsio('from net.buffer import Buffer');\n\nvar logger = logging.getLogger('Buffered');\n\nexports.BufferedProtocol = Class(Protocol, function(supr) {\n\n\tthis.init = function() {\n\t\tthis.buffer = new Buffer();\n\t}\n\n\t// Overwrite this instead of dataReceived in base classes\n\tthis.bufferUpdated = function() {}\n\n\tthis.dataReceived = function(data) {\n\t\tthis.buffer.append(data);\n\t\tthis.bufferUpdated();\n\t}\n\n})", "filePath": "jsio/net/protocols/buffered.js"},
'net': {"src": "jsio('import net.env');\njsio('import std.JSON as JSON');\n\nJSON.createGlobal(); // create the global JSON object if it doesn't already exist\n\nexports.listen = function(server, transportName, opts) {\n\tif (!transportName) {\n\t\tthrow logger.error('No transport provided for net.listen');\n\t}\n\tvar listenerClass = net.env.getListener(transportName);\n\tvar listener = new listenerClass(server, opts);\n\tlistener.listen();\n\treturn listener;\n}\n\nexports.connect = function(protocolInstance, transportName, opts) {\n\tvar connector = new (net.env.getConnector(transportName))(protocolInstance, opts);\n\tconnector.connect();\n\treturn connector;\n}\n\nexports.quickServer = function(protocolClass) {\n\tjsio('import net.interfaces');\n\treturn new net.interfaces.Server(protocolClass);\n}\n", "filePath": "jsio/net.js"},
'net.protocols.mspp': {"src": "jsio('from base import *');\njsio('import net');\njsio('from net.protocols.buffered import BufferedProtocol');\njsio('import logging');\njsio('import std.utf8 as utf8');\n\n/*\nworks like this:\nOPEN\nupstream:\nlength_after_colon:id,0host,port\n\ndownstream:\nlength_after_colon:id,0\n-----\nCLOSE\nupstream:\nlength_after_colon:id,1\n\ndownstream:\nlength_after_colon:id,1errcode\n-----\nDATA\nupstream/downstream:\nlength_after_colon:id,2datadatadata\n*/\n\nvar loggers = {};\nloggers.stream = logging.getLogger('MSPPStream');\nloggers.protocol = logging.getLogger('MSPPProtocol');\n\nvar frames = {\n\t'OPEN':  0,\n\t'CLOSE': 1,\n\t'DATA':  2\n};\n\nexports.MSPPStream = Class(function() {\n\tthis.setMultiplexer = function(multiplexer) {\n\t\tloggers.stream.debug('setMultiplexer: '+multiplexer);\n\t\tthis.multiplexer = multiplexer;\n\t}\n\n\tthis.setEncoding = function(encoding) {\n\t\tloggers.stream.debug('setEncoding: '+encoding);\n\t\tthis.encoding = encoding;\n\t}\n\n\tthis.open = function(host, port, isBinary) {\n\t\tif (isBinary)\n\t\t\tthis.encoding = 'utf8';\n\t\tthis.id = this.multiplexer.openStream(this, host, port);\n\t\tloggers.stream.debug('open '+this.id+\": \"+host+\" \"+port+\" \"+isBinary);\n\t}\n\n\tthis.close = function() {\n\t\tloggers.stream.debug('close '+this.id);\n\t\tthis.multiplexer.close(this.id);\n\t}\n\n\tthis.send = function(data, encoding) {\n\t\tloggers.stream.debug('send '+this.id+\": \"+data+\" \"+encoding);\n\t\tif ((encoding || this.encoding) == 'utf8')\n\t\t\tdata = utf8.encode(data);\n\t\tthis.multiplexer.writeToStream(this.id, data);\n\t}\n\n\tthis._onreadraw = function(data) {\n\t\tif (this.encoding == 'utf8') {\n\t\t\tvar raw = utf8.decode(data);\n\t\t\tvar length = raw[1];\n\t\t\t// TODO: actually buffer this stuff properly\n\t\t\tif (length != data.length) {\n\t\t\t\tthrow new Error(\"Incomplete utf8 codepoint\");\n\t\t\t}\n\t\t\tdata = raw[0]\n\t\t}\n\t\tloggers.stream.debug('_onreadraw '+data);\n\t\tthis.onread(data);\n\t}\n\n\tthis.onopen = function() {}\n\tthis.onclose = function(err) {}\n\tthis.onread = function(data) {}\n});\n\nvar state = {};\nstate.closed = 0;\nstate.connecting = 1;\nstate.consuming = 2;\n\nexports.MSPPProtocol = Class(BufferedProtocol, function(supr) {\n\tthis.init = function() {\n\t\tloggers.protocol.debug('new MSPPProtocol');\n\t\tsupr(this, 'init', []);\n\t\tthis.state = state.closed;\n\t\tthis.transportType = null;\n\t\tthis.transportOptions = null;\n\t\tthis.currentId = 0;\n\t\tthis.streams = {};\n\t\tthis.writeBuffer = [];\n\t}\n\n\tthis.setTransport = function(transportType, transportOptions) {\n\t\tthis.transportType = transportType;\n\t\tthis.transportOptions = transportOptions;\n\t}\n\n\tthis.connectionMade = function(isReconnect) {\n\t\tloggers.protocol.debug('connectionMade');\n\t\tthis.state = state.consuming;\n\t\tfor (var i = 0; i < this.writeBuffer.length; i++)\n\t\t\tthis._write(this.writeBuffer[i]);\n\t\twriteBuffer = [];\n\t}\n\n\tthis.connectionLost = this.connectionFailed = function(reason) {\n\t\tloggers.protocol.debug('closed: '+reason);\n\t\tthis.state = state.closed;\n\t\tfor (stream in this.streams)\n\t\t\tthis.streams[stream].onclose(reason);\n\t}\n\n\tthis.openStream = function(stream, host, port) {\n\t\tif (this.state == state.closed) {\n\t\t\tthis.state = state.connecting;\n\t\t\tnet.connect(this, this.transportType, this.transportOptions);\n\t\t}\n\t\tvar id = ++this.currentId;\n\t\tthis.streams[id] = stream;\n\t\tthis._write([id, frames.OPEN, host+\",\"+port]);\n\t\treturn id;\n\t}\n\n\tthis.closeStream = function(id) {\n\t\tthis._write([id, frames.CLOSE, \"\"]);\n\t}\n\n\tthis.writeToStream = function(id, data) {\n\t\tthis._write([id, frames.DATA, data]);\n\t}\n\n\tthis.bufferUpdated = function() {\n\t\tloggers.protocol.debug(\"bufferUpdated. state: \"+this.state+\". buffer: \"+this.buffer._rawBuffer);\n\t\tif (this.state != state.consuming)\n\t\t\tthrow new Error(\"buffer update in invalid MSPP state: \"+this.state);\n\t\tif (! this.buffer.hasDelimiter(':'))\n\t\t\treturn;\n\t\tvar lStr = this.buffer.peekToDelimiter(':');\n\t\tvar len = parseInt(lStr);\n\t\tif (! this.buffer.hasBytes(len + lStr.length + 1))\n\t\t\treturn;\n\t\tthis.buffer.consumeThroughDelimiter(':');\n\t\tvar streamId = this.buffer.consumeToDelimiter(',');\n\t\tthis.buffer.consumeBytes(1);\n\t\tvar frameType = parseInt(this.buffer.consumeBytes(1));\n\t\tlen -= (streamId.length + 2);\n\t\tstreamId = parseInt(streamId);\n\t\tvar data = this.buffer.consumeBytes(len);\n\t\tswitch(frameType) {\n\t\t\tcase frames.OPEN:\n\t\t\t\tthis.streams[streamId].onopen();\n\t\t\t\tbreak;\n\t\t\tcase frames.CLOSE:\n\t\t\t\tthis.streams[streamId].onclose(data);\n\t\t\t\tbreak;\n\t\t\tcase frames.DATA:\n\t\t\t\tthis.streams[streamId]._onreadraw(data);\n\t\t\t\tbreak;\n\t\t\tdefault:\n\t\t\t\tthrow new Error('invalid MSPP data type!');\n\t\t}\n\t}\n\n\tthis._write = function(data) {\n\t\tif (this.state != state.consuming) {\n\t\t\tloggers.protocol.debug(\"buffering write: \"+data);\n\t\t\tthis.writeBuffer.push(data);\n\t\t\treturn;\n\t\t}\n\t\tvar s = data[0] + \",\" + data[1] + data[2];\n\t\ts = s.length + \":\" + s;\n\t\tloggers.protocol.debug('write: '+s);\n\t\tthis.transport.write(s);\n\t}\n});\n", "filePath": "jsio/net/protocols/mspp.js"},
'util.browserdetect': {"src": "exports.BrowserDetect = new function() {\n\tvar versionSearchString;\n\tvar dataBrowser = [\n\t\t{\n\t\t\tstring: navigator.userAgent,\n\t\t\tsubString: \"Chrome\"\n\t\t},\n\t\t{\n\t\t\tstring: navigator.userAgent,\n\t\t\tsubString: \"OmniWeb\",\n\t\t\tversionSearch: \"OmniWeb/\"\n\t\t},\n\t\t{\n\t\t\tstring: navigator.vendor,\n\t\t\tsubString: \"Apple\",\n\t\t\tidentity: \"Safari\",\n\t\t\tversionSearch: \"Version\"\n\t\t},\n\t\t{\n\t\t\tprop: window.opera,\n\t\t\tidentity: \"Opera\"\n\t\t},\n\t\t{\n\t\t\tstring: navigator.vendor,\n\t\t\tsubString: \"iCab\"\n\t\t},\n\t\t{\n\t\t\tstring: navigator.vendor,\n\t\t\tsubString: \"KDE\",\n\t\t\tidentity: \"Konqueror\"\n\t\t},\n\t\t{\n\t\t\tstring: navigator.userAgent,\n\t\t\tsubString: \"Firefox\"\n\t\t},\n\t\t{\n\t\t\tstring: navigator.vendor,\n\t\t\tsubString: \"Camino\"\n\t\t},\n\t\t{\t\t// for newer Netscapes (6+)\n\t\t\tstring: navigator.userAgent,\n\t\t\tsubString: \"Netscape\"\n\t\t},\n\t\t{\n\t\t\tstring: navigator.userAgent,\n\t\t\tsubString: \"MSIE\",\n\t\t\tidentity: \"IE\",\n\t\t\tversionSearch: \"MSIE\"\n\t\t},\n\t\t{\n\t\t\tstring: navigator.userAgent,\n\t\t\tsubString: \"Gecko\",\n\t\t\tidentity: \"Mozilla\",\n\t\t\tversionSearch: \"rv\"\n\t\t},\n\t\t{ \t\t// for older Netscapes (4-)\n\t\t\tstring: navigator.userAgent,\n\t\t\tsubString: \"Mozilla\",\n\t\t\tidentity: \"Netscape\",\n\t\t\tversionSearch: \"Mozilla\"\n\t\t}\n\t];\n\t\n\tvar dataOS = [\n\t\t{\n\t\t\tstring: navigator.platform,\n\t\t\tsubString: \"Win\",\n\t\t\tidentity: \"Windows\"\n\t\t},\n\t\t{\n\t\t\tstring: navigator.platform,\n\t\t\tsubString: \"Mac\"\n\t\t},\n\t\t{\n\t\t\tstring: navigator.userAgent,\n\t\t\tsubString: \"iPhone\",\n\t\t\tidentity: \"iPhone/iPod\"\n\t\t},\n\t\t{\n\t\t\tstring: navigator.platform,\n\t\t\tsubString: \"Linux\"\n\t\t}\n\t];\n\t\n\tfunction searchString(data) {\n\t\tfor (var i=0,item;item=data[i];i++)\t{\n\t\t\tvar dataString = item.string;\n\t\t\tvar dataProp = item.prop;\n\t\t\titem.identity = item.identity || item.subString;\n\t\t\tversionSearchString = item.versionSearch || item.identity;\n\t\t\tif (dataString) {\n\t\t\t\tif (dataString.indexOf(item.subString) != -1)\n\t\t\t\t\treturn item.identity;\n\t\t\t} else if (dataProp)\n\t\t\t\treturn item.identity;\n\t\t}\n\t}\n\t\n\tfunction searchVersion(dataString) {\n\t\tvar index = dataString.indexOf(versionSearchString);\n\t\tif (index == -1) return;\n\t\treturn parseFloat(dataString.substring(index+versionSearchString.length+1));\n\t}\n\t\n\tthis.browser = searchString(dataBrowser) || \"unknown\";\n\tthis.version = searchVersion(navigator.userAgent)\n\t\t|| searchVersion(navigator.appVersion)\n\t\t|| \"unknown\";\n\tthis.OS = searchString(dataOS) || \"unknown\";\n\tthis.isWebKit = RegExp(\" AppleWebKit/\").test(navigator.userAgent);\n\tthis['is'+this.browser] = this.version;\n};", "filePath": "jsio/util/browserdetect.js"},
'std.utf8': {"src": "/*\nFast incremental JavaScript UTF-8 encoder/decoder, by Jacob Rus.\n\nAPI for decode from Orbited: as far as I know, the first incremental\nJavaScript UTF-8 decoder.\n\nInspired by the observation by Johan Sundstr\u00f6m published at:\nhttp://ecmanaut.blogspot.com/2006/07/encoding-decoding-utf8-in-javascript.html\n\nNote that this code throws an error for invalid UTF-8. Because it is so much\nfaster than previous implementations, the recommended way to do lenient\nparsing is to first try this decoder, and then fall back on a slower lenient\ndecoder if necessary for the particular use case.\n\n--------------------\n\nCopyright (c) 2009 Jacob Rus\n\nPermission is hereby granted, free of charge, to any person\nobtaining a copy of this software and associated documentation\nfiles (the \"Software\"), to deal in the Software without\nrestriction, including without limitation the rights to use,\ncopy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the\nSoftware is furnished to do so, subject to the following\nconditions:\n\nThe above copyright notice and this permission notice shall be\nincluded in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND,\nEXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES\nOF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND\nNONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT\nHOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,\nWHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING\nFROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR\nOTHER DEALINGS IN THE SOFTWARE.\n*/\n//var utf8 = this.utf8 = exports;\n\nexports.UnicodeCodecError = function (message) { \n\tthis.message = message; \n};\n\nvar UnicodeCodecError = exports.UnicodeCodecError;\n\nUnicodeCodecError.prototype.toString = function () {\n\treturn 'UnicodeCodecError' + (this.message ? ': ' + this.message : '');\n};\n\nexports.encode = function (unicode_string) {\n\t// Unicode encoder: Given an arbitrary unicode string, returns a string\n\t// of characters with code points in range 0x00 - 0xFF corresponding to\n\t// the bytes of the utf-8 representation of those characters.\n\ttry {\n\t\treturn unescape(encodeURIComponent(unicode_string));\n\t}\n\tcatch (err) {\n\t\tthrow new UnicodeCodecError('invalid input string');\n\t};\n};\nexports.decode = function (bytes) {\n\t// Unicode decoder: Given a string of characters with code points in\n\t// range 0x00 - 0xFF, which, when interpreted as bytes, are valid UTF-8,\n\t// returns the corresponding Unicode string, along with the number of\n\t// bytes in the input string which were successfully parsed.\n\t//\n\t// Unlike most JavaScript utf-8 encode/decode implementations, properly\n\t// deals with partial multi-byte characters at the end of the byte string.\n\tif (/[^\\x00-\\xFF]/.test(bytes)) {\n\t\tthrow new UnicodeCodecError('invalid utf-8 bytes');\n\t};\n\tvar len, len_parsed;\n\tlen = len_parsed = bytes.length;\n\tvar last = len - 1;\n\t// test for non-ascii final byte. if last byte is ascii (00-7F) we're done.\n\tif (bytes.charCodeAt(last) >= 0x80) {\n\t\t// loop through last 3 bytes looking for first initial byte of unicode\n\t\t// multi-byte character. If the initial byte is 4th from the end, we'll\n\t\t// parse the whole string.\n\t\tfor (var i = 1; i <= 3; i++) {\n\t\t\t// initial bytes are in range C0-FF\n\t\t\tif (bytes.charCodeAt(len - i) >= 0xC0) {\n\t\t\t\tlen_parsed = len - i;\n\t\t\t\tbreak;\n\t\t\t};\n\t\t};\n\t\ttry {\n\t\t\t// if the last few bytes are a complete multi-byte character, parse\n\t\t\t// everything (by setting len_parsed)\n\t\t\tdecodeURIComponent(escape(bytes.slice(len_parsed)));\n\t\t\tlen_parsed = len;\n\t\t}\n\t\tcatch (err) { /* pass */ };\n\t};\n\ttry {\n\t\treturn [\n\t\t\tdecodeURIComponent(escape(bytes.slice(0, len_parsed))),\n\t\t\tlen_parsed\n\t\t];\n\t}\n\tcatch (err) {\n\t\tthrow new UnicodeCodecError('invalid utf-8 bytes');\n\t};\n};\n", "filePath": "jsio/std/utf8.js"}
		
	};
	
	function bind(context, method/*, args... */) {
		var args = Array.prototype.slice.call(arguments, 2);
		return function(){
			method = (typeof method == 'string' ? context[method] : method);
			return method.apply(context, args.concat(Array.prototype.slice.call(arguments, 0)));
		}
	}
	
	jsio = bind(this, importer, null, '');
	jsio.__filename = 'jsio.js';
	jsio.modules = [];
	jsio.setCachedSrc = function(pkg, filePath, src) {
		sourceCache[pkg] = { filePath: filePath, src: src };
	}
	jsio.path = {};
	jsio.setPath = function(path) { jsio.path.__default__ = typeof path == 'string' ? [path] : path; }
	jsio.setEnv = function(env) {
		if(ENV && (env == ENV || env == ENV.name)) { return; }
		
		if(typeof env == 'string') {
			switch(env) {
				case 'node':
					ENV = new ENV_node();
					break;
				case 'browser':
				default:
					ENV = new ENV_browser();
					break;
			}
			ENV.name = env;
		} else {
			ENV = env;
		}
		
		jsio.__env = ENV;
		jsio.__dir = ENV.getCwd();
		if(!jsio.path.__default__) { jsio.setPath(ENV.getPath()); }
	}
	
	if (typeof node !== 'undefined' && typeof process !== 'undefined' && process.version) {
		jsio.setEnv('node');
	} else if (typeof XMLHttpRequest != 'undefined' || typeof ActiveXObject != 'undefined') {
		jsio.setEnv('browser');
	}
	
	// DONE
	
	/*
	function ENV_abstract() {
		this.global = null;
		this.getCwd = function() {};
		this.getPath = function() {};
		this.eval = function(code, path) {};
		this.findModule = function(pathString) {};
		this.log = function(args...) {};
	}
	*/
	
	function ENV_node() {
		var fs = require('fs');
		
		this.global = GLOBAL;
		this.getCwd = process.cwd;
		this.log = function() {
			var msg;
			try {
				process.stdio.writeError(msg = Array.prototype.map.call(arguments, function(a) {
					if ((a instanceof Error) && a.message) {
						return 'Error:' + a.message + '\nStack:' + a.stack + '\nArguments:' + a.arguments;
					}
					return typeof a == 'string' ? a : JSON.stringify(a);
				}).join(' ') + '\n');
			} catch(e) {
				process.stdio.writeError(msg = Array.prototype.join.call(arguments, ' ') + '\n');
			}
			return msg;
		}
		
		this.getPath = function() {
			var segments = __filename.split('/');
			segments.pop();
			return segments.join('/') || '.';
		}
		this.eval = process.compile;
		this.findModule = function(possibilities) {
			for (var i = 0, possible; possible = possibilities[i]; ++i) {
				try {
					possible.src = fs.readFileSync(possible.filePath);
					return possible;
				} catch(e) {
				}
			}
			return false;
		}

		this.require = require;
		this.include = include;
	}
	
	function ENV_browser() {
		var XHR = window.XMLHttpRequest || function() { return new ActiveXObject("Msxml2.XMLHTTP"); }
		
		this.global = window;
		this.global.jsio = jsio;
		
		this.log = function() {
			if(typeof console != 'undefined' && console.log) {
				console.log.apply(console, arguments);
			}
			return Array.prototype.join.call(arguments, ' ');
		}
		
		var cwd = null, path = null;
		this.getCwd = function() {
			if(!cwd) {
				var location = window.location.toString();
				cwd = location.substring(0, location.lastIndexOf('/') + 1);
			}
			return cwd;
		}
		
		this.getPath = function() {
			if(!path) {
				try {
					var filename = new RegExp('(.*?)' + jsio.__filename + '(\\?.*)?$');
					var scripts = document.getElementsByTagName('script');
					for (var i = 0, script; script = scripts[i]; ++i) {
						var result = script.src.match(filename);
						if (result) {
							path = result[1];
							if (/^[A-Za-z]*:\/\//.test(path)) { path = makeRelativePath(path, this.getCwd()); }
							break;
						}
					}
				} catch(e) {}
				
				if(!path) { path = '.'; }
			}
			return path;
		}

		// IE6 won't return an anonymous function from eval, so use the function constructor instead
		var rawEval = typeof eval('(function(){})') == 'undefined'
			? function(src, path) { return (new Function('return ' + src))(); }
			: function(src, path) { var src = src + '\n//@ sourceURL=' + path; return window.eval(src); }

		// provide an eval with reasonable debugging
		this.eval = function(code, path) {
			try { return rawEval(code, path); } catch(e) {
				if(e instanceof SyntaxError) {
					var src = 'javascript:document.open();document.write("<scr"+"ipt src=\'' + path + '\'></scr"+"ipt>")';
					var callback = function() {
						var el = document.createElement('iframe');
						with(el.style) { position = 'absolute'; top = left = '-999px'; width = height = '1px'; visibility = 'hidden'; }
						el.src = src;
						setTimeout(function() {try{document.body.appendChild(el)}catch(e){}}, 0);
					}
					
					if(document.body) { callback(); }
					else { window.addEventListener('load', callback, false); }
					throw new Error("forcing halt on load of " + path);
				}
				throw e;
			}
		}
		
		this.findModule = function(possibilities) {
			for (var i = 0, possible; possible = possibilities[i]; ++i) {
				var xhr = new XHR();
				try {
					xhr.open('GET', possible.filePath, false);
					xhr.send(null);
				} catch(e) {
					ENV.log('e:', e);
					continue; // firefox file://
				}
				
				if (xhr.status == 404 || // all browsers, http://
					xhr.status == -1100 || // safari file://
					// XXX: We have no way to tell in opera if a file exists and is empty, or is 404
					// XXX: Use flash?
					//(!failed && xhr.status == 0 && !xhr.responseText && EXISTS)) // opera
					false)
				{
					continue;
				}
				
				possible.src = xhr.responseText;
				return possible;
			}
			
			return false;
		}
	};
	
	function ensureHasTrailingSlash(str) { return str.length && str.replace(/([^\/])$/, '$1/') || str; }
	function removeTrailingSlash(str) { return str.replace(/\/$/,''); }
	
	function guessModulePath(pathString) {
		// resolve relative paths
		if(pathString.charAt(0) == '.') {
			// count the number of dots
			var i = 0;
			while(pathString.charAt(i + 1) == '.') { ++i; }

			// remove one path segment for each dot from the cwd 
			var prefix = removeTrailingSlash(ENV.getCwd());
			if (i) { prefix = prefix.split('/').slice(0, -i).join('/'); }
			
			return [{filePath: prefix + '/' + pathString.substring(i + 1).split('.').join('/') + '.js'}];
		}
		
		// resolve absolute paths with respect to jsio packages/
		var pathSegments = pathString.split('.'),
			baseMod = pathSegments[0],
			modPath = pathSegments.join('/');
		
		if (baseMod in jsio.path) {
			return [{filePath: ensureHasTrailingSlash(jsio.path[baseMod]) + modPath + '.js'}];
		}
		
		var out = [];
		var paths = typeof jsio.path.__default__ == 'string' ? [jsio.path.__default__] : jsio.path.__default__;
		for (var i = 0, len = paths.length; i < len; ++i) {
			var path = ensureHasTrailingSlash(paths[i]);
			out.push({filePath: path + modPath + '.js', baseMod: baseMod, basePath: path});
		}
		return out;
	}
	
	// load a module from a file
	function loadModule(pathString) {
		var possibilities = guessModulePath(pathString),
			module = ENV.findModule(possibilities);
		if(!module) {
			var paths = [];
			for (var i = 0, p; p = possibilities[i]; ++i) { paths.push(p.filePath); }
			throw new Error("Module not found: " + pathString + " (looked in " + paths.join(', ') + ")");
		}
		
		if (!(module.baseMod in jsio.path)) {
			jsio.path[module.baseMod] = module.basePath;
		}
		
		return module;
	}
	
	function execModule(context, module) {
		var code = "(function(_){with(_){delete _;(function(){" + module.src + "\n}).call(this)}})";
		var fn = ENV.eval(code, module.filePath);
		try {
			fn.call(context.exports, context);
		} catch(e) {
			if(e.type == "stack_overflow") {
				ENV.log("Stack overflow in", module.filePath, ':', e);
			} else {
				ENV.log("error when loading", module.filePath, ':', e);
			}
			throw e;
		}
	};
	
	function resolveRelativePath(pkg, path, pathSep) {
		// does the pkg need to be resolved, i.e. is it a relative path?
		if(!path || (pathSep = pathSep || '.') != pkg.charAt(0)) { return pkg; }
		
		var i = 1;
		while(pkg.charAt(i) == pathSep) { ++i; }
		path = path.split(pathSep).slice(0, -i);
		if(path.length) {
			path = path.join(pathSep);
			if(path.charAt(path.length - 1) != pathSep) { path += pathSep; }
		}
		return path + pkg.substring(i);
	}
	
	function resolveImportRequest(path, request) {
		var match, imports = [];
		if((match = request.match(/^(from|external)\s+([\w.$]+)\s+import\s+(.*)$/))) {

			imports[0] = {
				from: resolveRelativePath(match[2], path),
				external: match[1] == 'external', "import": {}
			};
			
			match[3].replace(/\s*([\w.$*]+)(?:\s+as\s+([\w.$]+))?/g, function(_, item, as) {
				imports[0]["import"][item] = as || item;
			});
		} else if((match = request.match(/^import\s+(.*)$/))) {
			match[1].replace(/\s*([\w.$]+)(?:\s+as\s+([\w.$]+))?,?/g, function(_, pkg, as) {
				fullPkg = resolveRelativePath(pkg, path);
				imports[imports.length] = as ? {from: fullPkg, as: as} : {from: fullPkg, as: pkg};
			});
		} else {
			var msg = 'Invalid jsio request: jsio(\'' + request + '\')';
			throw SyntaxError ? new SyntaxError(msg) : new Error(msg);
		}
		return imports;
	};
	
	function makeContext(pkgPath, filePath) {
		var ctx = {
			exports: {},
			global: ENV.global
		};
		
		ctx.jsio = bind(this, importer, ctx, pkgPath);
		if(pkgPath != 'base') {
			ctx.jsio('from base import *');
			ctx.logging.__create(pkgPath, ctx);
		}
		
		// TODO: FIX for "trailing ." case
		var cwd = ENV.getCwd();
		var i = filePath.lastIndexOf('/');
		
		ctx.jsio.__env = jsio.__env;
		ctx.jsio.__dir = i > 0 ? makeRelativePath(filePath.substring(0, i), cwd) : '';
		ctx.jsio.__filename = i > 0 ? filePath.substring(i) : filePath;
		ctx.jsio.__path = pkgPath;
		return ctx;
	};
	
	function makeRelativePath(path, relativeTo) {
		var i = path.match('^' + relativeTo);
		if (i && i[0] == relativeTo) {
			var offset = path[relativeTo.length] == '/' ? 1 : 0
			return path.slice(relativeTo.length + offset);
		}
		return path;
	};
	
	function importer(context, path, request, altContext) {
		context = context || ENV.global;
		var imports = resolveImportRequest(path, request);
		
		// import each item in the request
		for(var i = 0, item, len = imports.length; (item = imports[i]) || i < len; ++i) {
			var pkg = item.from;
			var modules = jsio.modules;
			
			// eval any packages that we don't know about already
			if(!(pkg in modules)) {
				try {
					var module = sourceCache[pkg] || loadModule(pkg);
				} catch(e) {
					ENV.log('\nError executing \'', request, '\': could not load module', pkg, '\n\tpath:', path, '\n\trequest:', request, '\n');
					throw e;
				}
				
				if(!item.external) {
					var newContext = makeContext(pkg, module.filePath);
					execModule(newContext, module);
					modules[pkg] = newContext.exports;
				} else {
					var newContext = {};
					for(var j in item['import']) {
						newContext[j] = undefined;
					}
					execModule(newContext, module);
					modules[pkg] = newContext;
					for(var j in item['import']) {
						if(newContext[j] === undefined) {
							newContext[j] = ENV.global[j];
						}
					}
				}
			}
			
			var c = altContext || context;
			if(item.as) {
				// remove trailing/leading dots
				var segments = item.as.match(/^\.*(.*?)\.*$/)[1].split('.');
				for(var k = 0, slen = segments.length - 1, segment; (segment = segments[k]) && k < slen; ++k) {
					if(!segment) continue;
					if (!c[segment]) { c[segment] = {}; }
					c = c[segment];
				}
				c[segments[slen]] = modules[pkg];
			} else if(item['import']) {
				if(item['import']['*']) {
					for(var k in modules[pkg]) { c[k] = modules[pkg][k]; }
				} else {
					try {
						for(var k in item['import']) { c[item['import'][k]] = modules[pkg][k]; }
					} catch(e) {
						ENV.log('module: ', modules);
						throw e;
					}
				}
			}
		}
	}
})();

jsio("import Orbited");
