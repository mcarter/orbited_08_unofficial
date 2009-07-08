from twisted.web import server
from twisted.internet import reactor
from util import json, compress

class CSPSession(object):
    def __init__(self, key, request, destroySessionCb):
        self.peer = request.client
        self.host = request.host
        self.destroySessionCb = destroySessionCb
        self.key = key
        self.request = None
        self.prebuffer = ""
        self.buffer = []
        self.sendId = 0
        self.durationTimeout = None
        self.intervalTimeout = None
        self.isClosed = False
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
        self.updateVars(request)

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
        if self.isClosed and not self.buffer:
            self.destroySessionCb(self)

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
        self.durationTimeout = None
        self.endStream()

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
            cdata = compress(data)
            if request is self.request or len(cdata) < len(data):
                request.setHeader("Content-Encoding", "gzip")
                return cdata
        return data

    def returnNow(self):
        s = self.tryCompress(self.renderPrebuffer() + self.renderPackets())
        self.request = None
        return s

    def setCometRequest(self, request):
        self.request = request

        request.setHeader("Content-Type", self.permVars["ct"])
        request.setHeader("Cache-Control", "no-cache, must revalidate")

        # polling
        if self.permVars['du'] == 0: # SPEC NOTE: du=0 overrides is=1
            return self.returnNow()

        # streaming/long-polling, no immediate response
        if not self.buffer:
            self.resetDurationTimeout()
            self.resetIntervalTimeout()
            return server.NOT_DONE_YET
        
        # streaming
        if self.permVars["is"]:
            request.write(self.tryCompress(self.renderPrebuffer()))
            self.sendPackets()
            self.resetDurationTimeout()
            return server.NOT_DONE_YET
        # long-polling
        else:
            return self.returnNow()

    def close(self):
        if not self.isClosed:
            self.write(None) # SPEC NOTE: close packet is now data packet with data=None
            self.protocol.connectionLost()
            self.isClosed = True
            if not self.buffer:
                self.destroySessionCb(self)

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
                self.resetDurationTimeout()

    def writeSequence(self, data):
        for datum in data:
            self.write(datum)

    def loseConnection(self):
        self.close()

    def getHost(self):
        return self.host

    def getPeer(self):
        return self.peer

    def read(self, data):
        # TODO: parse packets, throw out duplicates, forward new ones to protocol
        self.protocol.dataReceived(data)

    def sendPackets(self, packets=None):
        self.resetIntervalTimeout()
        self.request.write(self.tryCompress(self.renderPackets(packets)))

    def renderPrebuffer(self):
        return "%s%s"%(self.prebuffer, self.permVars["p"])

    def renderPackets(self, packets=None):
        if packets is None:
            packets = self.buffer
        sseid = "\r\n"
        if self.permVars["se"] and packets:
            sseid = "id: %s\r\n\r\n"%(packets[-1][0],)
        return "%s(%s)%s%s"%(self.permVars["bp"], json.dumps(packets), self.permVars["bs"], sseid)
    
    def renderRequest(self, data, request):
        return self.tryCompress("%s(%s)%s"%(self.permVars["rp"], json.dumps(data), self.permVars["rs"]), request)
