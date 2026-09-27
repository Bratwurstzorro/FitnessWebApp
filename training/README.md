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

`sql/001_training.sql` legt `training_plans`, `training_days`, `training_exercises`, `training_targets`, `training_sessions` und `training_session_sets` mit RLS und Benutzerbindung an. Die Sitzungssätze sind Momentaufnahmen. Nach Änderungen oder Löschungen eines Plans bleibt die abgeschlossene Trainingshistorie lesbar. Unfertige Sitzungen können später fortgesetzt werden. Plan, Tag und Übung lassen sich löschen; die Löschung eines Plans entfernt die zugehörigen Tag- und Übungsdefinitionen.

## Integration

`src/features/training/TrainingApp.jsx` enthält den sichtbaren Bereich, `api.js` seine Datenzugriffe, `RestTimer.jsx` den Pausentimer. Für die spätere Navigation „Übersicht | Körper | Training | Profil“ den authentifizierten `Training`-Bereich bzw. die Feature-Komponenten in BodyTrack übernehmen und den dortigen gemeinsamen Supabase-Client sowie dessen Session verwenden. Die gegenwärtige Einstiegskomponente bietet für die separate App einen eigenen Anmeldebildschirm. Vite nutzt relative Asset-Pfade und kann später mit Capacitor ein `dist` als `webDir` verwenden. Der Pausentimer läuft im Vordergrund; Hintergrundbenachrichtigungen auf Android sind noch nicht enthalten.

## Bedienung

Plan → Trainingstag → Übung → Sätze mit Sollwerten anlegen; Tag starten, Istwerte eintragen und Sätze abschließen. Nach jedem Abschluss startet ein veränderbarer Pausentimer. Das vorherige abgeschlossene Ergebnis derselben Übung und Satzposition wird als Orientierung gezeigt. Alle Sätze schließen und dann das Training beenden; der Verlauf erscheint in „Historie“.
