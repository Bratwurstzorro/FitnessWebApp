# BodyTrack Training

Eigenständiges React/Vite-Modul für das bestehende Supabase-Projekt `bodytrack`. Die vorhandene Tabelle `measurements` bleibt unberührt. Anmeldung und Benutzer-ID stammen aus Supabase Auth. Eine eigenständige URL teilt wegen der Browser-Origin nicht automatisch die lokale Sitzung der BodyTrack-Website; dieselben Zugangsdaten und derselbe Benutzer funktionieren. Nach dem späteren Einbau unter derselben Origin kann der Supabase-Client aus BodyTrack anstelle von `src/lib/supabase.js` importiert werden.

## Start

```bash
npm ci
npm run dev
npm run build
```

Die URL und der öffentliche Schlüssel sind wie in BodyTrack vorbelegt. Für andere Umgebungen `VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY` setzen. Niemals geheime Daten in Vite-Variablen speichern.

## Datenmodell

`sql/001_training.sql` legt `training_plans`, `training_days`, `training_exercises`, `training_targets`, `training_sessions` und `training_session_sets` mit RLS und Benutzerbindung an. `002_live_workout.sql` ergänzt die Herkunft der Einheit und eine atomare, mit den Rechten des angemeldeten Benutzers ausgeführte Planübernahme. `003_backfill_session_origin.sql` verknüpft ältere Einheiten bei eindeutigem Namensabgleich. `004_shared_exercise_catalog.sql` führt exakt gleiche Übungsnamen aus Plänen und Historie unter einer gemeinsamen Katalog-ID zusammen; `005_catalog_permissions.sql` beschränkt dessen Schreibrechte auf das Hinzufügen. Der Katalog ist für alle angemeldeten Benutzer lesbar, neue Namen können von ihnen ergänzt werden; die Trainingspläne und Sitzungssätze bleiben an den jeweiligen Benutzer gebunden. Die Sitzungssätze sind Momentaufnahmen. Nach Änderungen oder Löschungen eines Plans bleibt die abgeschlossene Trainingshistorie lesbar. Unfertige Sitzungen können später fortgesetzt werden.

## Integration

`src/features/training/TrainingApp.jsx` enthält den sichtbaren Bereich, `WorkoutView.jsx` die laufende Einheit, `api.js` die Datenzugriffe, `progression.js` die Empfehlungen und `RestTimer.jsx` den Pausentimer. Für die spätere Navigation „Übersicht | Körper | Training | Profil“ den authentifizierten `Training`-Bereich bzw. die Feature-Komponenten in BodyTrack übernehmen und den dortigen gemeinsamen Supabase-Client sowie dessen Session verwenden. Die gegenwärtige Einstiegskomponente bietet für die separate App einen eigenen Anmeldebildschirm. Vite nutzt relative Asset-Pfade und kann später mit Capacitor ein `dist` als `webDir` verwenden. Der Pausentimer läuft im Vordergrund; Hintergrundbenachrichtigungen auf Android sind noch nicht enthalten.

## Bedienung

Plan → Trainingstag → Übung → Sätze mit Sollwerten anlegen; Tag starten, Istwerte eintragen und Sätze abschließen. Bei „Übung hinzufügen“ im Plan oder Training erscheinen während der Eingabe passende Vorschläge aus dem gemeinsamen Übungspool. Ein neuer Name wird nach einer Rückfrage für alle angemeldeten Benutzer angelegt. Ein neuer Plansatz übernimmt Gewicht und Wiederholungen des unmittelbar vorherigen Plansatzes. Im laufenden Training können Sätze und Übungen ergänzt oder entfernt werden. Der erste Satz nutzt den letzten historischen Vergleichswert derselben Katalogübung und Satznummer, auch über mehrere Pläne hinweg; jeder folgende Satz übernimmt die aktuellen Eingaben des direkt vorherigen Satzes, auch vor dessen Abschluss. Nach jedem abgeschlossenen Satz startet ein veränderbarer Pausentimer. Bei zwei Wiederholungen über dem Soll zeigt die App eine vorsichtige Steigerung von etwa 2–5 % an; dies ist eine praktische Ableitung aus der ACSM-Empfehlung, keine individuell geprüfte Formel. Beim Abschließen wählt man zwischen unveränderter Planvorlage und Übernahme der heutigen Einheit. Ein versehentlich gestartetes Training lässt sich nach Rückfrage samt seiner erfassten Sätze abbrechen, ohne Plan oder frühere Historie zu verändern.

Studiengrundlage: [ACSM Position Stand 2009](https://pubmed.ncbi.nlm.nih.gov/19204579/) und [ACSM Position Stand 2026](https://pubmed.ncbi.nlm.nih.gov/41843416/). `npm test` prüft die Berechnung und die Auswahl des zuletzt geschafften Satzes.
