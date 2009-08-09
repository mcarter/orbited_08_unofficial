;(function() {
if (!window.console) {
    window.console = {
        log: function() { }
    }
}
var id = 0;
csp = {
    'readyState': {
        'initial': 0,
        'opening': 1,
        'open':    2,
        'closing': 3,
        'closed':  4
    }
};


csp.vars = {
    'poll_interval': 2000 // XXX: make this legit...
};

var PARAMS = {
    'xhrstream':   {"is": "1", "bs": "\n"},
    'xhrpoll':     {"du": "0"},
    'xhrlongpoll': {},
    'sselongpoll': {"bp": "data: ", "bs": "\r\n", "se": "1"},
    'ssestream':   {"bp": "data: ", "bs": "\r\n", "se": "1", "is": "1"}
};

csp.CometSession = function() {
    var self = this;
    self.id = ++id;
    self.url = null;
    self.readyState = csp.readyState.initial;
    self.sessionKey = null;
    var transport = null;

    self.write = function() { throw new Error("invalid readyState"); }

    self.onopen = function() {
//        console.log('onopen', self.sessionKey);
    }

    self.onclose = function(code) {
//        console.log('onclose', code);
    }

    self.onread = function(data) {
//        console.log('onread', data);
    }

    self.connect = function(url, timeout) {
        timeout = (timeout || 10000);
        self.readyState = csp.readyState.opening;
        self.url = url;


        transport = new transports.jsonp(self.id, url);
//        transport = new transports.xhr(self.id, url, PARAMS.xhrlongpoll);

        var handshakeTimer = window.setTimeout(self.close, timeout);
        transport.onHandshake = function(data) {
            console.log('csp onHandshake', data);
            self.readyState = csp.readyState.open;
            self.sessionKey = data.session;
            self.write = transport.send;
            transport.onPacket = self.onread;
            transport.resume(self.sessionKey, 0, 0);
            clearTimeout(handshakeTimer);
            console.log('csp onopen');
            self.onopen();
        }
        transport.handshake();
    }

    self.close = function() {
        transport.close();
        self.readyState = csp.readyState.closed;
        self.onclose();
    }
}

var Transport = function(cspId, url) {
    var self = this;
    self.opened = false;
    self.cspId = cspId;
    self.url = url;
    self.buffer = "";
    self.packetsInFlight = null;
    self.sending = false;
    self.sessionKey = null;
    self.lastEventId = null;
    var handshakeTimer = null;
    var sendTimer = null;
    var cometTimer = null;
    self.processPackets = function(packets) {
        for (var i = 0; i < packets.length; i++) {
            var p = packets[i];
            if (p === null)
                return self.doClose();
            var ackId = p[0];
            var encoding = p[1];
            var data = p[2];
            if (self.lastEventId != null && ackId <= self.lastEventId)
                continue;
            if (self.lastEventId != null && ackId != self.lastEventId+1)
                throw new Error("CSP Transport Protocol Error");
            self.lastEventId = ackId;
            if (encoding == 1) // percent encoding
                data = unescape(data);
            self.onPacket(data);
        }
    }
    self.resume = function(sessionKey, lastEventId, lastSentId) {
        self.sessionKey = sessionKey;
        self.lastEventId = lastEventId;
        self.lastSentId = lastSentId;
        self.reconnect();
    }
    self.send = function(data) {
        self.buffer += data;
        if (!self.packetsInFlight) {
            self.doSend();
        }
    }

    self.close = function() {
        self.opened = false;
        self.stop();
    }
    self.stop = function() {
        clearTimeout(cometTimer);
        clearTimeout(sendTimer);
        clearTimeout(handshakeTimer);
        self.doStop();
    }
    var cometBackoff = 50; // msg
    var backoff = 50;
    self.handshakeCb = function(data) {
        self.onHandshake(data);
        backoff = 50;
    }
    self.handshakeErr = function() {
        cometTimer = setTimeout(self.handshake, backoff);
        backoff *= 2;
    }
    self.sendCb = function() {
        self.packetsInFlight = null;
        if (self.buffer) {
            self.doSend();
        }
        backoff = 50;
    }
    self.sendErr = function() {
        sendTimer = setTimeout(self.doSend, backoff);
        backoff *= 50;
    }
    self.cometCb = function(data) {
        self.processPackets(data);
        self.reconnect();
    }
    self.cometErr = function() {
        cometTimer = setTimeout(self.reconnect, cometBackoff);
        cometBackoff *= 2;
    }
}

var transports = {};

transports.xhr = function(cspId, url, params) {
    var self = this;
    Transport.call(self, cspId, url);
    var interval = params.du == "0" && csp.vars.poll_interval || 0;

    var createXHR = function() {
        try { return new XMLHttpRequest(); } catch(e) {}
        try { return new ActiveXObject('MSXML3.XMLHTTP'); } catch(e) {}
        try { return new ActiveXObject('MSXML2.XMLHTTP.3.0'); } catch(e) {}
        try { return new ActiveXObject('Msxml2.XMLHTTP'); } catch(e) {}
        try { return new ActiveXObject('Microsoft.XMLHTTP'); } catch(e) {}
        throw new Error('Could not find XMLHttpRequest or an alternative.');
    }
    var xhr = {
        'handshake': createXHR(),
        'send':      createXHR(),
        'comet':     createXHR()
    };

    var doXHR = function(type, cb, data) {
        if (true) { // TODO: something in settings...
            try {
                netscape.security.PrivilegeManager.enablePrivilege('UniversalBrowserRead');
            } catch (ex) {alert(ex) }
        }
        xhr[type].open('POST', self.url + "/" + type, true);
        xhr[type].onreadystatechange = function() {
            if (xhr[type].readyState == 4) {
                var data = JSON.parse(xhr[type].responseText);
                if (data)
                    cb.apply(self, [data]);
                else
                    self.reconnect();
            }
        }
        xhr[type].send(data);
    }
    self.handshake = function() {
        var qs = "";
        for (param in params)
            qs += param + "=" + params[param] + "&";
        doXHR("handshake", self.cbHandshake, qs);
    }
    self.send = function(data) {
        doXHR("send", self.cbSend, "s=" + self.sessionKey + "&d=" + self.toPayload(data));
    }
    self.reconnect = function() {
        window.setTimeout(function() {
            doXHR("comet", self.cbComet, "s=" + self.sessionKey + "&a=" + self.lastEventId);
        }, interval);
    }

}
csp._jsonp = {};
var _jsonpId = 0;
function setJsonpCallbacks(cb, eb) {
    csp._jsonp['cb' + (++_jsonpId)] = cb;
    csp._jsonp['eb' + (_jsonpId)] = eb;
    return _jsonpId;
}
function removeJsonpCallback(id) {
    delete csp._jsonp['cb' + id];
    delete csp._jsonp['eb' + id];
}
function getJsonpErrbackPath(id) {
    return 'parent.csp._jsonp.eb' + id;
}
function getJsonpCallbackPath(id) {
    return 'parent.csp._jsonp.cb' + id;
}

transports.jsonp = function(cspId, url) {
    var self = this;
    Transport.call(self, cspId, url);
    var createIframe = function() {
        var i = document.createElement("iframe");
        i.style.display = 'block';
        i.style.width = '0';
        i.style.height = '0';
        i.style.border = '0';
        i.style.margin = '0';
        i.style.padding = '0';
        i.style.overflow = 'hidden';
        i.style.visibility = 'hidden';
        return i;
    }
    var ifr = {
        'bar':   createIframe(),
        'send':  createIframe(),
        'comet': createIframe()
    };

    var killLoadingBar = function() {
        window.setTimeout(function() {
            document.body.appendChild(ifr.bar);
            document.body.removeChild(ifr.bar);
        }, 0);
    }
    var makeRequest = function(rType, url, args, cb, eb, timeout) {
        console.log('makeRequest', rType, url, args, cb, eb, timeout);

        window.setTimeout(function() {
            var doc = ifr[rType].contentDocument;
            var head = doc.getElementsByTagName('head')[0];
            var errorSuppressed = false;
            function errback() {
                var scripts = doc.getElementsByTagName('script');
                var s = doc.getElementsByTagName('script')[0]; s.parentNode.removeChild(s);
                var s = doc.getElementsByTagName('script')[0]; s.parentNode.removeChild(s);
                removeJsonpCallback(jsonpId);
                if (!errorSuppressed && self.opened) {
                    eb.apply(null, arguments);
                }
            }
            function callback() {
                errorSuppressed = true;
                if (self.opened) {
                    cb.apply(null, arguments);
                }
            }
            var jsonpId = setJsonpCallbacks(callback, errback);
    
            url += '?'
            for (key in args) {
                url += key + '=' + args[key] + '&';
            }
            if (rType == "send") {
                url += 'rs=;&rp=' + getJsonpCallbackPath(jsonpId);
            }
            else if (rType == "comet") {
                url += 'bs=;&bp=' + getJsonpCallbackPath(jsonpId);
            }
    
            var s = doc.createElement("script");
            s.src = self.url + url;
            head.appendChild(s);
    
            var s = doc.createElement("script");
            s.innerHTML = getJsonpErrbackPath(jsonpId) + '();'
            head.appendChild(s);
            
            killLoadingBar();
        }, 0);

    }

    self.handshake = function() {
        self.opened = true;
        makeRequest("send", "/handshake", {}, self.handshakeCb, self.handshakeErr, 10);
    }
    self.doSend = function() {
        var args;
        if (!self.packetsInFlight) {
            self.packetsInFlight = self.toPayload(self.buffer)
            self.buffer = "";
        }
        args = { s: self.sessionKey, d: self.packetsInFlight };
        makeRequest("send", "/send", args, self.sendCb, self.sendErr, 10);
    }
    self.reconnect = function() {
        var args = { s: self.sessionKey, a: self.lastEventId }
        makeRequest("comet", "/comet", args, self.cometCb, self.cometErr, 40);
    }
    self.doStop = function() {
    }
    this.toPayload = function(data) {
        var payload = escape(JSON.stringify([[++self.lastSentId, 0, data]])); // XXX: firefox only!
        return payload
    }

    document.body.appendChild(ifr.send);
    document.body.appendChild(ifr.comet);
    killLoadingBar();
}

// Add csp.JSON 
/*
    http://www.JSON.org/json2.js
    2009-06-29

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
    This code should be minified before deployment.
    See http://javascript.crockford.com/jsmin.html

*/


var JSON = {};
csp.JSON = JSON;
csp.CometSession.prototype.JSON = JSON;
(function () {

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function (key) {

            return isFinite(this.valueOf()) ?
                   this.getUTCFullYear()   + '-' +
                 f(this.getUTCMonth() + 1) + '-' +
                 f(this.getUTCDate())      + 'T' +
                 f(this.getUTCHours())     + ':' +
                 f(this.getUTCMinutes())   + ':' +
                 f(this.getUTCSeconds())   + 'Z' : null;
        };

        String.prototype.toJSON =
        Number.prototype.toJSON =
        Boolean.prototype.toJSON = function (key) {
            return this.valueOf();
        };
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;


    function quote(string) {

        escapable.lastIndex = 0;
        return escapable.test(string) ?
            '"' + string.replace(escapable, function (a) {
                var c = meta[a];
                return typeof c === 'string' ? c :
                    '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            }) + '"' :
            '"' + string + '"';
    }


    function str(key, holder) {


        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];


        if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }


        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }


        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':


            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':



            return String(value);

        case 'object':

            if (!value) {
                return 'null';
            }

            gap += indent;
            partial = [];

            if (Object.prototype.toString.apply(value) === '[object Array]') {


                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

                v = partial.length === 0 ? '[]' :
                    gap ? '[\n' + gap +
                            partial.join(',\n' + gap) + '\n' +
                                mind + ']' :
                          '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    k = rep[i];
                    if (typeof k === 'string') {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {


                for (k in value) {
                    if (Object.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

            v = partial.length === 0 ? '{}' :
                gap ? '{\n' + gap + partial.join(',\n' + gap) + '\n' +
                        mind + '}' : '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

    if (typeof JSON.stringify !== 'function') {
        JSON.stringify = function (value, replacer, space) {

            var i;
            gap = '';
            indent = '';


            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }


            } else if (typeof space === 'string') {
                indent = space;
            }


            rep = replacer;
            if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                     typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }

            return str('', {'': value});
        };
    }

    if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {

            var j;

            function walk(holder, key) {

                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }

            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

            if (/^[\],:{}\s]*$/.
test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@').
replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

                j = eval('(' + text + ')');


                return typeof reviver === 'function' ?
                    walk({'': j}, '') : j;
            }

            throw new SyntaxError('JSON.parse');
        };
    }
}());
})();




