# Legacy Display für AVNav

Eigenständige E-Ink-Anzeigeseiten für alte Tolino-Geräte mit Android 4.4 und BonjourBrowser.

## Pluginname

```text
legacy-display
```

## Seitenstruktur

```text
legacy/index.html
legacy/anchor.html
legacy/navigation.html
legacy/system.html
legacy/css/display.css
legacy/js/avnav-data.js
```

`legacy/index.html` ist die zentrale Startseite und verlinkt auf alle weiteren Anzeigen.

Die Seiten fragen direkt den AVNav-Endpunkt ab:

```text
/viewer/avnav_navi.php?request=gps
```

AVNav-Karte und AVNav-Bedienelemente werden nicht geladen.

## Installation

```bash
cd /home/pi/avnav/data/plugins
unzip avnav-legacy-display-plugin-0.2.0.zip
sudo systemctl restart avnav
```

Das ZIP enthält auf oberster Ebene den Ordner `legacy-display`.

## Direkte Adressen

Bei einem AVNav-User-Plugin lautet die vollständige Startadresse typischerweise:

```text
http://avnav.local:8080/plugins/user-legacy-display/legacy/index.html
```

Weitere Seiten:

```text
http://avnav.local:8080/plugins/user-legacy-display/legacy/anchor.html
http://avnav.local:8080/plugins/user-legacy-display/legacy/navigation.html
http://avnav.local:8080/plugins/user-legacy-display/legacy/system.html
```

Innerhalb des Plugins sind die gewünschten kurzen Pfade `legacy/index.html`, `legacy/anchor.html` usw. umgesetzt. Ein globaler Serverpfad wie `http://avnav.local:8080/legacy/index.html` kann ein normales User-Plugin nicht eigenständig registrieren.
