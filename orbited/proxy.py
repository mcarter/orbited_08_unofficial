from twisted.internet import reactor, protocol
from csp.port import CometPort
from csp.util import json
from orbited import logging
from orbited.config import map as config

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
    def __init__(self, incoming, socketId, host, port):
        self.incoming = incoming
        self.socketId = socketId
        self.host = host
        self.port = port

    def connectionMade(self):
        self.incoming.newOutgoing(self)

    def dataReceived(self, data):
        self.incoming.write([self.socketId, FRAME_DATA, data])

    def connectionLost(self, reason):
        peer = self.incoming.getPeer()      
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
        
    def write(self, rawdata):
        # XXX: The next line of code can cause an error, like this:
        #       -mcarter 11/8/09
        """
Traceback (most recent call last):
  File "/usr/lib/python2.5/site-packages/Twisted-8.2.0-py2.5-linux-x86_64.egg/twisted/python/log.py", line 84, in callWithLogger
    return callWithContext({"system": lp}, func, *args, **kw)
  File "/usr/lib/python2.5/site-packages/Twisted-8.2.0-py2.5-linux-x86_64.egg/twisted/python/log.py", line 69, in callWithContext
    return context.call({ILogContext: newCtx}, func, *args, **kw)
  File "/usr/lib/python2.5/site-packages/Twisted-8.2.0-py2.5-linux-x86_64.egg/twisted/python/context.py", line 59, in callWithContext
    return self.currentContext().callWithContext(ctx, func, *args, **kw)
  File "/usr/lib/python2.5/site-packages/Twisted-8.2.0-py2.5-linux-x86_64.egg/twisted/python/context.py", line 37, in callWithContext
    return func(*args,**kw)
--- <exception caught here> ---
  File "/usr/lib/python2.5/site-packages/Twisted-8.2.0-py2.5-linux-x86_64.egg/twisted/internet/selectreactor.py", line 146, in _doReadOrWrite
    why = getattr(selectable, method)()
  File "/usr/lib/python2.5/site-packages/Twisted-8.2.0-py2.5-linux-x86_64.egg/twisted/internet/tcp.py", line 463, in doRead
    return self.protocol.dataReceived(data)
  File "proxy.py", line 28, in dataReceived
    self.incoming.write([self.socketId, FRAME_DATA, data])
  File "proxy.py", line 42, in write
    data = json.dumps(rawdata)
  File "build/bdist.linux-x86_64/egg/simplejson/__init__.py", line 230, in dumps
    
  File "build/bdist.linux-x86_64/egg/simplejson/encoder.py", line 200, in encode
    
  File "build/bdist.linux-x86_64/egg/simplejson/encoder.py", line 260, in iterencode
    
exceptions.UnicodeDecodeError: 'utf8' codec can't decode bytes in position 448-450: invalid data
            
        """
        data = json.dumps(rawdata)
        self.transport.write(str(len(data)) + data)

    def connectionLost(self):
        self.logger.debug("connectionLost")
        self.active = False
        self.buffer = ""
        for key in self.buffers.keys():
            del self.buffers[key]
        for key, sock in self.sockets.items():
            del self.sockets[key]
            sock.transport.loseConnection()

    def fatalError(self, msg):
        self.logger.warn(msg)
        self.transport.loseConnection()

    def closeStream(self, socketId, code, *args):
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
        if frameType == FRAME_DATA:        
            return self.sockets[socketId].transport.write(str(data[0]))
            
        return self.closeStream(socketId, 'ProtocolError')
        
    def dataReceived(self, rawdata=""):
        self.logger.debug('dataReceived:',rawdata)
        # extract first frame
        self.buffer += rawdata
        frameBegin = self.buffer.find('[')
        if frameBegin == -1:
            return # wait for more bytes
        try:
            size = int(self.buffer[:frameBegin])
        except:
            return self.fatalError("non-integer frame size")
        frameEnd = frameBegin + size
        if len(self.buffer) < frameEnd:
            return # wait for more bytes
        frame, self.buffer = self.buffer[frameBegin:frameEnd], self.buffer[frameEnd:]
        try:
            frame = json.loads(frame)
            socketId, frameType, data = frame[0], frame[1], frame[2:]
        except:
            return self.fatalError("cannot parse frame")

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

