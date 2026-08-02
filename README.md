# AVNav Legacy Display

<p align="center">
  <picture>
    <source
      media="(prefers-color-scheme: dark)"
      srcset="assets/logos/logo-dark-red.svg">
    <img
      src="assets/logos/logo-light-navy.svg"
      alt="AVNav Dashboard Legacy Version"
      width="720">
  </picture>
</p>

## Reaktiviert ältere Geräte als AVNav-Zusatzdisplay

AVNav Legacy Display verwandelt ältere Android-Geräte, E-Reader und andere Browser mit eingeschränkter JavaScript-Unterstützung in gut ablesbare Navigationsdisplays.

Das Plugin wurde insbesondere für Geräte entwickelt, auf denen moderne AVNav-Oberflächen nicht mehr flüssig oder gar nicht mehr funktionieren. Stattdessen werden bewusst einfache HTML-, CSS- und JavaScript-Techniken verwendet, die auch auf sehr alten Browsern zuverlässig laufen.

Dadurch lassen sich ausgemusterte Geräte sinnvoll weiterverwenden, beispielsweise als:

- Ankerdisplay
- Navigationsdisplay
- Systemmonitor
- Tiefenanzeige
- separates Cockpit-Display
- stromsparendes E-Ink-Display

Typische Geräte sind unter anderem:

- Tolino Vision
- Tolino Shine
- ältere Kindle mit Browser
- ältere Android-Tablets
- ausgemusterte Smartphones

---

## Screenshots

### Dashboard

<img width="946" height="436" alt="Dashboard" src="https://github.com/user-attachments/assets/fcd47d06-95fa-4710-b02e-8f042d2d0a43" />

### Konfiguration

<img width="955" height="416" alt="Konfiguration" src="https://github.com/user-attachments/assets/22f4ecf8-e7e7-427b-b277-152635d04de8" />

---

**Aktuelle Version: 0.4.2**

### Highlights

- Optimiert für E-Ink-Displays
- Unterstützung sehr alter Browser
- Mehrere frei konfigurierbare Dashboards
- Automatische Erkennung der verfügbaren AVNav-Daten
- Individuell skalierbare Anzeigen
- Speicherung lokal oder direkt auf dem AVNav-Server
- Kompatibel mit älteren und aktuellen AVNav-Versionen












# AVNav Legacy Display

<p align="center">
  <picture>
    <source
      media="(prefers-color-scheme: dark)"
      srcset="assets/logos/logo-dark-red.svg">
    <img
      src="assets/logos/logo-light-navy.svg"
      alt="AVNav Dashboard Legacy Version"
      width="720">
  </picture>
</p>

E-Ink-optimierte Dashboards für ältere Browser, Tolino, Kindle und AVNav.



**Aktuelle Version: 0.4.2**

Die Standardanzeigen verwenden **DBK** für die Tiefe unter dem Kiel und
**SOG** für die Geschwindigkeit über Grund.

## Standardwerte

Als nautisch sinnvolle Vorgabe verwendet das Plugin:

| Anzeige | Bedeutung |
|---|---|
| **DBK** | Depth Below Keel – Tiefe unter dem Kiel |
| **SOG** | Speed Over Ground – Geschwindigkeit über Grund |

DBK ersetzt als Standardwert DBT (Depth Below Transducer).  
SOG ersetzt als Standardwert STW (Speed Through Water).

## Änderungen in Version 0.4.2

- Automatischer POST-zu-GET-Fallback beim Speichern der Konfiguration
- Kompatible Server-Speicherung mit alten und neuen AVNav-Versionen
- Keine feste Erkennung der AVNav-Version erforderlich
- Logo auf der Konfigurationsseite
- Kleines Logo unterhalb des Hinweises auf der Startseite
