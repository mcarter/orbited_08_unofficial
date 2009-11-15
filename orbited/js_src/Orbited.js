jsio('import Class');
jsio('from jsio.protocols.mspp import MSPPStream, MSPPProtocol');

// autodetect host + port!!!
exports.settings = { 'host': 'localhost', 'port': 8000, 'path': '/csp'};
exports.internal = { 'multiplexer': null };

exports.TCPSocket = Class(MSPPStream, function() {
    this.init = function() {
        this.setEncoding('plain');
        if (exports.internal.multiplexer == null) {
            exports.internal.multiplexer = new MSPPProtocol();
            exports.internal.multiplexer.setTransport('csp', {"url": "http://" + exports.settings.host + ":" + exports.settings.port + exports.settings.path});
        }
        this.setMultiplexer(exports.internal.multiplexer);
    }
});
