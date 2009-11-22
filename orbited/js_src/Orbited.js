jsio('import Class');
jsio('import jsio.logging');
jsio('from jsio.protocols.mspp import MSPPStream, MSPPProtocol');

exports.logging = jsio.logging;

// autodetect host + port!!!
exports.settings = { 'host': 'localhost', 'port': 8000, 'path': '/csp'};

var multiplexer = null;
exports.TCPSocket = Class(MSPPStream, function() {
    this.init = function() {
        this.setEncoding('plain');
        if (multiplexer == null) {
            multiplexer = new MSPPProtocol();
            multiplexer.setTransport('csp', {"url": "http://" + exports.settings.host + ":" + exports.settings.port + exports.settings.path});
        }
        this.setMultiplexer(multiplexer);
    }
});
