(function(w){
'use strict';

var L=w.LegacyDisplay;
var last=0;
var running=false;
var timer=null;
var dashboard=null;

function state(ok,text){
    var e=document.getElementById('connection-state');

    L.setText(e,text);

    document.body.className=
        document.body.className
            .replace(/\s?is-offline/g,'')
            .replace(/\s?is-online/g,'')+
        (ok?' is-online':' is-offline');
}

function getRowPlan(page,itemCount){
    var result=[];
    var remaining=itemCount;

    /*
     * Anker:
     * erste Zeile ein Element
     * zweite Zeile zwei Elemente
     */
    if(page==='anchor'){
        if(remaining>0){
            result.push(1);
            remaining--;
        }

        if(remaining>0){
            result.push(Math.min(2,remaining));
            remaining-=Math.min(2,remaining);
        }

        while(remaining>0){
            result.push(Math.min(2,remaining));
            remaining-=Math.min(2,remaining);
        }

        return result;
    }

    /*
     * Navigation:
     * vier Zeilen mit je zwei Elementen
     */
    if(page==='navigation'){
        while(remaining>0){
            result.push(Math.min(2,remaining));
            remaining-=Math.min(2,remaining);
        }

        return result;
    }

    /*
     * Umwelt und System:
     * jeweils zwei Elemente pro Zeile
     */
    while(remaining>0){
        result.push(Math.min(2,remaining));
        remaining-=Math.min(2,remaining);
    }

    return result;
}

function build(d){
    var box=document.getElementById('dashboard');
    var page=document.body.getAttribute('data-page');
    var plan=getRowPlan(page,d.items.length);
    var itemIndex=0;
    var rowIndex;
    var columnIndex;
    var count;
    var row;
    var it;
    var tile;
    var header;
    var value;
    var size;

    dashboard=d;

    /*
     * Die Ankerseite besitzt ein festes 1+2-Raster im HTML.
     * Werte werden weiterhin durch update() aktualisiert.
     */
    if(page==='anchor'&&box.getElementsByClassName('tile').length===3){
        setTimeout(scaleAll,20);
        setTimeout(scaleAll,250);
        return;
    }

    box.innerHTML='';

    for(rowIndex=0;rowIndex<plan.length;rowIndex++){
        count=plan[rowIndex];

        row=document.createElement('div');
        row.className='dashboard-row row-'+(rowIndex+1);
        row.setAttribute('data-columns',String(count));

        box.appendChild(row);

        for(columnIndex=0;columnIndex<count;columnIndex++){
            if(itemIndex>=d.items.length){
                break;
            }

            it=d.items[itemIndex];
            itemIndex++;
            size=it.size||'medium';

            tile=document.createElement('section');
            tile.className='tile '+size;
            tile.setAttribute('data-id',it.id);

            header=document.createElement('div');
            header.className='header';
            header.innerHTML=
                '<span class="label"></span>'+
                '<span class="unit"></span>';

            value=document.createElement('div');
            value.className='value';
            value.setAttribute('data-path',it.path||'');
            value.setAttribute('data-role',it.role||'generic');
            value.setAttribute(
                'data-formatter',
                it.formatter||'number'
            );
            value.setAttribute(
                'data-decimals',
                String(it.decimals)
            );
            value.setAttribute(
                'data-max-chars',
                String(it.maxChars||6)
            );
            value.setAttribute('data-size',size);
            value.setAttribute(
                'data-value-scale',
                String(
                    typeof it.valueScale==='number'?
                    it.valueScale:
                    1
                )
            );

            L.setText(
                header.getElementsByClassName('label')[0],
                it.label||it.path
            );

            L.setText(
                header.getElementsByClassName('unit')[0],
                it.unit||''
            );

            L.setText(value,'--');

            tile.appendChild(header);
            tile.appendChild(value);
            row.appendChild(tile);
        }
    }

    setTimeout(scaleAll,20);
    setTimeout(scaleAll,250);
}

function scaleAll(){
    var es=document.getElementsByClassName('value');
    var i;
    var dashboardScale=
        dashboard&&typeof dashboard.valueScale==='number'?
        dashboard.valueScale:
        1;

    for(i=0;i<es.length;i++){
        L.scale(
            es[i],
            es[i].getAttribute('data-max-chars'),
            dashboardScale,
            es[i].getAttribute('data-value-scale'),
            es[i].getAttribute('data-size')
        );
    }
}

function twoDigits(value){
    return value<10?'0'+value:String(value);
}

function formatClockValue(value){
    var match;
    var date;
    var number;

    if(value===null||typeof value==='undefined'||value===''){
        return null;
    }

    /*
     * Bereits formatierte Zeit, beispielsweise 14:23 oder 14:23:17.
     */
    if(typeof value==='string'){
        match=value.match(/(?:T|^)([0-2][0-9]):([0-5][0-9])(?::[0-5][0-9])?/);

        if(match){
            return match[1]+':'+match[2];
        }
    }

    /*
     * Unix-Zeit in Sekunden oder Millisekunden.
     */
    number=Number(value);

    if(!isNaN(number)&&number>1000000000){
        if(number<100000000000){
            number=number*1000;
        }

        date=new Date(number);

        if(!isNaN(date.getTime())){
            return twoDigits(date.getHours())+':'+
                twoDigits(date.getMinutes());
        }
    }

    /*
     * ISO-Datum oder ein anderes von Date verstandenes Zeitformat.
     */
    date=new Date(value);

    if(!isNaN(date.getTime())){
        return twoDigits(date.getHours())+':'+
            twoDigits(date.getMinutes());
    }

    return null;
}

function getAvnavTime(data){
    var paths=[
        'signalk.navigation.datetime',
        'signalk.navigation.gnss.datetime',
        'navigation.datetime',
        'gpsTime',
        'gps.time',
        'utcTime',
        'utc',
        'dateTime',
        'datetime',
        'timestamp',
        'time'
    ];
    var i;
    var value;
    var formatted;
    var now;

    for(i=0;i<paths.length;i++){
        value=L.get(data,paths[i]);
        formatted=formatClockValue(value);

        if(formatted!==null){
            return formatted;
        }
    }

    /*
     * Fallback: Uhrzeit des Anzeigegerätes.
     */
    now=new Date();

    return twoDigits(now.getHours())+':'+
        twoDigits(now.getMinutes());
}

function update(data){
    var es=document.getElementsByClassName('value');
    var i;
    var element;
    var path;
    var raw;
    var role;
    var depth=false;
    var item;

    for(i=0;i<es.length;i++){
        element=es[i];
        path=element.getAttribute('data-path');
        role=element.getAttribute('data-role');
        if(
            role==='clock'||
            path==='__localTime'||
            path==='__avnavTime'
        ){
            raw=getAvnavTime(data);
        }else{
            raw=L.get(data,path);
        }

        item={
            formatter:element.getAttribute('data-formatter'),
            decimals:element.getAttribute('data-decimals')
        };

        if(role==='depth'&&raw!==null){
            depth=true;
        }

        L.setText(element,L.format(raw,item));
    }

    last=L.now();

    if(
        document.body.getAttribute('data-page')==='anchor' &&
        !depth
    ){
        state(true,'KEINE TIEFENDATEN');
    }else{
        state(true,'DATEN AKTUELL');
    }
}

function poll(){
    if(running){
        return;
    }

    running=true;

    L.loadData(function(err,data){
        running=false;

        if(err){
            if(L.now()-last>3000){
                state(false,'KEINE VERBINDUNG');
            }

            return;
        }

        update(data);
    });
}

function start(config){
    var page=document.body.getAttribute('data-page');
    var currentDashboard=
        config&&config.dashboards?
        config.dashboards[page]:
        null;
    var anchorItems;
    var anchorIndex;
    var anchorHasWind=false;

    /*
     * Kompatibilitäts-Fallback:
     * Alte gespeicherte Anker-Konfigurationen enthalten teilweise
     * nur DBK und SOG. In diesem Fall WIND zur Laufzeit ergänzen.
     */
    if(page==='anchor'&&currentDashboard){
        anchorItems=currentDashboard.items||[];

        for(anchorIndex=0;anchorIndex<anchorItems.length;anchorIndex++){
            if(
                anchorItems[anchorIndex].id==='wind-anchor'||
                anchorItems[anchorIndex].role==='wind'||
                anchorItems[anchorIndex].label==='WIND'
            ){
                anchorHasWind=true;
                break;
            }
        }

        if(!anchorHasWind){
            anchorItems.push({
                id:'wind-anchor',
                path:'signalk.environment.wind.speedTrue',
                role:'speed',
                label:'WIND',
                unit:'kn',
                formatter:'speedMpsKn',
                decimals:1,
                size:'large',
                maxChars:5,
                valueScale:1
            });

            currentDashboard.items=anchorItems;
        }
    }

    if(!currentDashboard){
        state(false,'KEINE KONFIGURATION');
        return;
    }

    build(currentDashboard);
    poll();

    timer=setInterval(
        poll,
        Math.max(
            250,
            parseInt(currentDashboard.updateInterval,10)||1000
        )
    );

    setInterval(function(){
        if(L.now()-last>3000){
            state(false,'KEINE VERBINDUNG');
        }
    },1000);
}

function init(){
    L.Storage.detect(function(){
        L.Storage.loadConfig(start);
    });
}

if(w.addEventListener){
    w.addEventListener('resize',scaleAll,false);
}

if(document.readyState==='loading'){
    document.addEventListener(
        'DOMContentLoaded',
        init,
        false
    );
}else{
    init();
}

})(window);
