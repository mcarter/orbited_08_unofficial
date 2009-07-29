;(function() {

var multiplexer = null;
var id = 0;
var frames = {
    'OPEN':  0,
    'CLOSE': 1,
    'DATA':  2
}

var Multiplexer = function() {
    if (multiplexer != null)
        throw new Error("Multiplexer is a singleton");
    var parseFrames = function() {
        var i = self.buffer.indexOf(',');
        while (i > -1) {
            var len = parseInt(self.buffer.slice(0, i));
            if (self.buffer.length < (len + i + 1))
                return;
            var frame = eval(self.buffer.slice(i + 1, len + i + 1));
            self.buffer = self.buffer.slice(len + i + i);
            var socketId = frame[0];
            self.sockets[socketId].onpacket(frame.slice(1));
            i = self.buffer.indexOf(',');
        }
    }
    self = multiplexer = this;
    self.buffer = "";
    self.sockets = {};
    self.csp = new csp.CometSession();
    self.csp.connect("http://localhost:8050");// XXX: detect properly
    self.csp.onopen = function() {
        for (id in self.sockets)
            self.sockets[id].onopen();
    }
    self.csp.onclose = function(code) {
        multiplexer = null;
        for (id in self.sockets)
            self.sockets[id].onclose(code);
    }
    self.csp.onread = function(data) {
        self.buffer += data;
        parseFrames();
    }
    self.register = function(socket, onopen, onclose, onpacket) {
        self.sockets[socket.id] = {};
        self.sockets[socket.id].socket = socket;
        self.sockets[socket.id].onopen = onopen;
        self.sockets[socket.id].onclose = onclose;
        self.sockets[socket.id].onpacket = onpacket;
        if (self.csp && self.csp.readyState == csp.readyState.open)
            self.write([socket.id, frames.OPEN, socket.addr, socket.port]);
    }
    self.write = function(frame) {
        var output = uneval(frame); // XXX: won't work in opera...
        output = output.length + ',' + output;
        self.csp.write(output);
    }
}

socket = {}
socket.readyState = {
    'initial': 0,
    'opening': 1,
    'open':    2,
    'closing': 3,
    'closed':  4
}

socket.TCPSocket = function() {
    var self = this;
    self.id = ++id;
    self.readyState = socket.readyState.initial;
    self.addr = null;
    self.port = null;
    self.binary = null;
    self.onclose = function(code) {
        console.log("TCPSocket onclose:", code);
    }
    self.onopen = function() {
        console.log("TCPSocket onopen");
    }
    self.onread = function(data) {
        console.log("TCPSocket onread:", data);
    }
    self.open = function(addr, port, isBinary) {
        self.addr = addr;
        self.port = port;
        self.binary = !!isBinary;
        self.readyState = socket.readyState.opening;
        if (multiplexer == null)
            new Multiplexer();
        multiplexer.register(self,
            function() { // onopen
                multiplexer.write([self.id, frames.OPEN, self.addr, self.port]);
            },
            function(code) { // onclose
                self.readyState = socket.readyState.closed;
                self.onclose(code);
            },
            function(frame) { // onpacket
                var frameType = frame[0];
                switch(frameType) {
                    case frames.OPEN:
                        if (self.readyState == socket.readyState.opening) {
                            self.readyState = socket.readyState.open;
                            self.onopen();
                        }
                        break;
                    case frames.CLOSE:
                        self.readyState = socket.readyState.closed;
                        self.onclose(frame[1]);
                        break;
                    case frames.DATA:
                        self.onread(frame[1]);
                        break;
                }
            }
        );
    }
    self.send = function(data) {
        if (self.readyState != socket.readyState.open)
            throw new Error("TCPSocket: invalid readystate!");
        multiplexer.write([self.id, frames.DATA, data]);
    }
}

})();
