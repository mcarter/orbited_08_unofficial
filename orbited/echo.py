from twisted.internet import reactor, protocol
from csp.twisted.port import CometPort

class Echo(protocol.Protocol):
    def dataReceived(self, data):
        self.transport.write(data)

class EchoFactory(protocol.Factory):
    protocol = Echo

if __name__ == "__main__":
    print "echo listening on CSP@8000"
    reactor.listenWith(CometPort, port=8000, factory=EchoFactory())
    reactor.run()
