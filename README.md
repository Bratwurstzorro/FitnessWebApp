# BodyTrack

BodyTrack is a small React + Supabase web app for tracking body measurements over time.

## Features

- Email/password registration and login
- Personal measurement history
- Weight, height, left/right arm, left/right thigh, abdomen, waist, chest and left/right calf
- Current value cards with mini trend charts
- Click a metric to open a larger chart and dated history
- Each user can only access their own measurements through Supabase Row Level Security

## Local development

```bash
npm install
npm run dev
```

The frontend uses the Supabase project already configured in `src/lib/supabase.js`. Environment variables can override the defaults:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

## GitHub Pages

The Vite base path is already configured for `/FitnessWebApp/`.

In GitHub, enable Pages and use the repository's Pages deployment/build workflow. The browser app itself does not require a private Supabase secret; the publishable key is intended for frontend use and database access is protected by Row Level Security.

For Supabase Auth, configure the GitHub Pages URL under **Authentication → URL Configuration** as the Site URL and add it as an allowed redirect URL.
