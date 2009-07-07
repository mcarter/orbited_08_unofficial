import os, uuid
from twisted.web import resource, static
from session import CSPSession

class CSPRootResource(resource.Resource):
    def __init__(self):
        resource.Resource.__init__(self)
        logic = CSPLogicResource(self)
        self.putChild("comet", logic)
        self.putChild("handshake", logic)
        self.putChild("close", logic)
        self.putChild("send", logic)
        self.putChild("reflect", logic)
        self.putChild("static", static.File(os.path.join(os.path.dirname(__file__), 'static')))
        self.sessions = {}

    def setConnectCb(self, cb):
        self.connectCb = cb

    def connectCb(self, session):
        print "%s connected"%(session,)

class CSPLogicResource(resource.Resource):
    def __init__(self, root):
        resource.Resource.__init__(self)
        self.root = root

    def render(self, request):
        path = request.path.rsplit('/',1)[1]
        session = None
        if path != "handshake":
            key = request.args.get("s", [None])[0]
            if key not in self.root.sessions:
                # TODO: error
                return "error! no such session."
            session = self.root.sessions[key]
            session.updateVars(request)
        return getattr(self, "render_%s"%(path,))(session, request)

    def render_comet(self, session, request):
        return session.setCometRequest(request)

    def render_handshake(self, session, request):
        key = "a"#str(uuid.uuid4()).replace('-', '')
        session = CSPSession(key, request)
        self.root.sessions[key] = session
        self.root.connectCb(session)
        return session.renderRequest(key)

    def render_close(self, session, request):
        session.close()
        return "OK"

    def render_send(self, session, request):
        session.readCb(request.args.get("d", [""])[0])
        return "OK"

    def render_reflect(self, session, request):
        return request.args.get("d", [""])[0]
