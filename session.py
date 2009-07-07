from twisted.web import server
from twisted.internet import reactor
import zlib, struct, time

try:
    import json
except ImportError:
    import simplejson as json

# gzip from cherrypy
def _compress(body, compress_level):
    """Compress 'body' at the given compress_level."""
    
    yield '\037\213'      # magic header
    yield '\010'         # compression method
    yield '\0'
    yield struct.pack("<L", long(time.time()))
    yield '\002'
    yield '\377'
    
    crc = zlib.crc32("")
    size = 0
    zobj = zlib.compressobj(compress_level,
                            zlib.DEFLATED, -zlib.MAX_WBITS,
                            zlib.DEF_MEM_LEVEL, 0)
    for line in body:
        size += len(line)
        crc = zlib.crc32(line, crc)
        yield zobj.compress(line)
    yield zobj.flush()
    yield struct.pack("<l", crc)
    yield struct.pack("<L", size & 0xFFFFFFFFL)

def compress(body):
    return "".join([x for x in _compress(body, 6)])

class CSPSession(object):
    def __init__(self, key, request):
        self.key = key
        self.permVars = {
            "rp":"",
            "rs":"",
            "du":30,
            "is":False,
            "i":0,
            "ps":0,
            "p":"",
            "bp":"",
            "bs":"",
            "g":False,
            "se":False,
            "ct":"text/html" # SPEC NOTE: changed this default from text/plain
        }
        self.request = None
        self.prebuffer = ""
        self.buffer = []
        self.sendId = 0
        self.updateVars(request)
        self.durationTimeout = None
        self.intervalTimeout = None

    def updateVars(self, request):
        # SPEC NOTE: ignore any permanent variable that can't be parsed
        for key in self.permVars:
            if key in request.args:
                newVal = request.args.get(key)[0]
                varType = self.permVars[key].__class__
                try:
                    typedVal = varType(newVal)
                    if key == "g" and self.request and self.permVars["g"] != typedVal:
                        # SPEC NOTE: end request that changes encoding mid-stream
                        self.endStream()
                    self.permVars[key] = typedVal
                    if key == "ps":
                        self.prebuffer = " "*typedVal
                except:
                    pass
        ack = request.args.get("a",["-1"])[0]
        try:
            ack = int(ack)
        except ValueError:
            ack = -1
        while self.buffer and ack >= self.buffer[0][0]:
            self.buffer.pop(0)

    def closeCb(self):
        print "CSPSession.closeCb not set!"

    def readCb(self, data):
        print "CSPSession.readCb not set!"

    def setCloseCb(self, cb):
        self.closeCb = cb

    def setReadCb(self, cb):
        self.readCb = cb

    def resetDurationTimeout(self):
        if self.durationTimeout:
            self.durationTimeout.cancel()
            self.durationTimeout = None
        if self.request:
            self.durationTimeout = reactor.callLater(self.permVars["du"], self.durationCb)

    def resetIntervalTimeout(self):
        if self.intervalTimeout:
            self.intervalTimeout.cancel()
            self.intervalTimeout = None
        if self.request and self.permVars["i"] > 0 and self.permVars["is"]:
            self.intervalTimeout = reactor.callLater(self.permVars["i"], self.intervalCb)

    def durationCb(self):
        self.endStream()
        self.resetIntervalTimeout()

    def intervalCb(self):
        self.intervalTimeout = None
        self.sendPackets([])

    def endStream(self):
        self.request.finish()
        self.request = None
        self.resetIntervalTimeout()
        self.resetDurationTimeout()

    def tryCompress(self, data, request=None):
        if request is None:
            request = self.request
        if self.permVars["g"] and "gzip" in (request.getHeader("Accept-Encoding") or ""):
            request.setHeader("Content-Encoding", "gzip")
            return compress(data)
        return data

    def returnNow(self):
        self.request = None
        return tryCompress(self.renderPrebuffer() + self.renderPackets())

    def setCometRequest(self, request):
        self.request = request

        request.setHeader("Content-Type", self.permVars["ct"])
        request.setHeader("Cache-Control", "no-cache, must revalidate")

        # polling
        if self.permVars['du'] == 0: # SPEC NOTE: du=0 overrides is=1
            return returnNow()

        # streaming/long-polling, no immediate response
        if not self.buffer:
            self.resetDurationTimeout()
            self.resetIntervalTimeout()
            return server.NOT_DONE_YET
        
        # streaming
        if self.permVars["is"]:
            request.write(tryCompress(self.renderPrebuffer()))
            self.sendPackets()
            self.resetDurationTimeout()
            return server.NOT_DONE_YET
        # long-polling
        else:
            return returnNow()

    def close(self):
        self.sendPackets([None])
        self.closeCb()

    def write(self, data):
        self.sendId += 1
        self.buffer.append([self.sendId, data])
        if self.request:
            if self.permVars["is"]:
                self.sendPackets([[self.sendId, data]])
            else:
                self.sendPackets()
                # XXX: This may cause transfer-encoding chunked in long polling mode. FIX
                self.request.finish()
                self.request = None

    def sendPackets(self, packets=None):
        self.resetIntervalTimeout()
        self.request.write(tryCompress(self.renderPackets(packets)))

    def renderPrebuffer(self):
        return "%s%s"%(self.prebuffer, self.permVars["p"])

    def renderPackets(self, packets=None):
        if packets is None:
            packets = self.buffer
        sseid = ""
        if self.permVars["se"] and packets:
            sseid = "id: %s\r\n"%(packets[-1][0],)
        sseid += "\r\n"
        return "%s(%s)%s%s"%(self.permVars["bp"], json.dumps(packets), self.permVars["bs"], sseid)
    
    def renderRequest(self, data, request):
        return self.tryCompress("%s(%s)%s"%(self.permVars["rp"], json.dumps(data), self.permVars["rs"]), request)
