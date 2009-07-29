from twisted.internet import reactor, protocol
from csp.port import CometPort
from csp.util import json

FRAME_OPEN  = 0
FRAME_CLOSE = 1
FRAME_DATA  = 2

CODES = {
    'InvalidHandshake': 102,
    'UserConnectionReset': 103,
    'RemoteConnectionTimeout': 104,
    'Unauthorized': 106,
    'RemoteConnectionFailed': 108,
    'RemoteConnectionClosed': 109,
    'ProtocolError': 110
}

class Outgoing(protocol.Protocol):
    def __init__(self, incoming, socketId):
        self.incoming = incoming
        self.socketId = socketId

    def connectionMade(self):
        self.incoming.newOutgoing(self)

    def dataReceived(self, data):
        self.incoming.write([self.socketId, FRAME_DATA, data])

    def connectionLost(self, reason):
        self.incoming.closeStream(self.socketId, 'RemoteConnectionClosed')

class Incoming(protocol.Protocol):
    def connectionMade(self):
        self.buffer = ""
        self.buffers = {}
        self.sockets = {}
        self.active = True

    def write(self, rawdata):
        data = json.dumps(rawdata)
        print "write:",data
        self.transport.write("%s,%s"%(len(data), data))

    def connectionLost(self):
        print "connectionLost"
        self.active = False
        self.buffer = ""
        for key in self.buffers.keys():
            del self.buffers[key]
        for key, sock in self.sockets.items():
            del self.sockets[key]
            sock.transport.loseConnection()

    def fatalError(self, msg):
        print "fatal error:",msg
        self.transport.loseConnection()

    def closeStream(self, socketId, code):
        if self.active:
            if socketId in self.sockets:
                self.sockets[socketId].transport.loseConnection()
                del self.sockets[socketId]
            if socketId in self.buffers:
                del self.buffers[socketId]
            self.write([socketId, FRAME_CLOSE, CODES[code]])

    def newOutgoing(self, outgoing):
        key = outgoing.socketId
        self.sockets[key] = outgoing
        self.write([key, FRAME_OPEN])
        for frame in self.buffers[key]:
            self.processFrame(*frame)
        del self.buffers[key]

    def processFrame(self, socketId, frameType, *data):
        if frameType == FRAME_CLOSE:
            return self.closeStream(socketId, 'UserConnectionReset')
        if frameType != FRAME_DATA:
            return self.closeStream(socketId, 'ProtocolError')
        self.sockets[socketId].transport.write(str(data[0]))

    def dataReceived(self, rawdata=""):
        print 'dataReceived:',rawdata
        # extract first frame
        self.buffer += rawdata
        comma = self.buffer.find(',')
        if comma == -1:
            return # wait for more bytes
        size = self.buffer[:comma]
        try:
            size = int(size)
        except:
            return self.fatalError("non-integer frame size")
        end = comma + 1 + size
        if len(self.buffer) < end:
            return # wait for more bytes
        frame, self.buffer = self.buffer[comma+1:end], self.buffer[end:]
        try:
            frame = json.loads(frame)
        except:
            return self.fatalError("cannot parse frame")

        # extract basic frame info
        if len(frame) < 3:
            return self.fatalError("illegal frame")
        socketId, frameType, data = frame[0], frame[1], frame[2:]

        # established stream
        if socketId in self.sockets:
            self.processFrame(*frame)

        # handshake
        else:
            if socketId in self.buffers:
                return self.buffers[socketId].append(frame)
            if frameType != FRAME_OPEN:
                return self.closeStream(socketId, 'ProtocolError')
            try:
                host, port = data
            except:
                return self.closeStream(socketId, 'InvalidHandshake')
            if False: # XXX: here, make sure this connection is allowed
                return self.closeStream(socketId, 'Unauthorized')
            out = protocol.ClientCreator(reactor, Outgoing, self, socketId)
            out.connectTCP(host, port).addErrback(self.closeStream, socketId, 'RemoteConnectionFailed')
            self.buffers[socketId] = []

        # repeat
        self.dataReceived()

class ProxyFactory(protocol.Factory):
    protocol = Incoming

if __name__ == "__main__":
    print "proxy listening on CSP@8050"
    reactor.listenWith(CometPort, port=8050, factory=ProxyFactory())
    reactor.run()
