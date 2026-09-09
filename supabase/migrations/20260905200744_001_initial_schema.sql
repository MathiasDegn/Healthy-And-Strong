/*
# Healthy And Strong — Initial Database Schema

## Overview
Creates the complete database schema for the "Healthy And Strong" strength training app.
The app generates intelligent training programs based on 5x5 StrongLifts and Starting Strength principles,
allows live workout logging, and features a social feed with leaderboards.

## New Tables

1. **profiles** — User profiles (extends Supabase auth.users)
   - `id` (uuid, PK, references auth.users)
   - `username` (text, unique) — login name
   - `display_name` (text) — shown to other users
   - `created_at` (timestamptz)

2. **exercises** — Exercise library (standard + user-created)
   - `id` (uuid, PK)
   - `name` (text, not null)
   - `description` (text)
   - `category` (text) — 'compound' or 'accessory'
   - `is_standard` (boolean) — true for built-in exercises, false for user-created
   - `user_id` (uuid, nullable) — set for user-created exercises
   - `created_at` (timestamptz)

3. **workouts** — Completed workout sessions
   - `id` (uuid, PK)
   - `user_id` (uuid, references profiles)
   - `started_at` (timestamptz)
   - `finished_at` (timestamptz)
   - `total_volume` (numeric) — total kg lifted in the workout
   - `workout_type` (text) — 'A' or 'B' (StrongLifts rotation) or 'free'
   - `created_at` (timestamptz)

4. **workout_sets** — Individual sets within a workout
   - `id` (uuid, PK)
   - `workout_id` (uuid, references workouts, cascade delete)
   - `exercise_id` (uuid, references exercises)
   - `set_number` (integer)
   - `reps` (integer)
   - `weight` (numeric)
   - `completed` (boolean, default true)

5. **programs** — User's current training program state
   - `id` (uuid, PK)
   - `user_id` (uuid, references profiles, unique)
   - `current_phase` (text) — '5x5', '3x5', '3x3', 'advanced'
   - `workout_a_weights` (jsonb) — current target weights for workout A
   - `workout_b_weights` (jsonb) — current target weights for workout B
   - `next_workout` (text) — 'A' or 'B'
   - `stalled_count` (jsonb) — track failed attempts per exercise
   - `total_workouts` (integer, default 0)
   - `last_workout_date` (timestamptz)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

## Security

### profiles
- Users can read all profiles (social app — everyone sees each other).
- Users can only insert/update their own profile.

### exercises
- Standard exercises readable by all.
- User-created exercises readable by their owner.
- Any authenticated user can insert exercises (user_id defaults to auth.uid()).
- Users can only update/delete their own custom exercises.

### workouts
- All authenticated users can read all workouts (social feed).
- Users can only insert/update/delete their own workouts.

### workout_sets
- All authenticated users can read all sets (social feed detail).
- Users can only insert/update/delete sets for their own workouts.

### programs
- Users can only read/insert/update their own program.
- Programs are private (not visible to others).

## Important Notes
1. Owner columns default to `auth.uid()` so frontend inserts work without explicitly passing user_id.
2. All tables have RLS enabled.
3. Standard exercises are seeded as part of this migration.
4. The 5 core StrongLifts exercises are: Squat, Bench Press, Deadlift, Overhead Press, Barbell Row.
*/

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ EXERCISES ============
CREATE TABLE IF NOT EXISTS exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'compound',
  is_standard boolean NOT NULL DEFAULT false,
  user_id uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exercises_select" ON exercises;
CREATE POLICY "exercises_select" ON exercises FOR SELECT
  TO authenticated USING (is_standard = true OR user_id = auth.uid());

DROP POLICY IF EXISTS "exercises_insert" ON exercises;
CREATE POLICY "exercises_insert" ON exercises FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR is_standard = false);

DROP POLICY IF EXISTS "exercises_update_own" ON exercises;
CREATE POLICY "exercises_update_own" ON exercises FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "exercises_delete_own" ON exercises;
CREATE POLICY "exercises_delete_own" ON exercises FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- ============ WORKOUTS ============
CREATE TABLE IF NOT EXISTS workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  total_volume numeric NOT NULL DEFAULT 0,
  workout_type text NOT NULL DEFAULT 'free',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workouts_select_all" ON workouts;
CREATE POLICY "workouts_select_all" ON workouts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "workouts_insert_own" ON workouts;
CREATE POLICY "workouts_insert_own" ON workouts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "workouts_update_own" ON workouts;
CREATE POLICY "workouts_update_own" ON workouts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "workouts_delete_own" ON workouts;
CREATE POLICY "workouts_delete_own" ON workouts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_started_at ON workouts(started_at DESC);

-- ============ WORKOUT_SETS ============
CREATE TABLE IF NOT EXISTS workout_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id),
  set_number integer NOT NULL,
  reps integer NOT NULL,
  weight numeric NOT NULL,
  completed boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workout_sets_select_all" ON workout_sets;
CREATE POLICY "workout_sets_select_all" ON workout_sets FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "workout_sets_insert_own" ON workout_sets;
CREATE POLICY "workout_sets_insert_own" ON workout_sets FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_sets.workout_id AND workouts.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "workout_sets_update_own" ON workout_sets;
CREATE POLICY "workout_sets_update_own" ON workout_sets FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_sets.workout_id AND workouts.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_sets.workout_id AND workouts.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "workout_sets_delete_own" ON workout_sets;
CREATE POLICY "workout_sets_delete_own" ON workout_sets FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_sets.workout_id AND workouts.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_workout_sets_workout_id ON workout_sets(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise_id ON workout_sets(exercise_id);

-- ============ PROGRAMS ============
CREATE TABLE IF NOT EXISTS programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  current_phase text NOT NULL DEFAULT '5x5',
  workout_a_weights jsonb NOT NULL DEFAULT '{}',
  workout_b_weights jsonb NOT NULL DEFAULT '{}',
  next_workout text NOT NULL DEFAULT 'A',
  stalled_count jsonb NOT NULL DEFAULT '{}',
  total_workouts integer NOT NULL DEFAULT 0,
  last_workout_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "programs_select_own" ON programs;
CREATE POLICY "programs_select_own" ON programs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "programs_insert_own" ON programs;
CREATE POLICY "programs_insert_own" ON programs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "programs_update_own" ON programs;
CREATE POLICY "programs_update_own" ON programs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "programs_delete_own" ON programs;
CREATE POLICY "programs_delete_own" ON programs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ SEED STANDARD EXERCISES ============
INSERT INTO exercises (name, description, category, is_standard, user_id) VALUES
  ('Squat', 'Barbell Back Squat — the king of all exercises. Targets quads, glutes, hamstrings, and core.', 'compound', true, NULL),
  ('Bench Press', 'Barbell Bench Press — horizontal pressing strength for chest, shoulders, and triceps.', 'compound', true, NULL),
  ('Deadlift', 'Conventional Deadlift — full-body power from the floor. Hits posterior chain, grip, and core.', 'compound', true, NULL),
  ('Overhead Press', 'Barbell Overhead Press — vertical pressing for shoulders and triceps.', 'compound', true, NULL),
  ('Barbell Row', 'Pendlay Barbell Row — horizontal pulling for back and biceps.', 'compound', true, NULL)
ON CONFLICT DO NOTHING;

-- ============ UPDATED_AT TRIGGER FOR PROGRAMS ============
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS programs_updated_at ON programs;
CREATE TRIGGER programs_updated_at BEFORE UPDATE ON programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();