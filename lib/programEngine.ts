import { supabase, type Program, type Exercise } from './supabase';

export type { Program };

// Standard exercise names mapped to their IDs (loaded from DB)
export const STANDARD_EXERCISES = [
  'Squat',
  'Bench Press',
  'Deadlift',
  'Overhead Press',
  'Barbell Row',
] as const;

// Starting weights for a new lifter (in kg)
const STARTING_WEIGHTS: Record<string, number> = {
  'Squat': 40,
  'Bench Press': 40,
  'Deadlift': 60,
  'Overhead Press': 25,
  'Barbell Row': 40,
};

// Progression increments (in kg)
const INCREMENT: Record<string, number> = {
  'Squat': 2.5,
  'Bench Press': 2.5,
  'Deadlift': 5,
  'Overhead Press': 1,
  'Barbell Row': 2.5,
};

// Deload percentage
const DELOAD_PERCENT = 0.9;

// Stalled threshold — after 3 failed attempts at same weight, deload
const STALL_THRESHOLD = 3;

// Phase transition thresholds (based on total workouts completed)
const PHASE_THRESHOLDS = {
  '5x5': 0,
  '3x5': 24,   // ~8 weeks at 3x/week
  '3x3': 48,   // ~16 weeks
  'advanced': 72, // ~24 weeks
};

export type WorkoutDefinition = {
  type: 'A' | 'B';
  exercises: { name: string; sets: number; reps: number; weight: number }[];
};

export function getPhaseForWorkoutCount(count: number): string {
  if (count >= PHASE_THRESHOLDS.advanced) return 'advanced';
  if (count >= PHASE_THRESHOLDS['3x3']) return '3x3';
  if (count >= PHASE_THRESHOLDS['3x5']) return '3x5';
  return '5x5';
}

export function getSetsRepsForPhase(phase: string): { sets: number; reps: number } {
  switch (phase) {
    case '5x5': return { sets: 5, reps: 5 };
    case '3x5': return { sets: 3, reps: 5 };
    case '3x3': return { sets: 3, reps: 3 };
    case 'advanced': return { sets: 5, reps: 3 };
    default: return { sets: 5, reps: 5 };
  }
}

// Workout A: Squat, Bench Press, Barbell Row
// Workout B: Squat, Overhead Press, Deadlift
export function getWorkoutExercises(type: 'A' | 'B'): string[] {
  if (type === 'A') return ['Squat', 'Bench Press', 'Barbell Row'];
  return ['Squat', 'Overhead Press', 'Deadlift'];
}

export function createInitialProgram(userId: string): Omit<Program, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: userId,
    current_phase: '5x5',
    workout_a_weights: {
      'Squat': STARTING_WEIGHTS['Squat'],
      'Bench Press': STARTING_WEIGHTS['Bench Press'],
      'Barbell Row': STARTING_WEIGHTS['Barbell Row'],
    },
    workout_b_weights: {
      'Squat': STARTING_WEIGHTS['Squat'],
      'Overhead Press': STARTING_WEIGHTS['Overhead Press'],
      'Deadlift': STARTING_WEIGHTS['Deadlift'],
    },
    next_workout: 'A',
    stalled_count: {},
    total_workouts: 0,
    last_workout_date: null,
  };
}

export type WorkoutResult = {
  exerciseName: string;
  allSetsCompleted: boolean;
  totalReps: number;
  targetReps: number;
};

export function getNextProgramState(
  current: Program,
  workoutType: 'A' | 'B',
  results: WorkoutResult[]
): Partial<Program> {
  const weights = workoutType === 'A' ? { ...current.workout_a_weights } : { ...current.workout_b_weights };
  const stalled = { ...current.stalled_count };
  const phase = current.current_phase;
  const { sets, reps } = getSetsRepsForPhase(phase);
  const targetRepsPerExercise = sets * reps;

  for (const result of results) {
    const exerciseName = result.exerciseName;
    const currentWeight = weights[exerciseName] ?? STARTING_WEIGHTS[exerciseName] ?? 40;

    if (result.allSetsCompleted && result.totalReps >= targetRepsPerExercise) {
      // Success — increase weight
      const inc = INCREMENT[exerciseName] ?? 2.5;
      weights[exerciseName] = currentWeight + inc;
      stalled[exerciseName] = 0;
    } else {
      // Failed — increment stalled count
      stalled[exerciseName] = (stalled[exerciseName] ?? 0) + 1;

      if (stalled[exerciseName] >= STALL_THRESHOLD) {
        // Deload
        weights[exerciseName] = Math.round(currentWeight * DELOAD_PERCENT / 2.5) * 2.5;
        stalled[exerciseName] = 0;
      }
    }
  }

  const newTotal = current.total_workouts + 1;
  const newPhase = getPhaseForWorkoutCount(newTotal);

  const update: Partial<Program> = {
    total_workouts: newTotal,
    current_phase: newPhase,
    stalled_count: stalled,
    last_workout_date: new Date().toISOString(),
    next_workout: workoutType === 'A' ? 'B' : 'A',
  };

  if (workoutType === 'A') {
    update.workout_a_weights = weights;
  } else {
    update.workout_b_weights = weights;
  }

  return update;
}

export function buildWorkoutFromProgram(program: Program, exerciseMap: Map<string, Exercise>): WorkoutDefinition {
  const type = program.next_workout as 'A' | 'B';
  const exerciseNames = getWorkoutExercises(type);
  const weights = type === 'A' ? program.workout_a_weights : program.workout_b_weights;
  const { sets, reps } = getSetsRepsForPhase(program.current_phase);

  return {
    type,
    exercises: exerciseNames.map(name => ({
      name,
      sets,
      reps,
      weight: weights[name] ?? STARTING_WEIGHTS[name] ?? 40,
    })),
  };
}

export async function ensureProgram(userId: string): Promise<Program | null> {
  const { data: existing } = await supabase
    .from('programs')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) return existing as Program;

  const initial = createInitialProgram(userId);
  const { data, error } = await supabase
    .from('programs')
    .insert(initial)
    .select()
    .maybeSingle();

  if (error) {
    // Maybe race condition — try fetching again
    const { data: retry } = await supabase
      .from('programs')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    return retry as Program | null;
  }

  return data as Program | null;
}

export async function updateProgramAfterWorkout(
  programId: string,
  workoutType: 'A' | 'B',
  results: WorkoutResult[]
): Promise<Program | null> {
  const { data: current } = await supabase
    .from('programs')
    .select('*')
    .eq('id', programId)
    .maybeSingle();

  if (!current) return null;

  const update = getNextProgramState(current as Program, workoutType, results);

  const { data, error } = await supabase
    .from('programs')
    .update(update)
    .eq('id', programId)
    .select()
    .maybeSingle();

  if (error) return null;
  return data as Program | null;
}

// Epley formula for estimated 1RM
export function estimate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps <= 0) return 0;
  return weight * (1 + reps / 30);
}

export function formatVolume(volume: number): string {
  if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M kg`;
  if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K kg`;
  return `${Math.round(volume)} kg`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
