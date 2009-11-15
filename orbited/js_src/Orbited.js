jsio('import Class');
jsio('from jsio.protocols.mspp import MSPPStream, MSPPProtocol');

var multiplexer = null;

// autodetect host + port!!!
exports.settings = { 'host': 'localhost', 'port': 8000, 'path': '/csp'};

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
