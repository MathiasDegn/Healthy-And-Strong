/*
# Leaderboard RPC Functions

## Overview
Creates two PostgreSQL functions that power the leaderboard feature:
1. `get_leaderboard_volume()` — returns total volume and workout count per user
2. `get_leaderboard_1rm(ex_name text)` — returns best estimated 1RM per user for a given exercise

## Functions

### get_leaderboard_volume
- Returns: user_id, username, display_name, total_volume, workout_count
- Joins workouts with profiles
- Groups by user
- Accessible by all authenticated users (social app)

### get_leaderboard_1rm
- Parameter: ex_name (text) — the exercise name to rank by
- Returns: user_id, display_name, exercise_name, est_1rm
- Joins workout_sets with workouts, exercises, and profiles
- Filters by exercise name
- Calculates estimated 1RM using Epley formula: weight * (1 + reps/30)
- Groups by user, takes the max 1RM
- Accessible by all authenticated users

## Security
Both functions are SECURITY DEFINER so they can join across tables.
They are safe because they only expose aggregate data (totals, maxes) and
public profile info (username, display_name) — not individual workout details.
*/

CREATE OR REPLACE FUNCTION get_leaderboard_volume()
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  total_volume numeric,
  workout_count bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id AS user_id,
    p.username,
    p.display_name,
    COALESCE(SUM(w.total_volume), 0) AS total_volume,
    COUNT(w.id) AS workout_count
  FROM profiles p
  LEFT JOIN workouts w ON w.user_id = p.id
  GROUP BY p.id, p.username, p.display_name
  ORDER BY total_volume DESC;
$$;

GRANT EXECUTE ON FUNCTION get_leaderboard_volume() TO authenticated;

CREATE OR REPLACE FUNCTION get_leaderboard_1rm(ex_name text)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  exercise_name text,
  est_1rm numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    wo.user_id,
    p.display_name,
    ex.name AS exercise_name,
    MAX(ws.weight * (1 + ws.reps::numeric / 30)) AS est_1rm
  FROM workout_sets ws
  JOIN workouts wo ON wo.id = ws.workout_id
  JOIN exercises ex ON ex.id = ws.exercise_id
  JOIN profiles p ON p.id = wo.user_id
  WHERE ex.name = ex_name
    AND ws.completed = true
  GROUP BY wo.user_id, p.display_name, ex.name
  ORDER BY est_1rm DESC;
$$;

GRANT EXECUTE ON FUNCTION get_leaderboard_1rm(text) TO authenticated;