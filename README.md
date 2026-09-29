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

Übungen und Sätze können im Plan, im laufenden Training und bei der Historienbearbeitung mit den Pfeiltasten umsortiert werden. `training/sql/006_session_order.sql` stellt dafür eine atomare, benutzergebundene Funktion bereit; sie läuft mit den Rechten des Aufrufers und den bestehenden RLS-Regeln.

In der Historie öffnet „Training bearbeiten“ dieselben modularen Satz- und Übungsbausteine. Gewicht und Wiederholungen werden mit „Satz speichern“ korrigiert; ergänzte Sätze zählen erst nach dem Speichern zum Fortschritt. Übungen und Sätze können ergänzt oder entfernt werden. Historienkorrekturen bewahren das ursprüngliche Abschlussdatum und aktualisieren die Fortschrittsberechnung unmittelbar.
