from setuptools import setup, find_packages
import os, sys

static_types = [
    '*.js', 
    '*.html',
    '*.css', 
    '*.ico', 
    '*.gif', 
    '*.jpg', 
    '*.png', 
    '*.txt*',
    '*.py',
    '*.template'
]

#if sys.platform != "win32":
#    _install_requires.append("Twisted")

setup(
    name='orbited',
    version='0.8.0beta1',
    author='Michael Carter',
    author_email='CarterMichael@gmail.com',
    url='http://www.orbited.org',
    download_url='http://www.orbited.org/download',
    license='MIT License',
    description='A browser(javascript)->tcp bridge; Comet is used to emulate TCP connections in the browser; Allows you to connect a web browser directly to an IRC or XMPP server, for instance.',
    long_description='',
    packages= find_packages(),
    package_data = {'': reduce(list.__add__, [ '.svn' not in d and [ os.path.join(d[len('orbited')+1:], e) for e in
            static_types ] or [] for (d, s, f) in os.walk(os.path.join('orbited', 'static'))
        ]) },
    zip_safe = False,
    install_requires = ['csp_twisted>=0.2.0', 'Twisted'],
    entry_points = '''
        [console_scripts]
        orbited = orbited.start:main
    ''',
    
    classifiers = [
        'Development Status :: 4 - Beta',
        'Environment :: Console',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: MIT License',
        'Operating System :: OS Independent',
        'Programming Language :: Python',
        'Topic :: Software Development :: Libraries :: Python Modules'
    ],        
)
