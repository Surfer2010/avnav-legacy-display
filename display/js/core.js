(function(w){'use strict';
var L=w.LegacyDisplay=w.LegacyDisplay||{};
L.VERSION='0.5.1';
L.API_NEW='/api/decoder/gpsV2';L.API_OLD='/viewer/avnav_navi.php?request=gps';L.API_SERVER_TIME='/plugins/user-legacy-display/api/time';L.dataApi=null;
L.now=function(){return new Date().getTime();};
L.xhr=function(method,url,body,cb){var x=new XMLHttpRequest();x.onreadystatechange=function(){if(x.readyState===4)cb(x.status,x.responseText);};x.onerror=function(){cb(0,'');};x.ontimeout=function(){cb(0,'');};x.open(method,url,true);x.timeout=3000;if(method==='POST')x.setRequestHeader('Content-Type','application/x-www-form-urlencoded');x.send(body||null);};
L.parse=function(text){try{return JSON.parse(text);}catch(e){return null;}};
L.normalize=function(obj){if(obj&&obj.status==='OK'&&obj.data)return obj.data;return obj;};
L.loadData=function(cb){
function withServerTime(data,url){
L.xhr('GET',L.API_SERVER_TIME+'?_='+L.now(),null,function(status,text){
var value=L.parse(text);
if(status===200&&value&&value.status==='OK'){
data.__legacyServerTime=value;
}
L.lastData=data;
cb(null,data,url);
});
}
function done(status,text,url){
var p=L.parse(text);
if(status===200&&p){
p=L.normalize(p);
if(p&&typeof p==='object'){
L.dataApi=url;
withServerTime(p,url);
return;
}
}
cb('failed');
}
if(L.dataApi){
L.xhr('GET',L.dataApi+(L.dataApi.indexOf('?')>=0?'&':'?')+'_='+L.now(),null,function(s,t){
done(s,t,L.dataApi);
});
return;
}
L.xhr('GET',L.API_NEW+'?_='+L.now(),null,function(s,t){
var p=L.parse(t);
if(s===200&&p&&p.status==='OK'&&p.data){
L.dataApi=L.API_NEW;
withServerTime(p.data,L.API_NEW);
return;
}
L.xhr('GET',L.API_OLD+'&_='+L.now(),null,function(s2,t2){
done(s2,t2,L.API_OLD);
});
});
};
L.get=function(o,path){var aliases={waterTemp:['transducers.TempWater','transducers.WaterTemperature','waterTemperature','signalk.environment.water.temperature'],dbk:['depthBelowKeel','signalk.environment.depth.belowKeel','depth','waterDepth','depthBelowTransducer','depthBelowSurface','transducers.Depth','transducers.depth','transducers.WaterDepth','signalk.environment.depth.belowTransducer','signalk.environment.depth.belowSurface'],depth:['depth','waterDepth','depthBelowKeel','depthBelowTransducer','depthBelowSurface','transducers.Depth','transducers.depth','transducers.WaterDepth','signalk.environment.depth.belowKeel','signalk.environment.depth.belowTransducer','signalk.environment.depth.belowSurface']};var ps,i,j,c,parts,v;if(path==='sog'){v=L.get(o,'signalk.navigation.speedOverGround');if(v!==null&&!isNaN(Number(v)))return Number(v)*1.943844;v=L.get(o,'speedOverGround');if(v!==null&&!isNaN(Number(v))){if(L.dataApi===L.API_NEW)return Number(v)*1.943844;return Number(v);}v=L.get(o,'speed');if(v!==null&&!isNaN(Number(v))){if(L.dataApi===L.API_NEW)return Number(v)*1.943844;return Number(v);}return null;}ps=aliases[path]||[path];for(i=0;i<ps.length;i++){parts=ps[i].split('.');c=o;for(j=0;j<parts.length;j++){if(c===null||typeof c!=='object'||typeof c[parts[j]]==='undefined'){c=null;break;}c=c[parts[j]];}if(c!==null&&typeof c!=='undefined')return c;}return null;};
L.collect=function(value,path,result){var k,np,t;if(value===null||typeof value==='string'||typeof value==='number'||typeof value==='boolean'){if(path)result[path]={path:path,type:value===null?'null':typeof value,sample:value};return;}if(Object.prototype.toString.call(value)==='[object Array]')return;for(k in value)if(Object.prototype.hasOwnProperty.call(value,k)){np=path?path+'.'+k:k;L.collect(value[k],np,result);}};
L.nautical=function(v,pos,neg,digits){var h=v>=0?pos:neg,a=Math.abs(v),d=Math.floor(a),m=(a-d)*60,mi=Math.floor(m),mf=Math.round((m-mi)*1000);if(mf===1000){mf=0;mi++;}if(mi===60){mi=0;d++;}return ('000'+d).slice(-digits)+'°'+('0'+mi).slice(-2)+'.'+('000'+mf).slice(-3)+"'"+h;};
L.format=function(v,item){
var n,dec=parseInt(item.decimals,10),date,offset,adjusted,totalMinutes,hours,minutes,sign;

if(isNaN(dec))dec=1;

if(item.formatter==='text'){
return v===null||typeof v==='undefined'?'--':String(v);
}

if(item.formatter==='etaServer'){
if(typeof v!=='string'||!v)return'--:--';

date=new Date(v);
if(isNaN(date.getTime()))return'--:--';

offset=Number(
L.get(
L.lastData||{},
'__legacyServerTime.offsetMinutes'
)
);

if(isNaN(offset))offset=0;

adjusted=new Date(
date.getTime()+offset*60000
);

hours=adjusted.getUTCHours();
minutes=adjusted.getUTCMinutes();

return(hours<10?'0':'')+hours+
':'+
(minutes<10?'0':'')+minutes;
}

n=Number(v);

if(v===null||v===''||isNaN(n)){
return dec?'--,-':'--';
}

switch(item.formatter){
case'course':
n=Math.round(n)%360;
if(n<0)n+=360;
return('00'+n).slice(-3);

case'directionRad':
n=n*180/Math.PI;
n=Math.round(n)%360;
if(n<0)n+=360;
return('00'+n).slice(-3);

case'angleRad':
n=n*180/Math.PI;
while(n>180)n-=360;
while(n<-180)n+=360;
return(n<0?'-':'+')+
('00'+Math.abs(Math.round(n))).slice(-3);

case'speedMpsKn':
n*=1.943844;
break;

case'distanceNm':
n/=1852;
dec=n<1?2:1;
break;

case'duration':
if(n<0)return'--:--';
totalMinutes=Math.round(n/60);
hours=Math.floor(totalMinutes/60);
minutes=totalMinutes%60;
return(hours<10?'0':'')+hours+
':'+
(minutes<10?'0':'')+minutes;

case'xteMeters':
sign=n>0?'+':n<0?'-':'';
return sign+Math.round(Math.abs(n));

case'depthAdaptive':
dec=n<1?2:(n<10?1:0);
break;

case'kelvin':
n-=273.15;
break;

case'pascalHpa':
n/=100;
break;

case'percent':
n*=100;
break;

case'latitude':
return L.nautical(n,'N','S',2);

case'longitude':
return L.nautical(n,'E','W',3);
}

return n.toFixed(dec).replace('.',',');
};
L.setText=function(e,t){if(!e)return;if((e.textContent!==undefined?e.textContent:e.innerText)!==t){if(e.textContent!==undefined)e.textContent=t;else e.innerText=t;}};
L.scale=function(e,c,ds,is,cat){var t=e.parentNode,h=t?t.getElementsByClassName('header')[0]:null,w=t?(t.clientWidth||t.offsetWidth||0):0,th=t?(t.clientHeight||t.offsetHeight||0):0,hh=h?(h.offsetHeight||h.clientHeight||34):34,vw=e.clientWidth||e.offsetWidth||w,vh=th-hh-8,f={small:.88,medium:1,large:1.08,hero:1.16}[cat]||1,s;c=parseInt(c,10)||6;ds=parseFloat(ds);is=parseFloat(is);if(isNaN(ds))ds=1;if(isNaN(is))is=1;ds=Math.max(.6,Math.min(1.4,ds));is=Math.max(.6,Math.min(1.4,is));if(w<40)w=window.innerWidth||document.documentElement.clientWidth||800;if(th<50)th=Math.max(120,Math.floor((window.innerHeight||600)*.25));if(vw<40)vw=w;if(vh<40)vh=Math.max(80,th-hh-8);s=Math.floor(Math.min((vw-12)*1.55/c,vh*.72)*f*ds*is);s=Math.max(20,Math.min(220,s));e.style.fontSize=s+'px';e.style.height=vh+'px';e.style.lineHeight=vh+'px';e.style.textAlign='center';e.style.display='block';e.style.width='100%';};
})(window);


/*
 * Pluginversion automatisch im System-Button anzeigen.
 * Klassisches XMLHttpRequest für alte Browser einschließlich Android 4.4.
 */
(function(){
    function showLegacyDisplayVersion(){
        var request;
        var buttons;
        var i;
        var data;

        try{
            request=new XMLHttpRequest();

            request.onreadystatechange=function(){
                if(request.readyState!==4){
                    return;
                }

                if(request.status!==200){
                    return;
                }

                try{
                    data=JSON.parse(request.responseText);
                }catch(error){
                    return;
                }

                if(!data||!data.version){
                    return;
                }

                buttons=document.getElementsByClassName('nav-system');

                for(i=0;i<buttons.length;i++){
                    buttons[i].innerHTML=
                        'System v'+data.version;
                }
            };

            request.open(
                'GET',
                '../plugin.json?_='+(new Date().getTime()),
                true
            );

            request.send(null);
        }catch(error){
            /* Button bleibt bei Fehler einfach als "System" stehen. */
        }
    }

    if(document.readyState==='loading'){
        document.addEventListener(
            'DOMContentLoaded',
            showLegacyDisplayVersion,
            false
        );
    }else{
        showLegacyDisplayVersion();
    }
})();
