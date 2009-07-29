;(function() {

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

csp._cb = {};
csp._cb.add = function(cspId, transport) {
    csp._cb["i"+cspId] = {};
    csp._cb["i"+cspId].handshake = function() {
        transport.cbHandshake.apply(transport, arguments);
    }
    csp._cb["i"+cspId].send = function() {
        transport.cbSend.apply(transport, arguments);
    }
    csp._cb["i"+cspId].comet = function() {
        transport.cbComet.apply(transport, arguments);
    }
}

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
        console.log('onopen', self.sessionKey);
    }

    self.onclose = function(code) {
        console.log('onclose', code);
    }

    self.onread = function(data) {
        console.log('onread', data);
    }

    self.connect = function(url) {
        self.readyState = csp.readyState.opening;
        self.url = url;


        transport = new transports.jsonp(self.id, url);


//        transport = new transports.xhr(self.id, url, PARAMS.xhrlongpoll);


        csp._cb.add(self.id, transport);
        transport.onHandshake = function(data) {
            self.readyState = csp.readyState.open;
            self.sessionKey = data.session;
            self.write = transport.send;
            transport.onPacket = self.onread;
            transport.resume(self.sessionKey, 0, 0);
            self.onopen();
        }
        transport.handshake();
    }
}

var Transport = function(cspId, url) {
    this.cspId = cspId;
    this.url = url;
    this.sessionKey = null;
    this.lastEventId = null;
    this.processPackets = function(packets) {
        for (var i = 0; i < packets.length; i++) {
            var p = packets[i];
            if (p === null)
                return this.doClose();
            var ackId = p[0];
            var encoding = p[1];
            var data = p[2];
            if (this.lastEventId != null && ackId <= this.lastEventId)
                continue;
            if (this.lastEventId != null && ackId != this.lastEventId+1)
                throw new Error("CSP Transport Protocol Error");
            this.lastEventId = ackId;
            if (encoding == 1) // percent encoding
                data = unescape(data);
            this.onPacket(data);
        }
    }
    this.resume = function(sessionKey, lastEventId, lastSentId) {
        this.sessionKey = sessionKey;
        this.lastEventId = lastEventId;
        this.lastSentId = lastSentId;
        this.reconnect();
    }
    this.cbHandshake = function(data) {
        console.log("HAND SHOOK:", data);
        this.onHandshake(data);
    }
    this.cbSend = function(data) {
        console.log("SEND STATUS:", data);
        this.lastSentId += 1;
    }
    this.cbComet = function(data) {
        console.log("RECEIVED:", data);
        this.processPackets(data);
        this.reconnect();
    }
    this.toPayload = function(data) {
        return uneval([[this.lastSentId, 1, escape(data)]]); // XXX: firefox only!
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
                var data = eval(xhr[type].responseText);
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
    var doJSONP = function(rType, url) { // add timeout?
        var i = ifr[rType].contentDocument;
        var s = i.createElement("script");
        s.src = self.url + url;
        i.getElementsByTagName('head')[0].appendChild(s);
        killLoadingBar();
    }
    self.handshake = function() {
        window.setTimeout(function() {
            doJSONP("send", "/handshake?rs=;&rp=parent.csp._cb.i" + self.cspId + ".handshake");
        }, 0);
    }
    self.send = function(data) {
        doJSONP("send", "/send?s=" + self.sessionKey + "&rs=;&rp=parent.csp._cb.i" + self.cspId + ".send&d=" + self.toPayload(data));
    }
    self.reconnect = function() {
        window.setTimeout(function() {
            doJSONP("comet", "/comet?bs=;&bp=parent.csp._cb.i" + self.cspId + ".comet&s=" + self.sessionKey + "&a=" + self.lastEventId);
        }, 0);
    }

    document.body.appendChild(ifr.send);
    document.body.appendChild(ifr.comet);
    killLoadingBar();
}

})();
