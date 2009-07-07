from twisted.web import server
from twisted.internet import reactor

try:
    import json
except ImportError:
    import simplejson as json

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
                    self.permVars[key] = varType(newVal)
                    if key == "ps":
                        self.prebuffer = " "*self.permVars[key]
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

    def setDurationTimeout(self):
        if self.durationTimeout:
            self.durationTimeout.cancel()
            self.durationTimeout = None
        self.durationTimeout = reactor.callLater(self.permVars["du"], self.durationCb)

    def resetIntervalTimeout(self):
        if self.intervalTimeout:
            self.intervalTimeout.cancel()
            self.intervalTimeout = None
        if self.request and self.permVars["i"] > 0 and self.permVars["is"]:
            self.intervalTimeout = reactor.callLater(self.permVars["i"], self.intervalCb)

    def durationCb(self):
        self.durationTimeout = None
        self.request.finish()
        self.request = None
        self.resetIntervalTimeout()

    def intervalCb(self):
        self.intervalTimeout = None
        self.sendPackets([])

    def setCometRequest(self, request):
        self.request = request

        request.setHeader("Content-Type", self.permVars["ct"])
        request.setHeader("Cache-Control", "no-cache, must revalidate")

        # polling
        if self.permVars['du'] == 0: # SPEC NOTE: du=0 overrides is=1
            self.request = None
            return self.renderPrebuffer() + self.renderPackets()

        # streaming/long-polling, no immediate response
        if not self.buffer:
            self.setDurationTimeout()
            self.resetIntervalTimeout()
            return server.NOT_DONE_YET
        
        # streaming
        if self.permVars["is"]:
            request.write(self.renderPrebuffer())
            self.sendPackets()
            self.setDurationTimeout()
            return server.NOT_DONE_YET
        # long-polling
        else:
            self.request = None
            return self.renderPrebuffer() + self.renderPackets()

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
        self.request.write(self.renderPackets(packets))

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
    
    def renderRequest(self, data):
        return "%s(%s)%s"%(self.permVars["rp"], json.dumps(data), self.permVars["rs"])
