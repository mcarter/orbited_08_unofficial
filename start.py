from twisted.web import server
from twisted.internet import reactor
from csp import CSPRootResource

def connectCb(session):
    print "%s connected"%(session,)
    def readCb(data):
        print "%s says %s"%(session, data)
        session.write(data)
    session.setReadCb(readCb)

def echo():
    print 'listening to CSPEcho@8050'
    echo = CSPRootResource()
    echo.setConnectCb(connectCb)
    reactor.listenTCP(8050, server.Site(echo))
    reactor.run()

def main():
    print 'listening to CSP@8050'
    reactor.listenTCP(8050, server.Site(CSPRootResource()))
    reactor.run()

if __name__ == "__main__":
    echo()
