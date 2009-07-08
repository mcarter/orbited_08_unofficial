from twisted.internet import reactor, protocol
from csp.port import CometPort

class Echo(protocol.Protocol):
    def dataReceived(self, data):
        self.transport.write(data)

class EchoFactory(protocol.Factory):
    protocol = Echo

if __name__ == "__main__":
    print "listening CSP@8050"
    reactor.listenWith(CometPort, port=8050, factory=EchoFactory())
    reactor.run()
