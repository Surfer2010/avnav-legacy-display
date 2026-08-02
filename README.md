# AVNav Legacy Display

`legacy-display` stellt eigenständige Vollbild-Dashboards für alte Browser und E-Ink-Geräte bereit. Zielgerät der ersten Version ist insbesondere ein Tolino mit Android 4.4 und BonjourBrowser.

## Version 0.2.0

Diese Version ergänzt eine browserbasierte Konfiguration:

- alle aktuell von AVNav gelieferten Einzelwerte werden aus `/viewer/avnav_navi.php?request=gps` automatisch ermittelt,
- Werte können den bereits vorhandenen Feldern der Seiten **Ankern**, **Navigation** und **System** zugeordnet werden,
- Bezeichnung, Einheit, Nachkommastellen und Formatter sind einstellbar,
- das Abfrageintervall ist je Dashboard einstellbar,
- die Konfiguration wird zentral auf dem AVNav-Server gespeichert und gilt damit auch für den Tolino,
- die Anzeigeseiten bleiben ES5- und Android-4.4-kompatibel.

## Seiten

```text
legacy/index.html
legacy/anchor.html
legacy/navigation.html
legacy/system.html
legacy/config.html
```

Direkte Startadresse:

```text
http://AVNAV-SERVER:8080/plugins/user-legacy-display/legacy/index.html
```

Konfiguration:

```text
http://AVNAV-SERVER:8080/plugins/user-legacy-display/legacy/config.html
```

## Bedienung

1. `config.html` auf einem Laptop, Tablet oder dem Tolino öffnen.
2. **AVNav-Werte neu einlesen** wählen.
3. Für jedes feste Anzeigefeld eine Datenquelle auswählen.
4. Bezeichnung, Einheit, Nachkommastellen und Format festlegen.
5. **Konfiguration speichern** wählen.
6. Die gewünschte Dashboard-Seite öffnen oder neu laden.

Die Liste enthält nur Werte, die AVNav im Moment des Einlesens liefert. Ein ausgeschalteter Sensor kann deshalb vorübergehend fehlen. Bereits gespeicherte Pfade bleiben auswählbar und werden als derzeit nicht verfügbar markiert.

## Formatter

- `Zahl`: Rohwert mit gewünschter Anzahl Nachkommastellen
- `Kurs 000-359`: Gradwert als dreistellige Kursangabe
- `Kelvin nach °C`: Temperaturumrechnung
- `Pascal nach hPa`: Druckumrechnung
- `Anteil nach Prozent`: beispielsweise `0.73` zu `73 %`
- `Text`: unveränderte Textdarstellung

## Konfigurationsdatei

Die serverseitige Konfiguration wird im AVNav-Datenverzeichnis gespeichert:

```text
legacy-display-config.json
```

Sie liegt bewusst nicht im Pluginordner, damit Updates des Plugins die Benutzereinstellungen nicht überschreiben.

## Installation

```bash
cd /tmp
wget https://github.com/Surfer2010/avnav-legacy-display/releases/download/v0.2.0/avnav-legacy-display-0.2.0.zip
cd /home/pi/avnav/data/plugins
rm -rf legacy-display
unzip /tmp/avnav-legacy-display-0.2.0.zip
sudo systemctl restart avnav
```

## Nächster Entwicklungsschritt

Version 0.3 soll Anzeigeelemente frei hinzufügen, entfernen, vergrößern und innerhalb jeder Dashboard-Seite anordnen können. Die Bearbeitung erfolgt dann in einem einfachen Rastereditor mit Buttons statt Drag-and-drop, damit auch alte Android-WebViews zuverlässig funktionieren.
