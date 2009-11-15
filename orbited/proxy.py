from twisted.internet import reactor, protocol
from orbited import logging
from orbited.config import map as config

"""
works like this:
OPEN
upstream:
length_after_colon:id,0host,port

downstream:
length_after_colon:id,0
-----
CLOSE
upstream:
length_after_colon:id,1

downstream:
length_after_colon:id,1errcode
-----
DATA
upstream/downstream:
length_after_colon:id,2datadatadata
"""

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
    logger = logging.get_logger('proxy.Outgoing')
    def __init__(self, incoming, socketId, host, port):
        self.incoming = incoming
        self.socketId = socketId
        self.host = host
        self.port = port

    def connectionMade(self):
        self.incoming.newOutgoing(self)

    def dataReceived(self, data):
        self.incoming.write(self.socketId, FRAME_DATA, data)

    def connectionLost(self, reason):
        peer = self.incoming.transport.getPeer()      
        self.logger.access('connection closed connection from %s:%s to %s:%d' % (peer.host, peer.port, self.host, self.port))        
        self.incoming.closeStream(self.socketId, 'RemoteConnectionClosed')

class Incoming(protocol.Protocol):
    logger = logging.get_logger('proxy.Incoming')
    def connectionMade(self):
        self.buffer = ""
        self.buffers = {}
        self.sockets = {}
        self.active = True
        self.logger.debug('connectionMade')
        
    def write(self, sid, ftype, data=""):
        s = "%s,%s%s"%(sid, ftype, data)
        s = "%s:%s"%(len(s), s)
        self.logger.debug('write: %s'%(s,))
        self.transport.write(s)

    def connectionLost(self):
        self.logger.debug("connectionLost")
        self.active = False
        self.buffer = ""
        for key in self.buffers.keys():
            del self.buffers[key]
        for key, sock in self.sockets.items():
            del self.sockets[key]
            sock.transport.loseConnection()

    def fatalError(self, msg): # not used right now...
        self.logger.warn(msg)
        self.transport.loseConnection()

    def closeStream(self, socketId, code, *args):
        if self.active:
            if socketId in self.sockets:
                self.sockets[socketId].transport.loseConnection()
                del self.sockets[socketId]
            if socketId in self.buffers:
                del self.buffers[socketId]
            self.write(socketId, FRAME_CLOSE, CODES[code])

    def newOutgoing(self, outgoing):
        key = outgoing.socketId
        self.sockets[key] = outgoing
        self.write(key, FRAME_OPEN)
        for frame in self.buffers[key]:
            self.processFrame(*frame)
        del self.buffers[key]

    def processFrame(self, socketId, frameType, data):
        self.logger.debug('processFrame: %s %s %s'%(socketId, frameType, data))
        if frameType == FRAME_CLOSE:
            return self.closeStream(socketId, 'UserConnectionReset')
        if frameType == FRAME_DATA:        
            return self.sockets[socketId].transport.write(data)
        return self.closeStream(socketId, 'ProtocolError')
        
    def dataReceived(self, rawdata=""):
        self.buffer += rawdata
        self.logger.debug('dataReceived:',rawdata)
        lFlag = self.buffer.find(':')
        if lFlag == -1:
            return # wait for more bytes
        lStr = self.buffer[:lFlag]
        length = int(lStr) + len(lStr) + 1 # total packet length
        if len(self.buffer) < length:
            return # wait for more bytes
        iFlag = self.buffer.find(',')
        socketId = int(self.buffer[lFlag+1:iFlag])
        frameType = int(self.buffer[iFlag+1:iFlag+2])
        data = self.buffer[iFlag+2:length]
        self.buffer = self.buffer[length:]

        # established stream
        if socketId in self.sockets:
            self.processFrame(socketId, frameType, data)

        # handshake
        else:
            if socketId in self.buffers:
                return self.buffers[socketId].append([socketId, frameType, data])
            if frameType != FRAME_OPEN:
                return self.closeStream(socketId, 'ProtocolError')
            try:
                host, port = data.split(',')
                port = int(port)
            except:
                return self.closeStream(socketId, 'InvalidHandshake')
            peer = self.transport.getPeer()
            allowed = False
            for source in config['[access]'].get((host, port), []):
                if source == '*' or source == self.transport.hostHeader:
                    allowed = True
                    break
            if not allowed:
                self.logger.warn('Unauthorized connect from %r:%d to %r:%d' % (peer.host, peer.port, host, port))
                self.closeStream(socketId, 'Unauthorized')
                return
            
            self.logger.access('new connection from %s:%s to %s:%d' % (peer.host, peer.port, host, port))
            out = protocol.ClientCreator(reactor, Outgoing, self, socketId, host, port)
            out.connectTCP(host, port).addErrback(lambda x: self.closeStream(socketId,'RemoteConnectionFailed'))
            self.buffers[socketId] = []

        # repeat
        self.dataReceived()

class ProxyFactory(protocol.Factory):
    protocol = Incoming

