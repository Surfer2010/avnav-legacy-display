(function () {
    "use strict";

    var DATA_URL = "/viewer/avnav_navi.php?request=gps";
    var requestRunning = false;
    var lastSuccess = 0;
    var failureTimer = null;

    function number(value) {
        if (value === null || typeof value === "undefined" || value === "") {
            return null;
        }
        value = Number(value);
        return isNaN(value) ? null : value;
    }

    function nested(object, path) {
        var parts = path.split(".");
        var current = object;
        var i;
        for (i = 0; i < parts.length; i += 1) {
            if (current === null || typeof current !== "object" ||
                    typeof current[parts[i]] === "undefined") {
                return null;
            }
            current = current[parts[i]];
        }
        return current;
    }

    function firstNumber(data, paths) {
        var i;
        var value;
        for (i = 0; i < paths.length; i += 1) {
            value = number(nested(data, paths[i]));
            if (value !== null) {
                return value;
            }
        }
        return null;
    }

    function formatNumber(value, decimals, placeholder) {
        if (value === null) {
            return placeholder;
        }
        return value.toFixed(decimals).replace(".", ",");
    }

    function formatCourse(value) {
        var rounded;
        if (value === null) {
            return "---";
        }
        rounded = Math.round(value) % 360;
        if (rounded < 0) {
            rounded += 360;
        }
        if (rounded < 10) {
            return "00" + rounded;
        }
        if (rounded < 100) {
            return "0" + rounded;
        }
        return String(rounded);
    }

    function kelvinToCelsius(value) {
        return value === null ? null : value - 273.15;
    }

    function pascalToHpa(value) {
        return value === null ? null : value / 100;
    }

    function setTextByName(name, text) {
        var elements = document.querySelectorAll('[data-avnav-value="' + name + '"]');
        var i;
        for (i = 0; i < elements.length; i += 1) {
            if (elements[i].innerHTML !== text) {
                elements[i].innerHTML = text;
            }
        }
    }

    function setState(connected, text) {
        var state = document.getElementById("connection-state");
        if (state && state.innerHTML !== text) {
            state.innerHTML = text;
        }
        if (document.body) {
            document.body.className = document.body.className
                .replace(/\s?is-offline/g, "")
                .replace(/\s?is-online/g, "") + (connected ? " is-online" : " is-offline");
        }
    }

    function updatePage(data) {
        var depth = firstNumber(data, [
            "depth",
            "waterDepth",
            "depthBelowTransducer",
            "depthBelowKeel",
            "depthBelowSurface",
            "transducers.Depth",
            "transducers.depth",
            "transducers.WaterDepth",
            "signalk.environment.depth.belowTransducer",
            "signalk.environment.depth.belowKeel",
            "signalk.environment.depth.belowSurface"
        ]);
        var speed = firstNumber(data, ["speed"]);
        var track = firstNumber(data, ["track"]);
        var latitude = firstNumber(data, ["lat", "signalk.navigation.position.latitude"]);
        var longitude = firstNumber(data, ["lon", "signalk.navigation.position.longitude"]);
        var satellites = firstNumber(data, ["satUsed", "signalk.navigation.gnss.satellites"]);
        var pressure = firstNumber(data, ["transducers.Barometer", "signalk.environment.outside.pressure"]);
        var outsideTemp = firstNumber(data, ["transducers.TempAir", "signalk.environment.outside.temperature"]);
        var cpuTemp = firstNumber(data, ["signalk.environment.rpi.cpu.temperature"]);
        var memory = firstNumber(data, ["signalk.environment.rpi.memory.utilisation"]);
        var sd = firstNumber(data, ["signalk.environment.rpi.sd.utilisation"]);
        var voltage = firstNumber(data, ["signalk.electrical.batteries.service.voltage"]);
        var current = firstNumber(data, ["signalk.electrical.batteries.service.current"]);

        setTextByName("depth", formatNumber(depth, 1, "--,-"));
        setTextByName("speed", formatNumber(speed, 1, "--,-"));
        setTextByName("track", formatCourse(track));
        setTextByName("latitude", formatNumber(latitude, 5, "--"));
        setTextByName("longitude", formatNumber(longitude, 5, "--"));
        setTextByName("satellites", formatNumber(satellites, 0, "--"));
        setTextByName("pressure", formatNumber(pascalToHpa(pressure), 1, "--,-"));
        setTextByName("outsideTemp", formatNumber(kelvinToCelsius(outsideTemp), 1, "--,-"));
        setTextByName("cpuTemp", formatNumber(kelvinToCelsius(cpuTemp), 1, "--,-"));
        setTextByName("memory", formatNumber(memory === null ? null : memory * 100, 0, "--"));
        setTextByName("sd", formatNumber(sd === null ? null : sd * 100, 0, "--"));
        setTextByName("voltage", formatNumber(voltage, 2, "--,--"));
        setTextByName("current", formatNumber(current, 2, "--,--"));
        setTextByName("serverTime", data.time || "--");

        if (depth === null && document.body.getAttribute("data-page") === "anchor") {
            setState(true, "KEINE TIEFENDATEN");
        } else {
            setState(true, "DATEN AKTUELL");
        }
    }

    function fail() {
        requestRunning = false;
        if ((new Date().getTime() - lastSuccess) >= 3000) {
            setState(false, "KEINE VERBINDUNG");
            setTextByName("depth", "--,-");
        }
    }

    function handleResponse(text) {
        var data;
        try {
            data = JSON.parse(text);
        } catch (error) {
            fail();
            return;
        }
        lastSuccess = new Date().getTime();
        updatePage(data);
    }

    function requestData() {
        var request;
        if (requestRunning) {
            return;
        }
        requestRunning = true;
        request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (request.readyState !== 4) {
                return;
            }
            requestRunning = false;
            if (request.status === 200) {
                handleResponse(request.responseText);
            } else {
                fail();
            }
        };
        request.ontimeout = fail;
        request.onerror = fail;
        request.open("GET", DATA_URL + "&_=" + new Date().getTime(), true);
        request.timeout = 2000;
        request.send(null);
    }

    function interval() {
        var configured = parseInt(document.body.getAttribute("data-update-interval"), 10);
        if (isNaN(configured) || configured < 250) {
            return 1000;
        }
        return configured;
    }

    function start() {
        lastSuccess = new Date().getTime();
        requestData();
        window.setInterval(requestData, interval());
        failureTimer = window.setInterval(function () {
            if ((new Date().getTime() - lastSuccess) >= 3000) {
                setState(false, "KEINE VERBINDUNG");
            }
        }, 1000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start, false);
    } else {
        start();
    }
}());
