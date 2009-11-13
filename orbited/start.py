from twisted.internet import reactor
import config
import logging
import os
import sys
import urlparse

# NB: this is set after we load the configuration at "main".
logger = None

def _import(name):
    module_import = name.rsplit('.', 1)[0]
    return reduce(getattr, name.split('.')[1:], __import__(module_import))

def main(start=True, argv=None):
    try:
        import twisted
    except ImportError:
        print "Orbited requires Twisted, which is not installed. See http://twistedmatrix.com/trac/ for installation instructions."
        sys.exit(1)

    #################
    # This corrects a bug in Twisted 8.2.0 for certain Python 2.6 builds on Windows
    #   Twisted ticket: http://twistedmatrix.com/trac/ticket/3868
    #     -mario
    try:
        from twisted.python import lockfile
    except ImportError:
        from orbited import __path__ as orbited_path
        sys.path.append(os.path.join(orbited_path[0],"hotfixes","win32api"))
        from twisted.python import lockfile
        lockfile.kill = None
    #################
      
  
    from optparse import OptionParser
    parser = OptionParser()
    parser.add_option(
        "-c",
        "--config",
        dest="config",
        default=None,
        help="path to configuration file"
    )
    parser.add_option(
        "-v",
        "--version",
        dest="version",
        action="store_true",
        default=False,
        help="print Orbited version"
    )
    parser.add_option(
        "-p",
        "--profile",
        dest="profile",
        action="store_true",
        default=False,
        help="run Orbited with a profiler"
    )
    parser.add_option(
        "-q",
        "--quickstart",
        dest="quickstart",
        action="store_true",
        default=False,
        help="run Orbited on port 8000 and MorbidQ on port 61613"
    )
    if argv == None:
        argv = sys.argv[1:]
    (options, args) = parser.parse_args(argv)
    if args:
        print 'the "orbited" command does not accept positional arguments. type "orbited -h" for options.'
        sys.exit(1)

    if options.version:
        print "Orbited version: %s" % (version,)
        sys.exit(0)

    if options.quickstart:
        config.map['[listen]'].append('http://:8000')
        config.map['[listen]'].append('stomp://:61613')
        config.map['[access]'][('localhost',61613)] = ['*']
        print "Quickstarting Orbited"
    else:
        # load configuration from configuration
        # file and from command line arguments.
        config.setup(options=options)

    logging.setup(config.map)

    # we can now safely get loggers.
    global logger; logger = logging.get_logger('orbited.start')
  
    ############
    # This crude garbage corrects a bug in twisted
    #   Orbited ticket: http://orbited.org/ticket/111
    #   Twisted ticket: http://twistedmatrix.com/trac/ticket/2447
    # XXX : do we still need this?
    #       -mcarter 9/24/09
#    import twisted.web.http
#    twisted.web.http.HTTPChannel.setTimeout = lambda self, arg: None
#    twisted.web.http.HTTPChannel.resetTimeout = lambda self: None
    ############

        
    # NB: we need to install the reactor before using twisted.
    reactor_name = config.map['[global]'].get('reactor')
    if reactor_name:
        install = _import('twisted.internet.%sreactor.install' % reactor_name)
        install()
        logger.info('using %s reactor' % reactor_name)
        
        
    from twisted.internet import reactor
    from twisted.web import resource
    from twisted.web import server
    from twisted.web import static
#    import orbited.system
        
        
    if 'INDEX' in config.map['[static]']:
        root = static.File(config.map['[static]']['INDEX'])
    else:
        root = resource.Resource()
    static_files = static.File(os.path.join(os.path.dirname(__file__), 'static'))
    root.putChild('static', static_files)
    # Note: hard coding timeout to 120. 
    site = server.Site(root, timeout=120)
    from proxy import ProxyFactory
    import csp
    from csp.twisted.port import CometPort

    reactor.listenWith(CometPort, factory=ProxyFactory(), resource=root, childName='csp')
    _setup_static(root, config.map)
    start_listening(site, config.map, logger)
    
    
    # switch uid and gid to configured user and group.
    if os.name == 'posix' and os.getuid() == 0:
        user = config.map['[global]'].get('user')
        group = config.map['[global]'].get('group')
        if user:
            import pwd
            import grp
            try:
                pw = pwd.getpwnam(user)
                uid = pw.pw_uid
                if group:
                    gr = grp.getgrnam(group)
                    gid = gr.gr_gid
                else:
                    gid = pw.pw_gid
                    gr = grp.getgrgid(gid)
                    group = gr.gr_name
            except Exception, e:
                logger.error('Aborting; Unknown user or group: %s' % e)
                sys.exit(1)
            logger.info('switching to user %s (uid=%d) and group %s (gid=%d)' % (user, uid, group, gid))
            os.setgid(gid)
            os.setuid(uid)
        else:
            logger.error('Aborting; You must define a user (and optionally a group) in the configuration file.')
            sys.exit(1)

    if options.profile:
        import hotshot
        prof = hotshot.Profile("orbited.profile")
        logger.info("running Orbited in profile mode")
        logger.info("for information on profiler, see http://orbited.org/wiki/Profiler")
        prof.runcall(reactor.run)
        prof.close()
    else:
        if start:
            reactor.run()
        else:
            return site


def _setup_static(root, config):
    from twisted.web import static
    for key, val in config['[static]'].items():
        if key == 'INDEX':
            break
        if root.getStaticEntity(key):
            logger.error("cannot mount static directory with reserved name %s" % key)
            sys.exit(-1)
        root.putChild(key, static.File(val))

def start_listening(site, config, logger):
    from twisted.internet import reactor
    from twisted.internet import protocol as protocol_module
    # allow stomp:// URIs to be parsed by urlparse
    urlparse.uses_netloc.append("stomp")
    # allow test server URIs to be parsed by urlparse
    from orbited.servers import test_servers
    for protocol in test_servers:
        urlparse.uses_netloc.append(protocol)

    for addr in config['[listen]']:
        if addr.startswith("stomp"):
            stompConfig = ""
            if " " in addr:
                addr, stompConfig = addr.split(" ",1)
        url = urlparse.urlparse(addr)
        hostname = url.hostname or ''
        if url.scheme == 'stomp':
            logger.info('Listening stomp@%s' % url.port)
            from morbid import get_stomp_factory
            morbid_instance = get_stomp_factory(stompConfig)
            config['morbid_instance'] = morbid_instance
            reactor.listenTCP(url.port, morbid_instance, interface=hostname)
        elif url.scheme == 'http':
            logger.info('Listening http@%s' % url.port)
            reactor.listenTCP(url.port, site, interface=hostname)
        elif url.scheme == 'https':
            from twisted.internet import ssl
            crt = config['[ssl]']['crt']
            key = config['[ssl]']['key']
            try:
                ssl_context = ssl.DefaultOpenSSLContextFactory(key, crt)
            except ImportError:
                raise
            except:
                logger.error("Error opening key or crt file: %s, %s" % (key, crt))
                sys.exit(1)
            logger.info('Listening https@%s (%s, %s)' % (url.port, key, crt))
            reactor.listenSSL(url.port, site, ssl_context, interface=hostname)
        elif url.scheme in test_servers:
            test_factory = protocol_module.ServerFactory()
            test_factory.protocol = test_servers[url.scheme]
            logger.info("Listening %s@%s"%(url.scheme, url.port))
            reactor.listenTCP(url.port, test_factory)
            if url.scheme == 'monitor':
                config['globalVars']['monitoring'] = url.port
        else:
            logger.error("Invalid Listen URI: %s" % addr)
            sys.exit(1)




if __name__ == "__main__":
    main()
