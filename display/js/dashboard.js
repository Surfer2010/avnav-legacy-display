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


function navigationSetValueAttributes(
    value,
    it,
    inlineUnit
){
    var size=it.size||'medium';

    value.className=
        'value'+
        (inlineUnit?' nav-inline-value':'');

    value.setAttribute(
        'data-path',
        it.path||''
    );

    value.setAttribute(
        'data-role',
        it.role||'generic'
    );

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

    value.setAttribute(
        'data-size',
        size
    );

    value.setAttribute(
        'data-value-scale',
        String(
            typeof it.valueScale==='number'?
            it.valueScale:
            1
        )
    );

    if(inlineUnit){
        value.setAttribute(
            'data-inline-unit',
            it.unit||''
        );

        value.innerHTML=
            '<span class="nav-inline-number">--</span>'+
            '<span class="nav-inline-unit"></span>';

        L.setText(
            value.getElementsByClassName(
                'nav-inline-unit'
            )[0],
            it.unit||''
        );
    }else{
        L.setText(value,'--');
    }
}


function navigationAddHeaderRow(
    table,
    rowClass,
    leftText,
    rightText
){
    var row=document.createElement('tr');
    var left=document.createElement('td');
    var right=document.createElement('td');
    var leftLabel=document.createElement('span');
    var rightLabel=document.createElement('span');

    row.className=rowClass;

    left.className='nav-head-cell';
    right.className='nav-head-cell';

    leftLabel.className='nav-head-label';
    rightLabel.className='nav-head-label';

    L.setText(leftLabel,leftText);
    L.setText(rightLabel,rightText);

    left.appendChild(leftLabel);
    right.appendChild(rightLabel);

    row.appendChild(left);
    row.appendChild(right);

    table.appendChild(row);
}


function navigationAddTargetHeaderRow(
    table,
    rowClass
){
    var row=document.createElement('tr');
    var left=document.createElement('td');
    var right=document.createElement('td');

    row.className=rowClass;

    left.className='nav-head-cell';
    right.className='nav-head-cell';

    left.innerHTML=
        '<span class="nav-head-label">'+
        'ZUM <strong>WEGPUNKT</strong>'+
        '</span>';

    right.innerHTML=
        '<span class="nav-head-label">'+
        'ZUM <strong>ZIEL</strong>'+
        '</span>';

    row.appendChild(left);
    row.appendChild(right);

    table.appendChild(row);
}


function navigationAddValueCell(
    row,
    it,
    sideUnit,
    inlineUnit
){
    var cell=document.createElement('td');
    var value=document.createElement('div');
    var unit;

    cell.setAttribute(
        'data-id',
        it.id||''
    );

    navigationSetValueAttributes(
        value,
        it,
        inlineUnit
    );

    cell.appendChild(value);

    if(sideUnit){
        unit=document.createElement('span');
        unit.className='nav-side-unit';

        L.setText(
            unit,
            it.unit||''
        );

        cell.appendChild(unit);
    }

    row.appendChild(cell);
}


function navigationAddValueRow(
    table,
    rowClass,
    leftItem,
    rightItem,
    sideUnits,
    inlineUnits
){
    var row=document.createElement('tr');

    row.className=
        rowClass+' nav-value-row';

    navigationAddValueCell(
        row,
        leftItem,
        sideUnits,
        inlineUnits
    );

    navigationAddValueCell(
        row,
        rightItem,
        sideUnits,
        inlineUnits
    );

    table.appendChild(row);
}


function buildNavigationV2(d,box){
    var table=document.createElement('table');
    var items=d.items||[];

    if(items.length<8){
        state(
            false,
            'NAVIGATION KONFIGURATION UNVOLLSTAENDIG'
        );
        return;
    }

    box.innerHTML='';

    table.className='navigation-table';

    navigationAddHeaderRow(
        table,
        'nav-head-brg',
        items[0].label||'BRG',
        items[1].label||'COG'
    );

    navigationAddValueRow(
        table,
        'nav-value-brg',
        items[0],
        items[1],
        true,
        false
    );

    navigationAddHeaderRow(
        table,
        'nav-head-sog',
        items[2].label||'SOG',
        items[3].label||'TIEFE'
    );

    navigationAddValueRow(
        table,
        'nav-value-sog',
        items[2],
        items[3],
        true,
        false
    );

    navigationAddTargetHeaderRow(
        table,
        'nav-head-target'
    );

    navigationAddValueRow(
        table,
        'nav-value-distance',
        items[4],
        items[5],
        false,
        true
    );

    navigationAddValueRow(
        table,
        'nav-value-time',
        items[6],
        items[7],
        false,
        true
    );

    box.appendChild(table);

    setTimeout(scaleAll,20);
    setTimeout(scaleAll,250);
}



