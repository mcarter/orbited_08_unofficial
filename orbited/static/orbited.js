
var thisScriptName='orbited.js'ed_source={};var pre_jsioImport=[];if(typeof exports=='undefined'){var jsio=window.jsio=bind(this,_jsioImport,window,'');}else{var jsio=GLOBAL.jsio=bind(this,_jsioImport,GLOBAL,'');}
jsio.script_src='jsio.js';var modulePathCache={}
function getModulePathPossibilities(pathString){var segments=pathString.split('.')
var modPath=segments.join('/');var out;if(segments[0]in modulePathCache){out=[[modulePathCache[segments[0]]+'/'+modPath+'.js',null]];}else{out=[];for(var i=0,path;path=jsio.path[i];++i){out.push([path+'/'+modPath+'.js',path]);}}
return out;}
jsio.path=['.'];jsio.__env=typeof node!=='undefined'&&typeof process!=='undefined'&&process.version?'node':'browser';switch(jsio.__env){case'node':var posix=require('posix');var RUNTIME={cwd:process.cwd,argv:process.ARGV,argc:process.ARGC,write:process.stdio.writeError,writeAsync:process.stdio.write,readFile:function(filename){return posix.cat(filename,'utf8');},eval:function(code,location){return process.compile(code,location);}}
break;case'browser':var src=browser_findScript();var segments=src.split('/');var cwd=segments.slice(0,segments.length-2).join('/');if(cwd){jsio.path.push(cwd);}else{cwd='.';};var RUNTIME={cwd:function(){return cwd;},argv:null,argc:null,write:browser_getLog(),writeAsync:browser_getLog(),readFile:function(){},eval:function(src){return eval(src);}}
if(typeof eval('(function(){})')=='undefined'){RUNTIME.eval=function(src){try{eval('jsio.__f='+src);return jsio.__f;}finally{delete jsio.__f;}}}
modulePathCache.jsio=cwd;break;}
function browser_findScript(){try{var scripts=document.getElementsByTagName('script');for(var i=0,script;script=scripts[i];++i){if((script.src==jsio.script_src)||(script.src.slice(script.src.length-jsio.script_src)==jsio.script_src)){return makeAbsoluteURL(script.src,window.location);}}}catch(e){}}
function browser_getLog(){if(typeof console!='undefined'&&console.log){return console.log;}else{return browser_oldLog;}}
function browser_oldLog(){var shouldScroll=document.body.scrollHeight==document.body.scrollTop+document.body.clientHeight;var d=document.createElement('div');document.body.appendChild(d);out=[]
for(var i=0,item;(item=arguments[i])||i<arguments.length;++i){try{out.push(JSON.stringify(item));}catch(e){out.push(item.toString());}}
d.innerHTML=out.join(", ");if(shouldScroll){window.scrollTo(0,10000);}}
function $each(i,context,f){if(!f){f=context;context=this;}
for(var j in i){if(i.hasOwnProperty(j)){f(j,i[j],i);}}}
function bind(context,method){var args=Array.prototype.slice.call(arguments,2);return function(){method=(typeof method=='string'?context[method]:method);return method.apply(context,args.concat(Array.prototype.slice.call(arguments,0)))}};function $setTimeout(f,t){var args=Array.prototype.slice.call(arguments,2);return setTimeout(function(){try{f.apply(this,args);}catch(e){}},t)}
function $setInterval(f,t){var args=Array.prototype.slice.call(arguments,2);return setInterval(function(){try{f.apply(this,args);}catch(e){}},t)}
function Class(parent,proto){if(!parent){throw new Error('parent or prototype not provided');}
if(!proto){proto=parent;}
else if(parent instanceof Array){proto.prototype={};for(var i=0,p;p=parent[i];++i){for(var item in p.prototype){if(!(item in proto.prototype)){proto.prototype[item]=p.prototype[item];}}}
parent=parent[0];}else{proto.prototype=parent.prototype;}
var cls=function(){if(this.init){this.init.apply(this,arguments);}}
cls.prototype=new proto(function(context,method,args){var args=args||[];var target=parent;while(target=target.prototype){if(target[method]){return target[method].apply(context,args);}}
throw new Error('method '+method+' does not exist');});cls.prototype.constructor=cls;return cls;}
var strDuplicate=function(str,num){var out="";for(var i=0;i<num;++i){out+=str;}
return out;}
switch(jsio.__env){case'node':var nodeWrapper={require:require};var stringifyPretty=function(item){return _stringify(true,item,1);}
var stringify=function(item){return _stringify(false,item);}
var _stringify=function(pretty,item,tab){if(item instanceof Array){var str=[];for(var i=0,len=item.length;i<len;++i){str.push(_stringify(pretty,item[i]));}
return'['+str.join(',')+']';}else if(typeof(item)=='object'){var str=[];for(var key in item){var value=key+':'+(pretty?' ':'');if(typeof item[key]=='function'){var def=item[key].toString();var match=def.match(/^function\s+\((.*?)\)/);value+=match?'f('+match[1]+') {...}':'[Function]';}else{value+=_stringify(pretty,item[key],tab+1);}
str.push(value);}
if(pretty&&str.length>1){var spacer=strDuplicate('\t',tab);return'{\n'+spacer+str.join(',\n'+spacer)+'\n'+strDuplicate('\t',tab-1)+'}';}else{return'{'+str.join(',')+'}';}}
return item+"";}
var log=function(){RUNTIME.write(Array.prototype.slice.call(arguments,0).map(stringifyPretty).join(' ')+"\n");}
window=GLOBAL;var compile=function(context,args){try{var fn=RUNTIME.eval("(function(_) { with(_){delete _;(function(){"+args.src+"\n}).call(this)}})",args.location);}catch(e){if(e instanceof SyntaxError){log("Syntax Error loading ",args.location,e);}
throw e;}
try{fn.call(context.exports,context);}catch(e){if(e.type=="stack_overflow"){log("Stack overflow in",args.location,e);}else{log("error when loading",args.location);}
throw e;}
return true;}
var windowCompile=function(context,args){var fn=RUNTIME.eval("(function(_){with(_){with(_.window){delete _;(function(){"+args.src+"\n}).call(this)}}})",args.location);fn.call(context.exports,context);}
var cwd=RUNTIME.cwd();var makeRelative=function(path){var i=path.match('^'+cwd);if(i&&i[0]==cwd){var offset=path[cwd.length]=='/'?1:0
return path.slice(cwd.length+offset);}
return path;}
var getModuleSourceAndPath=function(pathString){var baseMod=pathString.split('.')[0];var paths=getModulePathPossibilities(pathString);var cwd=RUNTIME.cwd()+'/';for(var i=0,path;path=paths[i];++i){var cachePath=path[1];var path=path[0];try{var out={src:RUNTIME.readFile(path).wait(),location:path};if(!(baseMod in modulePathCache)){modulePathCache[baseMod]=cachePath;}
return out;}catch(e){}}
throw new Error("Module not found: "+pathString+"\n(looked in "+paths+")");}
var segments=__filename.split('/');var jsioPath=segments.slice(0,segments.length-2).join('/');if(jsioPath){jsio.path.push(jsioPath);modulePathCache.jsio=jsioPath;}else{modulePathCache.jsio='.';}
jsio.__path=makeRelative(RUNTIME.argv[1]);break;default:var log=browser_getLog();var compile=function(context,args){var code="(function(_){with(_){delete _;(function(){"
+args.src
+"\n}).call(this)}})\n//@ sourceURL="+args.location;try{var fn=RUNTIME.eval(code);}catch(e){if(e instanceof SyntaxError){var src='javascript:document.open();document.write("<scr"+"ipt src=\''
+args.location
+'\'></scr"+"ipt>")';var callback=function(){var el=document.createElement('iframe');with(el.style){position='absolute';top=left='-999px';width=height='1px';visibility='hidden';}
el.src=src;$setTimeout(function(){document.body.appendChild(el);},0);}
if(document.body){callback();}
else{window.addEventListener('load',callback,false);}
throw new Error("forcing halt on load of "+args.location);}
throw e;}
try{fn.call(context.exports,context);}catch(e){log('error when loading '+args.location);throw e;}
return true;}
var windowCompile=function(context,args){var f="(function(_){with(_){with(_.window){delete _;(function(){"+args.src+"\n}).call(this)}}})\n//@ sourceURL="+args.location;var fn=RUNTIME.eval(f);fn.call(context.exports,context);}
var createXHR=function(){return window.XMLHttpRequest?new XMLHttpRequest():window.ActiveXObject?new ActiveXObject("Msxml2.XMLHTTP"):null;}
var getModuleSourceAndPath=function(pathString){if(preloaded_source[pathString]){return preloaded_source[pathString];}
var baseMod=pathString.split('.')[0];var paths=getModulePathPossibilities(pathString);for(var i=0,path;path=paths[i];++i){var cachePath=path[1];var path=path[0];var xhr=createXHR();var failed=false;try{xhr.open('GET',path,false);xhr.send(null);}catch(e){failed=true;}
if(failed||xhr.status==404||xhr.status==-1100||false)
{continue;}
if(!(baseMod in modulePathCache)){modulePathCache[baseMod]=cachePath;}
return{src:xhr.responseText,location:path};}
throw new Error("Module not found: "+pathString+" (looked in "+paths.join(', ')+")");}
var makeRelative=function(path){return path.replace(cwd+'/','').replace(cwd,'');}
jsio.__path=makeRelative(window.location.toString());break;}
jsio.basePath=jsio.path[jsio.path.length-1];var modules={bind:bind,Class:Class,log:log,jsio:jsio};function makeAbsoluteURL(url,location){if(/^[A-Za-z]*:\/\//.test(url)){return url;}
var prefix=location.protocol+'//'+location.host;if(url.charAt(0)=='/'){return prefix+url;}
var result=location.pathname.match(/\/*(.*?\/?)\/*$/);var parts=result?result[1].split('/'):[];parts.pop();var urlParts=url.split('/');while(true){if(urlParts[0]=='.'){urlParts.shift();}else if(urlParts[0]=='..'){urlParts.shift();parts.pop();}else{break;}}
var pathname=parts.join('/');if(pathname)pathname+='/';return prefix+'/'+pathname+urlParts.join('/');}
function resolveRelativePath(pkg,path){if(pkg.charAt(0)=='.'){pkg=pkg.substring(1);var segments=path.split('.');while(pkg.charAt(0)=='.'){pkg=pkg.slice(1);segments.pop();}
var prefix=segments.join('.');if(prefix){return prefix+'.'+pkg;}}
return pkg;}
function _jsioImport(context,path,what){var match,imports=[];if((match=what.match(/^(from|external)\s+([\w.$]+)\s+import\s+(.*)$/))){imports[0]={from:resolveRelativePath(match[2],path),external:match[1]=='external',"import":{}};match[3].replace(/\s*([\w.$*]+)(?:\s+as\s+([\w.$]+))?/g,function(_,item,as){imports[0]["import"][item]=as||item;});}else if((match=what.match(/^import\s+(.*)$/))){match[1].replace(/\s*([\w.$]+)(?:\s+as\s+([\w.$]+))?,?/g,function(_,pkg,as){fullPkg=resolveRelativePath(pkg,path);imports[imports.length]=as?{from:fullPkg,as:as}:{from:fullPkg,as:pkg};});}else{if(SyntaxError){throw new SyntaxError(what);}else{throw new Error("Syntax error: "+what);}}
for(var i=0,item,len=imports.length;(item=imports[i])||i<len;++i){var pkg=item.from;var segments=pkg.split('.');if(!(pkg in modules)){try{var result=getModuleSourceAndPath(pkg);}catch(e){log('Error:',context.jsio.__path,'could not execute: "'+what+'"');throw e;}
var newRelativePath=segments.slice(0,segments.length-1).join('.');if(!item.external){var newContext={exports:{},global:window,bind:bind,Class:Class,$setTimeout:$setTimeout,$setInterval:$setInterval};newContext.jsio=bind(this,_jsioImport,newContext,newRelativePath);for(var j in modules.jsio){newContext.jsio[j]=modules.jsio[j];}
var tmp=result.location.split('/');newContext.jsio.__dir=makeRelative(tmp.slice(0,tmp.length-1).join('/'));newContext.jsio.__path=makeRelative(result.location);newContext.jsio.__env=jsio.__env;newContext.jsio.node=nodeWrapper;compile(newContext,result);modules[pkg]=newContext.exports;}else{var newContext={};newContext['window']={};for(var j in item["import"]){newContext['window'][j]=null;}
windowCompile(newContext,result);modules[pkg]=newContext.window;}}
if(item.as){var segments=item.as.match(/^\.*(.*?)\.*$/)[1].split('.');var c=context;for(var k=0,slen=segments.length-1,segment;(segment=segments[k])&&k<slen;++k){if(!segment)continue;if(!c[segment]){c[segment]={};}
c=c[segment];}
c[segments[slen]]=modules[pkg];}else if(item["import"]){if(item["import"]['*']){for(var k in modules[pkg]){context[k]=modules[pkg][k];}}else{try{for(var k in item["import"]){context[item["import"][k]]=modules[pkg][k];}}catch(e){log('module: ',modules);throw e;}}}}}
var _localContext={};var _jsio=_localContext.jsio=bind(this,_jsioImport,_localContext,'jsio');_jsio('import jsio.env');jsio.listen=function(server,transportName,opts){var listenerClass=_jsio.env.getListener(transportName);var listener=new listenerClass(server,opts);listener.listen();return listener;}
jsio.connect=function(protocolInstance,transportName,opts){var connector=new(_jsio.env.getConnector(transportName))(protocolInstance,opts);connector.connect();return connector;}
jsio.quickServer=function(protocolClass){_jsio('import .interfaces');return new jsio.interfaces.Server(protocolClass);}
for(var i=0,target;target=pre_jsioImport[i];++i){jsio.require(target);}})();"use strict";if(!this.JSON){this.JSON={};}
(function(){function f(n){return n<10?'0'+n:n;}
if(typeof Date.prototype.toJSON!=='function'){Date.prototype.toJSON=function(key){return isFinite(this.valueOf())?this.getUTCFullYear()+'-'+
f(this.getUTCMonth()+1)+'-'+
f(this.getUTCDate())+'T'+
f(this.getUTCHours())+':'+
f(this.getUTCMinutes())+':'+
f(this.getUTCSeconds())+'Z':null;};String.prototype.toJSON=Number.prototype.toJSON=Boolean.prototype.toJSON=function(key){return this.valueOf();};}
var cx=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,escapable=/[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,gap,indent,meta={'\b':'\\b','\t':'\\t','\n':'\\n','\f':'\\f','\r':'\\r','"':'\\"','\\':'\\\\'},rep;function quote(string){escapable.lastIndex=0;return escapable.test(string)?'"'+string.replace(escapable,function(a){var c=meta[a];return typeof c==='string'?c:'\\u'+('0000'+a.charCodeAt(0).toString(16)).slice(-4);})+'"':'"'+string+'"';}
function str(key,holder){var i,k,v,length,mind=gap,partial,value=holder[key];if(value&&typeof value==='object'&&typeof value.toJSON==='function'){value=value.toJSON(key);}
if(typeof rep==='function'){value=rep.call(holder,key,value);}
switch(typeof value){case'string':return quote(value);case'number':return isFinite(value)?String(value):'null';case'boolean':case'null':return String(value);case'object':if(!value){return'null';}
gap+=indent;partial=[];if(Object.prototype.toString.apply(value)==='[object Array]'){length=value.length;for(i=0;i<length;i+=1){partial[i]=str(i,value)||'null';}
v=partial.length===0?'[]':gap?'[\n'+gap+
partial.join(',\n'+gap)+'\n'+
mind+']':'['+partial.join(',')+']';gap=mind;return v;}
if(rep&&typeof rep==='object'){length=rep.length;for(i=0;i<length;i+=1){k=rep[i];if(typeof k==='string'){v=str(k,value);if(v){partial.push(quote(k)+(gap?': ':':')+v);}}}}else{for(k in value){if(Object.hasOwnProperty.call(value,k)){v=str(k,value);if(v){partial.push(quote(k)+(gap?': ':':')+v);}}}}
v=partial.length===0?'{}':gap?'{\n'+gap+partial.join(',\n'+gap)+'\n'+
mind+'}':'{'+partial.join(',')+'}';gap=mind;return v;}}
if(typeof JSON.stringify!=='function'){JSON.stringify=function(value,replacer,space){var i;gap='';indent='';if(typeof space==='number'){for(i=0;i<space;i+=1){indent+=' ';}}else if(typeof space==='string'){indent=space;}
rep=replacer;if(replacer&&typeof replacer!=='function'&&(typeof replacer!=='object'||typeof replacer.length!=='number')){throw new Error('JSON.stringify');}
return str('',{'':value});};}
if(typeof JSON.parse!=='function'){JSON.parse=function(text,reviver){var j;function walk(holder,key){var k,v,value=holder[key];if(value&&typeof value==='object'){for(k in value){if(Object.hasOwnProperty.call(value,k)){v=walk(value,k);if(v!==undefined){value[k]=v;}else{delete value[k];}}}}
return reviver.call(holder,key,value);}
cx.lastIndex=0;if(cx.test(text)){text=text.replace(cx,function(a){return'\\u'+
('0000'+a.charCodeAt(0).toString(16)).slice(-4);});}
if(/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,'@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,']').replace(/(?:^|:|,)(?:\s*\[)+/g,''))){j=eval('('+text+')');return typeof reviver==='function'?walk({'':j},''):j;}
throw new SyntaxError('JSON.parse');};}}());jsio("import orbited");delete jsio;