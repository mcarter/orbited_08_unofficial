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
        print 'connectionMade'
        
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
#        print "write:",data
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

    def closeStream(self, socketId, code, *args):
        if args:
            print self, socketId, code, args
            raise Exception("BAD");
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
#        print 'processFrame', data
        if frameType == FRAME_CLOSE:
            return self.closeStream(socketId, 'UserConnectionReset')
        if frameType == FRAME_DATA:        
#            print 'read', data[0]
            return self.sockets[socketId].transport.write(str(data[0]))
            
        return self.closeStream(socketId, 'ProtocolError')
        
    def dataReceived(self, rawdata=""):
#        print 'dataReceived:',rawdata
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
#        print 'we got frame', frame
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
            out.connectTCP(host, port).addErrback(lambda x: self.closeStream(socketId,'RemoteConnectionFailed'))
            self.buffers[socketId] = []

        # repeat
        self.dataReceived()

class ProxyFactory(protocol.Factory):
    protocol = Incoming

if __name__ == "__main__":
    print "proxy listening on CSP@8050"
    reactor.listenWith(CometPort, port=8050, factory=ProxyFactory())
    reactor.run()