function buildSailingV2(d,box){
    var table=document.createElement('table');
    var items=d.items||[];
    var row;
    var cell;
    var instrument;
    var arc;
    var needle;
    var center;
    var awaText;
    var awsText;
    var mark;

    if(items.length<7){
        state(
            false,
            'SEGEL KONFIGURATION UNVOLLSTAENDIG'
        );
        return;
    }

    box.innerHTML='';
    table.className='navigation-table sailing-table';

    navigationAddHeaderRow(
        table,
        'nav-head-brg',
        items[0].label||'BRG',
        items[1].label||'COG'
    );

    navigationAddValueRow(
        table,
        'nav-value-brg',
        items[0],
        items[1],
        true,
        false
    );

    navigationAddHeaderRow(
        table,
        'nav-head-sog',
        items[2].label||'SOG',
        items[3].label||'TIEFE'
    );

    navigationAddValueRow(
        table,
        'nav-value-sog',
        items[2],
        items[3],
        true,
        false
    );

    navigationAddHeaderRow(
        table,
        'nav-head-target',
        items[4].label||'WINDSPEED',
        items[5].label||'SPEED TO WAYPOINT'
    );

    navigationAddValueRow(
        table,
        'nav-value-distance',
        items[4],
        items[5],
        true,
        false
    );

    row=document.createElement('tr');
    row.className='nav-wind-row';

    cell=document.createElement('td');
    cell.colSpan=2;
    cell.className='wind-instrument-cell';

    instrument=document.createElement('div');
    instrument.className='wind-instrument';
    instrument.setAttribute(
        'data-angle-path',
        items[6].path||
        'signalk.environment.wind.angleApparent'
    );
    instrument.setAttribute(
        'data-speed-path',
        items[4].path||
        'signalk.environment.wind.speedApparent'
    );

    arc=document.createElement('div');
    arc.className='wind-arc';

    needle=document.createElement('div');
    needle.className='wind-needle';

    center=document.createElement('div');
    center.className='wind-angle-value';
    L.setText(center,'--°');

    awaText=document.createElement('div');
    awaText.className='wind-info wind-info-left';
    L.setText(awaText,'AWA --°');

    awsText=document.createElement('div');
    awsText.className='wind-info wind-info-right';
    L.setText(awsText,'AWS -- kn');

    mark=document.createElement('span');
    mark.className='wind-mark wind-mark-0';
    L.setText(mark,'0');
    arc.appendChild(mark);

    mark=document.createElement('span');
    mark.className='wind-mark wind-mark-l45';
    L.setText(mark,'45');
    arc.appendChild(mark);

    mark=document.createElement('span');
    mark.className='wind-mark wind-mark-r45';
    L.setText(mark,'45');
    arc.appendChild(mark);

    mark=document.createElement('span');
    mark.className='wind-mark wind-mark-l90';
    L.setText(mark,'90');
    arc.appendChild(mark);

    mark=document.createElement('span');
    mark.className='wind-mark wind-mark-r90';
    L.setText(mark,'90');
    arc.appendChild(mark);

    arc.appendChild(needle);
    arc.appendChild(center);

    instrument.appendChild(arc);
    instrument.appendChild(awaText);
    instrument.appendChild(awsText);

    cell.appendChild(instrument);
    row.appendChild(cell);
    table.appendChild(row);

    box.appendChild(table);

    setTimeout(scaleAll,20);
    setTimeout(scaleAll,250);
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
     * Navigation besitzt ab V2 ein eigenes festes
     * Android-4.4-kompatibles Tabellenlayout.
     */
    if(page==='navigation'){
        buildNavigationV2(d,box);
        return;
    }

    if(page==='sailing'){
        buildSailingV2(d,box);
        return;
    }

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

function scaleNavigationV2(){
    var rows=document.getElementsByClassName(
        'nav-value-row'
    );

    var dashboardScale=
        dashboard&&typeof dashboard.valueScale==='number'?
        dashboard.valueScale:
        1;

    var r;
    var values;
    var candidates;
    var v;
    var element;
    var cell;
    var width;
    var height;
    var chars;
    var itemScale;
    var sizeName;
    var factor;
    var candidate;
    var common;
    var units;
    var u;

    for(r=0;r<rows.length;r++){
        values=
            rows[r].getElementsByClassName('value');

        if(values.length<1){
            continue;
        }

        candidates=[];
        common=0;

        for(v=0;v<values.length;v++){
            element=values[v];
            cell=element.parentNode;

            width=
                cell.clientWidth||
                cell.offsetWidth||
                1;

            height=
                cell.clientHeight||
                cell.offsetHeight||
                1;

            chars=parseInt(
                element.getAttribute('data-max-chars'),
                10
            )||6;

            itemScale=parseFloat(
                element.getAttribute('data-value-scale')
            );

            if(isNaN(itemScale)){
                itemScale=1;
            }

            sizeName=
                element.getAttribute('data-size')||
                'medium';

            factor={
                small:0.88,
                medium:1,
                large:1.08,
                hero:1.16
            }[sizeName]||1;

            /*
             * Nur 4 px horizontale Sicherheitsreserve.
             * Vertikal werden maximal 82 % der Zellenhoehe
             * fuer die Glyphen verwendet.
             */
            candidate=Math.floor(
                Math.min(
                    (width-4)*1.55/chars,
                    height*0.82
                )*
                factor*
                dashboardScale*
                itemScale
            );

            candidate=Math.max(
                20,
                Math.min(220,candidate)
            );

            candidates.push(candidate);

            if(
                common===0||
                candidate<common
            ){
                common=candidate;
            }
        }

        /*
         * Beide Spalten derselben Wertezeile
         * erhalten exakt dieselbe Schriftgroesse.
         */
        for(v=0;v<values.length;v++){
            element=values[v];
            cell=element.parentNode;

            height=
                cell.clientHeight||
                cell.offsetHeight||
                1;

            element.style.fontSize=
                common+'px';

            element.style.height=
                height+'px';

            element.style.lineHeight=
                height+'px';

            element.style.width='100%';
            element.style.textAlign='center';
            element.style.display='block';

            /*
             * Seitliche Einheit BRG/COG/SOG/TIEFE
             * exakt vertikal mittig.
             */
            units=
                cell.getElementsByClassName(
                    'nav-side-unit'
                );

            for(u=0;u<units.length;u++){
                units[u].style.height=
                    height+'px';

                units[u].style.lineHeight=
                    height+'px';

                units[u].style.fontSize=
                    Math.round(common*0.70)+'px';
            }

            units=
                cell.getElementsByClassName(
                    'nav-inline-unit'
                );

            for(u=0;u<units.length;u++){
                units[u].style.fontSize=
                    Math.round(common*0.70)+'px';

                units[u].style.lineHeight=
                    height+'px';
            }
        }
    }
}


function scaleAll(){
    var es;
    var i;
    var dashboardScale;

    if(
        document.body.getAttribute(
            'data-page'
        )==='navigation' ||
        document.body.getAttribute(
            'data-page'
        )==='sailing'
    ){
        scaleNavigationV2();
        return;
    }

    es=document.getElementsByClassName('value');

    dashboardScale=
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
    var text;

    if(value===null||typeof value==='undefined'||value===''){
        return null;
    }

    /*
     * Numerischer Unix-Zeitstempel:
     * Sekunden oder Millisekunden.
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

    if(typeof value==='string'){
        text=value.replace(/^\s+|\s+$/g,'');

        /*
         * ISO-/UTC-Zeit zuerst als Date interpretieren.
         * getHours/getMinutes liefern anschließend die lokale
         * Zeit entsprechend der Zeitzone des Browsers.
         */
        if(
            /[Tt]/.test(text)||
            /[Zz]$/.test(text)||
            /[+-][0-2][0-9]:?[0-5][0-9]$/.test(text)
        ){
            date=new Date(text);

            if(!isNaN(date.getTime())){
                return twoDigits(date.getHours())+':'+
                    twoDigits(date.getMinutes());
            }
        }

        /*
         * Reine Uhrzeit ohne Zeitzoneninformation.
         * Hier ist keine sichere Umrechnung möglich.
         */
        match=text.match(
            /^([0-2][0-9]):([0-5][0-9])(?::[0-5][0-9])?$/
        );

        if(match){
            return match[1]+':'+match[2];
        }

        /*
         * Andere vom Browser verstandene Datumsformate.
         */
        date=new Date(text);

        if(!isNaN(date.getTime())){
            return twoDigits(date.getHours())+':'+
                twoDigits(date.getMinutes());
        }
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
    var serverTime;
    var match;
    var i;
    var value;
    var formatted;
    var now;

    /*
     * Die Serverzeit ist bereits in die lokale Zeitzone des
     * AVNav-Servers umgerechnet. Deshalb HH:MM direkt aus dem
     * ISO-Text lesen und nicht erneut durch die Zeitzone des
     * Anzeigegeraetes umrechnen.
     */
    serverTime=L.get(data,'__legacyServerTime.localTime');

    if(typeof serverTime==='string'){
        match=serverTime.match(
            /T([0-2][0-9]):([0-5][0-9])/
        );

        if(match){
            return match[1]+':'+match[2];
        }
    }

    /*
     * Fallback auf GPS-/AVNav-Zeit.
     */
    for(i=0;i<paths.length;i++){
        value=L.get(data,paths[i]);
        formatted=formatClockValue(value);

        if(formatted!==null){
            return formatted;
        }
    }

    /*
     * Letzter Fallback: Uhrzeit des Anzeigegeraetes.
     */
    now=new Date();

    return twoDigits(now.getHours())+':'+
        twoDigits(now.getMinutes());
}


function updateSailingWindInstrument(data){
    var instrument=
        document.getElementsByClassName(
            'wind-instrument'
        )[0];

    var needle;
    var center;
    var awaText;
    var awsText;
    var anglePath;
    var speedPath;
    var angle;
    var speed;
    var degrees;
    var displayAngle;

    if(!instrument){
        return;
    }

    anglePath=
        instrument.getAttribute(
            'data-angle-path'
        );

    speedPath=
        instrument.getAttribute(
            'data-speed-path'
        );

    angle=L.get(data,anglePath);
    speed=L.get(data,speedPath);

    needle=
        instrument.getElementsByClassName(
            'wind-needle'
        )[0];

    center=
        instrument.getElementsByClassName(
            'wind-angle-value'
        )[0];

    awaText=
        instrument.getElementsByClassName(
            'wind-info-left'
        )[0];

    awsText=
        instrument.getElementsByClassName(
            'wind-info-right'
        )[0];

    if(
        angle!==null &&
        typeof angle!=='undefined' &&
        !isNaN(Number(angle))
    ){
        degrees=
            Number(angle)*180/Math.PI;

        while(degrees<0){
            degrees+=360;
        }

        while(degrees>=360){
            degrees-=360;
        }

        displayAngle=Math.round(degrees);

        if(
            needle &&
            needle.style.transform!==
                'rotate('+displayAngle+'deg)'
        ){
            needle.style.transform=
                'rotate('+displayAngle+'deg)';
        }

        if(center){
            L.setText(
                center,
                displayAngle+'°'
            );
        }

        if(awaText){
            L.setText(
                awaText,
                'AWA '+displayAngle+'°'
            );
        }
    }else{
        if(center){
            L.setText(center,'--°');
        }

        if(awaText){
            L.setText(awaText,'AWA --°');
        }
    }

    if(
        speed!==null &&
        typeof speed!=='undefined' &&
        !isNaN(Number(speed))
    ){
        speed=
            Number(speed)*1.9438444924406;

        if(awsText){
            L.setText(
                awsText,
                'AWS '+
                speed.toFixed(1).replace('.',',')+
                ' kn'
            );
        }
    }else{
        if(awsText){
            L.setText(
                awsText,
                'AWS -- kn'
            );
        }
    }
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
    var formatted;
    var inlineUnit;

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

        formatted=L.format(raw,item);
        inlineUnit=
            element.getAttribute('data-inline-unit');

        if(inlineUnit){
            var numberElement=
                element.getElementsByClassName(
                    'nav-inline-number'
                )[0];

            if(numberElement){
                L.setText(
                    numberElement,
                    formatted
                );
            }
        }else{
            L.setText(
                element,
                formatted
            );
        }
    }

    if(
        document.body.getAttribute(
            'data-page'
        )==='sailing'
    ){
        updateSailingWindInstrument(data);
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
