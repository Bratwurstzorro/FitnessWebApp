# BodyTrack Trainingsdaten

Die Migrationen in `sql/` dokumentieren den Trainingsbereich im gemeinsamen Supabase-Projekt. Der React-Code liegt nach der Zusammenführung unter `../src/features/training/`. Die App wird über `../src/main.jsx` gebaut und unter `/FitnessWebApp/` bereitgestellt.

`001_training.sql` legt benutzergebundene Trainingsdaten und RLS an; `002_live_workout.sql` und `003_backfill_session_origin.sql` betreffen Trainingseinheiten und deren Herkunft. `004_shared_exercise_catalog.sql` führt identische Übungsnamen unter gemeinsamen IDs zusammen; `005_catalog_permissions.sql` beschränkt das globale Übungsverzeichnis auf Lesen und Hinzufügen durch angemeldete Benutzer.
