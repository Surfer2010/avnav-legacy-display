(function(w){'use strict';var L=w.LegacyDisplay,BASE='../api/',KEY='legacyDisplayConfigV3',CAT='legacyDisplayCatalogV3';
var S=L.Storage={mode:'local',features:{serverConfig:false,valueHistory:false}};
function localGet(k,fb){try{var v=localStorage.getItem(k);return v?JSON.parse(v):fb;}catch(e){return fb;}}
function localSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){return false;}}
S.detect=function(cb){L.xhr('GET',BASE+'capabilities?_='+L.now(),null,function(s,t){var p=L.parse(t);if(s===200&&p&&p.status==='OK'){S.mode='server';S.features=p.features||{};}cb(S.mode);});};
S.loadDefaults=function(cb){L.xhr('GET','../defaults/dashboards.json?_='+L.now(),null,function(s,t){cb(s===200?L.parse(t):null);});};
S.loadConfig=function(cb){if(S.mode==='server'){L.xhr('GET',BASE+'config?_='+L.now(),null,function(s,t){var p=L.parse(t);cb(p&&p.config?p.config:null);});}else{var c=localGet(KEY,null);if(c)cb(c);else S.loadDefaults(cb);}};
S.saveConfig=function(c,cb){if(S.mode==='server'){L.xhr('POST',BASE+'saveConfig','config='+encodeURIComponent(JSON.stringify(c)),function(s,t){var p=L.parse(t);cb(!!(p&&p.status==='OK'),p);});}else cb(localSet(KEY,c),null);};
S.loadCatalog=function(cb){if(S.mode==='server'){L.xhr('GET',BASE+'catalog?_='+L.now(),null,function(s,t){var p=L.parse(t);cb(p&&p.catalog?p.catalog:{});});}else cb(localGet(CAT,{}));};
S.saveCatalog=function(c,cb){if(S.mode==='server'){L.xhr('POST',BASE+'saveCatalog','catalog='+encodeURIComponent(JSON.stringify(c)),function(s,t){var p=L.parse(t);cb(!!(p&&p.status==='OK'),p);});}else cb(localSet(CAT,c),null);};
S.exportConfig=function(c){return JSON.stringify(c,null,2);};
})(window);
