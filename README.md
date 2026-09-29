# BodyTrack

Eine gemeinsame React/Vite-App für Trainingspläne, laufende Trainings, Historie, Übungsfortschritt und Körpermaße. Ein Supabase-Login und ein Supabase-Client bedienen beide Bereiche. Daten bleiben in ihren eigenen Tabellen mit benutzergebundenen RLS-Regeln.

## Start

```bash
npm ci
npm test
npm run dev
npm run build
```

Die BodyTrack-App erscheint unter `/FitnessWebApp/`. Der bisherige Einstieg `/FitnessWebApp/training/` leitet auf den Trainingsbereich derselben App um. `src/features/training/` enthält Training und Fortschritt; `src/features/body/BodyMeasurements.jsx` enthält die Körpermaße mit Profil, Mini- und Detailgraphen. Die gemeinsame Anmeldung und Navigation liegen in `src/main.jsx`.

Vite verwendet den GitHub-Pages-Basispfad `/FitnessWebApp/`. Für andere Supabase-Umgebungen `VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY` setzen; niemals einen geheimen Schlüssel in Vite-Variablen speichern. Für Capacitor kann später der gemeinsame Build `dist` als `webDir` genutzt werden.

Die SQL-Migrationen für Trainingsdaten liegen unter `training/sql/`. Bestehende Messwert- und Trainingstabellen werden für die Zusammenführung nicht geändert.

Die Fortschrittsgraphen zeigen je Übung und abgeschlossenem Training das durchschnittlich bewegte Gewicht pro geschaffter Wiederholung: `Σ(Gewicht × Wiederholungen) / Σ(Wiederholungen)`. Abgeschlossene Sätze mit null Wiederholungen zählen nicht. Im Detail bleibt der schwerste Satz mit seinen Wiederholungen sichtbar.

Übungen können im Plan, im laufenden Training und bei der Historienbearbeitung mit den Pfeiltasten umsortiert werden. Die Reihenfolge der Sätze innerhalb einer Übung bleibt erhalten. `training/sql/006_session_order.sql` stellt dafür eine atomare, benutzergebundene Funktion bereit; sie läuft mit den Rechten des Aufrufers und den bestehenden RLS-Regeln.

In der Historie öffnet „Training bearbeiten“ dieselben modularen Satz- und Übungsbausteine. Gewicht und Wiederholungen werden mit „Satz speichern“ korrigiert; ergänzte Sätze zählen erst nach dem Speichern zum Fortschritt. Übungen und Sätze können ergänzt oder entfernt werden. Historienkorrekturen bewahren das ursprüngliche Abschlussdatum und aktualisieren die Fortschrittsberechnung unmittelbar.

Unter Training öffnet ein Klick auf die Trainingszeile zuerst eine Vorschau mit Planname, Trainingstag, Übungs- und Satzanzahl sowie den geplanten Wiederholungen je Übung. Erst „Starten“ in dieser Vorschau legt das Training an.

Das aktive Training zeigt jeweils eine Übung mit einer horizontalen Navigation (erste zwei Buchstaben). Beim Starten/Fortsetzen wird die erste noch offene Übung ausgewählt. Nur der erste offene Satz ist freigegeben; Bestätigung schaltet den nächsten frei und startet den Pausentimer unten. Bereits gespeicherte Sätze lassen sich gezielt korrigieren. Die aktive Progressionsempfehlung nutzt den vorherigen heutigen Satz, ansonsten den letzten historischen Vergleichswert. Darunter erscheinen die zwei letzten abgeschlossenen Trainings derselben Übung.

Die Aufwärmorientierung beträgt sechs Wiederholungen mit etwa 40 % des zuletzt geschafften Satzgewichts (bei fehlender Historie: Planwert). Grundlage ist Ribeiro et al. (2020), https://pubmed.ncbi.nlm.nih.gov/32971729/; die dort untersuchten Aufwärmprotokolle beziehen sich auf Bankdrücken/Kniebeugen und auf Trainingslast, nicht auf 1RM. Die Übertragung auf weitere Übungen und das historische Satzgewicht ist eine ausdrücklich gekennzeichnete App-Regel. Aufwärmsätze werden nicht gespeichert und gehen nicht in Fortschrittsdaten ein.

Abgeschlossene Sätze bleiben direkt editierbar; Korrekturen werden mit ✓ gespeichert, ohne den Timer erneut zu starten oder die Übung zu wechseln. Nach der letzten neuen Satzbestätigung öffnet sich automatisch die nächste offene Übung (in Übungsreihenfolge, bei Bedarf zurück zum Anfang). Aufwärm- und Progressionserläuterungen sind einklappbar und zunächst geschlossen. Kompakte Satzzeilen verwenden gemeinsame Spaltenüberschriften.

Während eines aktiv geöffneten Trainings entfallen App-Kopf und Hauptnavigation. „LIVE“, Planname und Trainingstag bleiben sichtbar. Das Drei-Punkte-Menü bietet Übung hinzufügen/entfernen, abbrechen, abschließen und später fortsetzen. Ein unvollständiges oder leeres Training wird direkt als Historie abgeschlossen; der Plan bleibt unverändert. Nicht absolvierte Sätze behalten ihren Status und werden aus dem Fortschritt ausgeschlossen. Bei vollständig bestätigten Sätzen bleibt die optionale Planübernahme erhalten.

Im aktiven Training ersetzt „Übung nach rechts verschieben“ im Drei-Punkte-Menü die sichtbaren Pfeile. Es verschiebt die geöffnete Übung um eine Position und behält sie ausgewählt; bei der letzten Übung ist der Menüpunkt deaktiviert. Satzreihenfolgen bleiben erhalten. Progressionsempfehlungen nennen die konkrete Wiederholungszahl; zum Beispiel wird aus zuletzt 20 kg × 10 die Orientierung „20 kg halten, 11 Wiederholungen versuchen“.
