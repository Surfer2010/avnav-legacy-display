(function () {
    "use strict";

    var DATA_URL = "/viewer/avnav_navi.php?request=gps";
    var CONFIG_URL = "../api/config";
    var requestRunning = false;
    var lastSuccess = 0;
    var dashboard = null;
    var timer = null;

    function number(value) {
        if (value === null || typeof value === "undefined" || value === "") {
            return null;
        }
        value = Number(value);
        return isNaN(value) ? null : value;
    }

    function nested(object, path) {
        var aliases = {
            "depth": [
                "depth", "waterDepth", "depthBelowTransducer", "depthBelowKeel",
                "depthBelowSurface", "transducers.Depth", "transducers.depth",
                "transducers.WaterDepth", "signalk.environment.depth.belowTransducer",
                "signalk.environment.depth.belowKeel", "signalk.environment.depth.belowSurface"
            ]
        };
        var paths = aliases[path] || [path];
        var p;
        var parts;
        var current;
        var i;
        for (p = 0; p < paths.length; p += 1) {
            parts = paths[p].split(".");
            current = object;
            for (i = 0; i < parts.length; i += 1) {
                if (current === null || typeof current !== "object" ||
                        typeof current[parts[i]] === "undefined") {
                    current = null;
                    break;
                }
                current = current[parts[i]];
            }
            if (current !== null && typeof current !== "undefined") {
                return current;
            }
        }
        return null;
    }

    function formatValue(value, item) {
        var numeric;
        var decimals = parseInt(item.decimals, 10);
        if (isNaN(decimals)) {
            decimals = 1;
        }
        if (item.formatter === "text") {
            return value === null || typeof value === "undefined" ? "--" : String(value);
        }
        numeric = number(value);
        if (numeric === null) {
            return decimals > 0 ? "--,-" : "--";
        }
        if (item.formatter === "kelvin") {
            numeric -= 273.15;
        } else if (item.formatter === "pascalHpa") {
            numeric /= 100;
        } else if (item.formatter === "percent") {
            numeric *= 100;
        } else if (item.formatter === "course") {
            numeric = Math.round(numeric) % 360;
            if (numeric < 0) {
                numeric += 360;
            }
            if (numeric < 10) {
                return "00" + numeric;
            }
            if (numeric < 100) {
                return "0" + numeric;
            }
            return String(numeric);
        }
        return numeric.toFixed(decimals).replace(".", ",");
    }

    function setText(element, text) {
        if (element && element.innerHTML !== text) {
            element.innerHTML = text;
        }
    }

    function applyDashboardConfig(config) {
        var page = document.body.getAttribute("data-page");
        var dashboards = config && config.dashboards;
        var items;
        var i;
        var item;
        var slot;
        dashboard = dashboards ? dashboards[page] : null;
        if (!dashboard) {
            return false;
        }
        items = dashboard.items || [];
        for (i = 0; i < items.length; i += 1) {
            item = items[i];
            slot = document.querySelector('[data-slot="' + item.slot + '"]');
            if (!slot) {
                continue;
            }
            slot.setAttribute("data-path", item.path || "");
            slot.setAttribute("data-formatter", item.formatter || "number");
            slot.setAttribute("data-decimals", String(item.decimals));
            setText(slot.querySelector(".label"), item.label || item.path || "WERT");
            setText(slot.querySelector(".unit"), item.unit || "");
        }
        return true;
    }

    function setState(connected, text) {
        var state = document.getElementById("connection-state");
        setText(state, text);
        if (document.body) {
            document.body.className = document.body.className
                .replace(/\s?is-offline/g, "")
                .replace(/\s?is-online/g, "") + (connected ? " is-online" : " is-offline");
        }
    }

    function updatePage(data) {
        var slots = document.querySelectorAll("[data-slot]");
        var page = document.body.getAttribute("data-page");
        var i;
        var slot;
        var path;
        var item;
        var raw;
        var depthFound = false;
        for (i = 0; i < slots.length; i += 1) {
            slot = slots[i];
            path = slot.getAttribute("data-path") || "";
            item = {
                formatter: slot.getAttribute("data-formatter") || "number",
                decimals: slot.getAttribute("data-decimals") || "1"
            };
            raw = path ? nested(data, path) : null;
            if (path === "depth" && raw !== null) {
                depthFound = true;
            }
            setText(slot.querySelector(".value"), formatValue(raw, item));
        }
        if (page === "anchor" && !depthFound) {
            setState(true, "KEINE TIEFENDATEN");
        } else {
            setState(true, "DATEN AKTUELL");
        }
    }

    function fail() {
        requestRunning = false;
        if ((new Date().getTime() - lastSuccess) >= 3000) {
            setState(false, "KEINE VERBINDUNG");
        }
    }

    function requestData() {
        var request;
        if (requestRunning) {
            return;
        }
        requestRunning = true;
        request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            var data;
            if (request.readyState !== 4) {
                return;
            }
            requestRunning = false;
            if (request.status !== 200) {
                fail();
                return;
            }
            try {
                data = JSON.parse(request.responseText);
            } catch (error) {
                fail();
                return;
            }
            lastSuccess = new Date().getTime();
            updatePage(data);
        };
        request.ontimeout = fail;
        request.onerror = fail;
        request.open("GET", DATA_URL + "&_=" + new Date().getTime(), true);
        request.timeout = 2000;
        request.send(null);
    }

    function startDataLoop() {
        var interval = parseInt(dashboard && dashboard.updateInterval, 10);
        if (isNaN(interval) || interval < 250) {
            interval = 1000;
        }
        requestData();
        timer = window.setInterval(requestData, interval);
        window.setInterval(function () {
            if ((new Date().getTime() - lastSuccess) >= 3000) {
                setState(false, "KEINE VERBINDUNG");
            }
        }, 1000);
    }

    function loadConfig() {
        var request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            var response;
            if (request.readyState !== 4) {
                return;
            }
            if (request.status === 200) {
                try {
                    response = JSON.parse(request.responseText);
                    applyDashboardConfig(response.config);
                } catch (ignore) {
                    // HTML defaults remain usable.
                }
            }
            lastSuccess = new Date().getTime();
            startDataLoop();
        };
        request.open("GET", CONFIG_URL + "?_=" + new Date().getTime(), true);
        request.timeout = 3000;
        request.ontimeout = startDataLoop;
        request.onerror = startDataLoop;
        request.send(null);
    }

    function start() {
        loadConfig();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start, false);
    } else {
        start();
    }
}());
