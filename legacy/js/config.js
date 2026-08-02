(function () {
    "use strict";

    var DATA_URL = "/viewer/avnav_navi.php?request=gps";
    var CONFIG_URL = "../api/config";
    var SAVE_URL = "../api/saveConfig";
    var DEFAULTS_URL = "../api/defaults";
    var config = null;
    var available = [];

    function byId(id) { return document.getElementById(id); }

    function request(method, url, body, callback) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) { return; }
            if (xhr.status !== 200) {
                callback(new Error("HTTP " + xhr.status));
                return;
            }
            try {
                callback(null, JSON.parse(xhr.responseText));
            } catch (error) {
                callback(error);
            }
        };
        xhr.open(method, url, true);
        xhr.timeout = 5000;
        xhr.onerror = function () { callback(new Error("Verbindungsfehler")); };
        xhr.ontimeout = function () { callback(new Error("Zeitüberschreitung")); };
        if (method === "POST") {
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
        }
        xhr.send(body || null);
    }

    function flatten(value, prefix, result) {
        var key;
        var path;
        if (value === null || typeof value === "undefined") { return; }
        if (typeof value !== "object") {
            result.push({ path: prefix, sample: String(value), type: typeof value });
            return;
        }
        if (Object.prototype.toString.call(value) === "[object Array]") {
            return; // Arrays are intentionally omitted from selectable dashboard values.
        }
        for (key in value) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                path = prefix ? prefix + "." + key : key;
                flatten(value[key], path, result);
            }
        }
    }

    function addDepthAlias(list) {
        var i;
        var depthLike = false;
        for (i = 0; i < list.length; i += 1) {
            if (/depth/i.test(list[i].path)) { depthLike = true; break; }
        }
        if (depthLike) {
            list.unshift({ path: "depth", sample: "automatisch", type: "alias" });
        }
    }

    function scanValues(callback) {
        request("GET", DATA_URL + "&_=" + new Date().getTime(), null, function (error, data) {
            var list = [];
            if (error) { callback(error); return; }
            flatten(data, "", list);
            list.sort(function (a, b) {
                return a.path < b.path ? -1 : (a.path > b.path ? 1 : 0);
            });
            addDepthAlias(list);
            available = list;
            callback(null, list);
        });
    }

    function createOption(select, value, text) {
        var option = document.createElement("option");
        option.value = value;
        option.appendChild(document.createTextNode(text));
        select.appendChild(option);
    }

    function fillSelect(select, selected) {
        var i;
        select.innerHTML = "";
        createOption(select, "", "-- nicht belegt --");
        for (i = 0; i < available.length; i += 1) {
            createOption(select, available[i].path,
                available[i].path + "  [" + available[i].sample + "]");
        }
        if (selected && !select.querySelector('option[value="' + selected.replace(/"/g, "\\\"") + '"]')) {
            createOption(select, selected, selected + "  [derzeit nicht verfügbar]");
        }
        select.value = selected || "";
    }

    function formatterOptions(select, selected) {
        var values = [
            ["number", "Zahl"], ["course", "Kurs 000-359"],
            ["kelvin", "Kelvin nach °C"], ["pascalHpa", "Pascal nach hPa"],
            ["percent", "Anteil nach Prozent"], ["text", "Text"]
        ];
        var i;
        select.innerHTML = "";
        for (i = 0; i < values.length; i += 1) {
            createOption(select, values[i][0], values[i][1]);
        }
        select.value = selected || "number";
    }

    function renderDashboard(name, dashboard) {
        var host = byId("dashboard-" + name);
        var items = dashboard.items || [];
        var i;
        var item;
        var row;
        var source;
        var label;
        var unit;
        var decimals;
        var formatter;
        host.innerHTML = "";
        byId("interval-" + name).value = dashboard.updateInterval || 1000;
        for (i = 0; i < items.length; i += 1) {
            item = items[i];
            row = document.createElement("div");
            row.className = "config-row";
            row.setAttribute("data-dashboard", name);
            row.setAttribute("data-slot", item.slot);
            row.innerHTML =
                '<div class="slot-name"></div>' +
                '<label>Datenquelle<select class="source"></select></label>' +
                '<label>Bezeichnung<input class="label-input" type="text"></label>' +
                '<label>Einheit<input class="unit-input" type="text"></label>' +
                '<label>Nachkommastellen<input class="decimals-input" type="number" min="0" max="6"></label>' +
                '<label>Format<select class="formatter"></select></label>';
            row.querySelector(".slot-name").innerHTML = "Feld " + (i + 1) + " · " + item.slot;
            source = row.querySelector(".source");
            label = row.querySelector(".label-input");
            unit = row.querySelector(".unit-input");
            decimals = row.querySelector(".decimals-input");
            formatter = row.querySelector(".formatter");
            fillSelect(source, item.path);
            label.value = item.label || "";
            unit.value = item.unit || "";
            decimals.value = item.decimals;
            formatterOptions(formatter, item.formatter);
            host.appendChild(row);
        }
    }

    function renderAll() {
        renderDashboard("anchor", config.dashboards.anchor);
        renderDashboard("navigation", config.dashboards.navigation);
        renderDashboard("system", config.dashboards.system);
        byId("value-count").innerHTML = String(available.length);
    }

    function collectDashboard(name) {
        var rows = byId("dashboard-" + name).querySelectorAll(".config-row");
        var items = [];
        var i;
        for (i = 0; i < rows.length; i += 1) {
            items.push({
                slot: rows[i].getAttribute("data-slot"),
                path: rows[i].querySelector(".source").value,
                label: rows[i].querySelector(".label-input").value,
                unit: rows[i].querySelector(".unit-input").value,
                decimals: parseInt(rows[i].querySelector(".decimals-input").value, 10) || 0,
                formatter: rows[i].querySelector(".formatter").value
            });
        }
        config.dashboards[name].items = items;
        config.dashboards[name].updateInterval = parseInt(byId("interval-" + name).value, 10) || 1000;
    }

    function setStatus(text, error) {
        var element = byId("config-status");
        element.className = error ? "status error" : "status";
        element.innerHTML = text;
    }

    function save() {
        collectDashboard("anchor");
        collectDashboard("navigation");
        collectDashboard("system");
        setStatus("Speichern ...", false);
        request("POST", SAVE_URL, "config=" + encodeURIComponent(JSON.stringify(config)), function (error, response) {
            if (error || !response || response.status !== "OK") {
                setStatus("Speichern fehlgeschlagen: " + (error ? error.message : response.error), true);
                return;
            }
            config = response.config;
            setStatus("Konfiguration gespeichert.", false);
        });
    }

    function rescan() {
        setStatus("AVNav-Werte werden gelesen ...", false);
        scanValues(function (error) {
            if (error) {
                setStatus("Werte konnten nicht gelesen werden: " + error.message, true);
                return;
            }
            renderAll();
            setStatus(available.length + " Werte gefunden.", false);
        });
    }

    function resetDefaults() {
        if (!window.confirm("Standardbelegung wiederherstellen?")) { return; }
        request("GET", DEFAULTS_URL, null, function (error, response) {
            if (error || !response || response.status !== "OK") {
                setStatus("Standards konnten nicht geladen werden.", true);
                return;
            }
            config = response.config;
            renderAll();
            setStatus("Standards geladen. Zum Übernehmen Speichern drücken.", false);
        });
    }

    function start() {
        byId("save-button").onclick = save;
        byId("scan-button").onclick = rescan;
        byId("defaults-button").onclick = resetDefaults;
        request("GET", CONFIG_URL + "?_=" + new Date().getTime(), null, function (error, response) {
            if (error || !response || response.status !== "OK") {
                setStatus("Konfiguration konnte nicht geladen werden.", true);
                return;
            }
            config = response.config;
            scanValues(function (scanError) {
                if (scanError) {
                    available = [];
                    setStatus("Konfiguration geladen; aktuelle AVNav-Werte nicht erreichbar.", true);
                } else {
                    setStatus(available.length + " aktuelle Werte gefunden.", false);
                }
                renderAll();
            });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start, false);
    } else {
        start();
    }
}());
