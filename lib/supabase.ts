import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: Platform.OS === 'web'
      ? (typeof window !== 'undefined' ? window.localStorage : undefined)
      : undefined,
  },
});

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  created_at: string;
};

export type Exercise = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  is_standard: boolean;
  user_id: string | null;
};

export type Workout = {
  id: string;
  user_id: string;
  started_at: string;
  finished_at: string | null;
  total_volume: number;
  workout_type: string;
  created_at: string;
};

export type WorkoutSet = {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_number: number;
  reps: number;
  weight: number;
  completed: boolean;
};

export type Program = {
  id: string;
  user_id: string;
  current_phase: string;
  workout_a_weights: Record<string, number>;
  workout_b_weights: Record<string, number>;
  next_workout: string;
  stalled_count: Record<string, number>;
  total_workouts: number;
  last_workout_date: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkoutWithProfile = Workout & {
  profiles: Pick<Profile, 'username' | 'display_name'>;
  workout_sets: WorkoutSet[];
};
