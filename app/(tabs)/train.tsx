import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { supabase, type Exercise } from '@/lib/supabase';
import {
  ensureProgram,
  buildWorkoutFromProgram,
  updateProgramAfterWorkout,
  type Program,
  type WorkoutDefinition,
  type WorkoutResult,
  getSetsRepsForPhase,
} from '@/lib/programEngine';
import { colors, typography, spacing, borderRadius, shadows, gradients } from '@/lib/theme';
import { Card, PrimaryButton, GlowBadge } from '@/components/ui';
import { Dumbbell, Plus, Check, X, Minus, Timer, Flame } from 'lucide-react-native';

type ActiveSet = {
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  weight: number;
  reps: number;
  completed: boolean;
  targetReps: number;
  targetWeight: number;
};

export default function TrainScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [program, setProgram] = useState<Program | null>(null);
  const [workout, setWorkout] = useState<WorkoutDefinition | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [activeSets, setActiveSets] = useState<ActiveSet[]>([]);
  const [active, setActive] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (active && startTime) {
      const interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [active, startTime]);

  const loadProgram = useCallback(async () => {
    if (!session?.user) return;
    const prog = await ensureProgram(session.user.id);
    setProgram(prog);
    const { data: exData } = await supabase.from('exercises').select('*');
    setExercises((exData ?? []) as Exercise[]);
    if (prog) {
      const exMap = new Map((exData ?? []).map((e: any) => [e.name, e]));
      setWorkout(buildWorkoutFromProgram(prog, exMap));
    }
  }, [session?.user]);

  useFocusEffect(
    useCallback(() => {
      if (!active) loadProgram();
    }, [loadProgram, active])
  );

  const startWorkout = () => {
    if (!workout || !program) return;
    const { sets, reps } = getSetsRepsForPhase(program.current_phase);
    const setsArr: ActiveSet[] = [];
    for (const ex of workout.exercises) {
      const exId = exercises.find((e) => e.name === ex.name)?.id ?? '';
      for (let s = 1; s <= ex.sets; s++) {
        setsArr.push({
          exerciseId: exId,
          exerciseName: ex.name,
          setNumber: s,
          weight: ex.weight,
          reps: ex.reps,
          completed: false,
          targetReps: ex.reps,
          targetWeight: ex.weight,
        });
      }
    }
    setActiveSets(setsArr);
    setActive(true);
    setStartTime(Date.now());
    setElapsed(0);
  };

  const startFreeWorkout = () => {
    setActiveSets([]);
    setActive(true);
    setStartTime(Date.now());
    setElapsed(0);
    setWorkout({ type: 'free' as any, exercises: [] });
  };

  const toggleSet = (index: number) => {
    setActiveSets((prev) =>
      prev.map((s, i) => (i === index ? { ...s, completed: !s.completed } : s))
    );
  };

  const updateSet = (index: number, field: 'weight' | 'reps', delta: number) => {
    setActiveSets((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, [field]: Math.max(0, s[field] + delta) } : s
      )
    );
  };

  const addExerciseToWorkout = (ex: Exercise) => {
    const newSet: ActiveSet = {
      exerciseId: ex.id,
      exerciseName: ex.name,
      setNumber: 1,
      weight: 40,
      reps: 5,
      completed: false,
      targetReps: 5,
      targetWeight: 40,
    };
    const newSets = [1, 2, 3].map((n) => ({ ...newSet, setNumber: n }));
    setActiveSets((prev) => [...prev, ...newSets]);
    setShowAddExercise(false);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const finishWorkout = async () => {
    if (!session?.user || activeSets.length === 0) {
      setActive(false);
      return;
    }
    setSaving(true);

    const workoutType = workout?.type ?? 'free';
    const totalVolume = activeSets.reduce((sum, s) => sum + (s.completed ? s.weight * s.reps : 0), 0);

    const { data: workoutRow, error: wError } = await supabase
      .from('workouts')
      .insert({
        user_id: session.user.id,
        started_at: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
        finished_at: new Date().toISOString(),
        total_volume: totalVolume,
        workout_type: String(workoutType),
      })
      .select()
      .maybeSingle();

    if (wError || !workoutRow) {
      Alert.alert('Error', 'Could not save workout.');
      setSaving(false);
      return;
    }

    const setsToInsert = activeSets
      .filter((s) => s.completed)
      .map((s) => ({
        workout_id: workoutRow.id,
        exercise_id: s.exerciseId,
        set_number: s.setNumber,
        reps: s.reps,
        weight: s.weight,
        completed: true,
      }));

    if (setsToInsert.length > 0) {
      const { error: sError } = await supabase.from('workout_sets').insert(setsToInsert);
      if (sError) {
        Alert.alert('Warning', 'Workout saved, but some sets could not be stored.');
      }
    }

    if (program && (workoutType === 'A' || workoutType === 'B')) {
      const results: WorkoutResult[] = [];
      const exerciseNames = [...new Set(activeSets.map((s) => s.exerciseName))];
      for (const name of exerciseNames) {
        const exSets = activeSets.filter((s) => s.exerciseName === name);
        const allCompleted = exSets.every((s) => s.completed);
        const totalReps = exSets.filter((s) => s.completed).reduce((sum, s) => sum + s.reps, 0);
        const targetReps = exSets.length * (exSets[0]?.targetReps ?? 0);
        results.push({ exerciseName: name, allSetsCompleted: allCompleted, totalReps, targetReps });
      }
      await updateProgramAfterWorkout(program.id, workoutType as 'A' | 'B', results);
    }

    setSaving(false);
    setActive(false);
    setWorkout(null);
    setActiveSets([]);
    setStartTime(null);
    setElapsed(0);
    router.push('/');
  };

  const cancelWorkout = () => {
    Alert.alert('Cancel workout?', 'Your progress will not be saved.', [
      { text: 'Keep training', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: () => {
          setActive(false);
          setWorkout(null);
          setActiveSets([]);
          setStartTime(null);
          setElapsed(0);
        },
      },
    ]);
  };

  const groupedSets = activeSets.reduce((acc, set, idx) => {
    if (!acc[set.exerciseName]) acc[set.exerciseName] = [];
    acc[set.exerciseName].push({ ...set, index: idx });
    return acc;
  }, {} as Record<string, (ActiveSet & { index: number })[]>);

  if (active) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={gradients.header as any} style={styles.activeHeader}>
          <View>
            <Text style={styles.activeTitle}>
              {workout?.type === 'A' ? 'Workout A' : workout?.type === 'B' ? 'Workout B' : 'Free Training'}
            </Text>
            <View style={styles.timerRow}>
              <Timer size={16} color={colors.accentBright} strokeWidth={2} />
              <Text style={styles.timer}>{formatTime(elapsed)}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={cancelWorkout} style={styles.closeBtn}>
            <X size={22} color={colors.error} strokeWidth={2} />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          {Object.entries(groupedSets).map(([name, sets]) => (
            <View key={name} style={styles.exerciseGroup}>
              <View style={styles.exerciseGroupHeader}>
                <View style={styles.exerciseGroupAccent} />
                <Text style={styles.exerciseGroupTitle}>{name}</Text>
              </View>
              {sets.map((s) => (
                <View key={s.index} style={[styles.setRow, s.completed && styles.setRowCompleted]}>
                  <LinearGradient
                    colors={s.completed ? gradients.buttonPrimary as any : gradients.cardElevated as any}
                    style={styles.setNumber}
                  >
                    <Text style={[styles.setNumberText, s.completed && styles.setNumberTextDone]}>
                      {s.setNumber}
                    </Text>
                  </LinearGradient>
                  <View style={styles.setControls}>
                    <View style={styles.controlGroup}>
                      <TouchableOpacity style={styles.controlBtn} onPress={() => updateSet(s.index, 'weight', -2.5)}>
                        <Minus size={16} color={colors.forest[200]} strokeWidth={2} />
                      </TouchableOpacity>
                      <View style={styles.controlValue}>
                        <Text style={styles.controlValueText}>{s.weight}</Text>
                        <Text style={styles.controlUnit}>kg</Text>
                      </View>
                      <TouchableOpacity style={styles.controlBtn} onPress={() => updateSet(s.index, 'weight', 2.5)}>
                        <Plus size={16} color={colors.forest[200]} strokeWidth={2} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.controlGroup}>
                      <TouchableOpacity style={styles.controlBtn} onPress={() => updateSet(s.index, 'reps', -1)}>
                        <Minus size={16} color={colors.forest[200]} strokeWidth={2} />
                      </TouchableOpacity>
                      <View style={styles.controlValue}>
                        <Text style={styles.controlValueText}>{s.reps}</Text>
                        <Text style={styles.controlUnit}>reps</Text>
                      </View>
                      <TouchableOpacity style={styles.controlBtn} onPress={() => updateSet(s.index, 'reps', 1)}>
                        <Plus size={16} color={colors.forest[200]} strokeWidth={2} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.checkBtn, s.completed && styles.checkBtnDone]}
                    onPress={() => toggleSet(s.index)}
                    activeOpacity={0.7}
                  >
                    {s.completed ? (
                      <Check size={22} color={colors.forest[950]} strokeWidth={3} />
                    ) : (
                      <Check size={22} color={colors.forest[400]} strokeWidth={2} />
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>

        <LinearGradient colors={gradients.card as any} style={[styles.bottomBar, shadows.tabbar]}>
          <TouchableOpacity style={styles.addExerciseBtn} onPress={() => setShowAddExercise(true)}>
            <Plus size={20} color={colors.accentBright} strokeWidth={2} />
            <Text style={styles.addExerciseText}>Add Exercise</Text>
          </TouchableOpacity>
          <PrimaryButton
            label={saving ? 'Saving...' : 'Finish Workout'}
            onPress={finishWorkout}
            disabled={saving}
          />
        </LinearGradient>

        <Modal visible={showAddExercise} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <LinearGradient colors={gradients.card as any} style={[styles.modalContent, shadows.tabbar]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Exercise</Text>
                <TouchableOpacity onPress={() => setShowAddExercise(false)}>
                  <X size={24} color={colors.forest[200]} strokeWidth={2} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={exercises}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.exerciseOption} onPress={() => addExerciseToWorkout(item)}>
                    <View>
                      <Text style={styles.exerciseOptionName}>{item.name}</Text>
                      <Text style={styles.exerciseOptionCat}>{item.category}</Text>
                    </View>
                    <View style={styles.addCircle}>
                      <Plus size={18} color={colors.forest[950]} strokeWidth={2} />
                    </View>
                  </TouchableOpacity>
                )}
              />
            </LinearGradient>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.startHeader}>
        <LinearGradient colors={gradients.cardElevated as any} style={[styles.startIconCircle, shadows.glow]}>
          <Dumbbell size={44} color={colors.accentBright} strokeWidth={2} />
        </LinearGradient>
        <Text style={styles.startTitle}>Ready to Train?</Text>
        <Text style={styles.startSubtitle}>
          {program ? `Next up: Workout ${program.next_workout} (${program.current_phase})` : 'Start your training journey'}
        </Text>
      </View>

      {workout && (
        <Card variant="hero">
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>
              Workout {workout.type} — {program?.current_phase}
            </Text>
            <GlowBadge label={program?.current_phase?.toUpperCase() ?? '5X5'} />
          </View>
          {workout.exercises.map((ex, i) => (
            <View key={i} style={styles.plannedExercise}>
              <View style={styles.plannedLeft}>
                <View style={styles.exerciseDot} />
                <Text style={styles.plannedName}>{ex.name}</Text>
              </View>
              <Text style={styles.plannedDetail}>
                {ex.sets} sets × {ex.reps} reps @ {ex.weight} kg
              </Text>
            </View>
          ))}
          <View style={{ marginTop: spacing.md }}>
            <PrimaryButton label="Start Workout" onPress={startWorkout} icon={<Flame size={20} color={colors.forest[950]} strokeWidth={2} />} />
          </View>
        </Card>
      )}

      <Card variant="elevated">
        <Text style={styles.cardTitle}>Free Training</Text>
        <Text style={styles.freeDesc}>Log a workout without a planned program. Choose your own exercises.</Text>
        <View style={{ marginTop: spacing.md }}>
          <PrimaryButton label="Start Free Workout" onPress={startFreeWorkout} />
        </View>
      </Card>

      {program && (
        <Card>
          <Text style={styles.cardTitle}>Program Progress</Text>
          <View style={styles.progressRow}>
            <View style={styles.progressIcon}>
              <Flame size={20} color={colors.accent} strokeWidth={2} />
            </View>
            <Text style={styles.progressText}>{program.total_workouts} workouts completed</Text>
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Phase:</Text>
            <Text style={styles.progressValue}>{program.current_phase.toUpperCase()}</Text>
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.forest[950] },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  startHeader: { alignItems: 'center', marginTop: spacing.xxl, marginBottom: spacing.xl },
  startIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(98,200,98,0.2)',
  },
  startTitle: { ...typography.title, marginTop: spacing.md },
  startSubtitle: { ...typography.small, marginTop: spacing.xs, color: colors.forest[300], textAlign: 'center' },
  cardTitle: { ...typography.subheading, marginBottom: spacing.md },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  plannedExercise: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  plannedLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  exerciseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, ...shadows.glow },
  plannedName: { ...typography.body, fontSize: 15 },
  plannedDetail: { ...typography.small, color: colors.accentBright, fontFamily: 'Montserrat-SemiBold' },
  freeDesc: { ...typography.small, color: colors.forest[200] },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  progressIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(98,200,98,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: { ...typography.body, fontSize: 15 },
  progressLabel: { ...typography.small, color: colors.forest[200] },
  progressValue: { ...typography.body, fontSize: 15, color: colors.accentBright, fontFamily: 'Montserrat-SemiBold' },
  // Active workout
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(98,200,98,0.1)',
    paddingTop: spacing.xxl,
  },
  activeTitle: { ...typography.subheading, fontSize: 18 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  timer: { ...typography.small, color: colors.accentBright, fontFamily: 'Montserrat-SemiBold' },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(208,80,74,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseGroup: { padding: spacing.lg },
  exerciseGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  exerciseGroupAccent: { width: 4, height: 22, borderRadius: 2, backgroundColor: colors.accent, ...shadows.glow },
  exerciseGroupTitle: {
    ...typography.subheading,
    fontSize: 18,
    paddingBottom: spacing.xs,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  setRowCompleted: { opacity: 0.5 },
  setNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumberText: { ...typography.body, fontSize: 14, fontFamily: 'Montserrat-SemiBold', color: colors.forest[50] },
  setNumberTextDone: { color: colors.forest[950] },
  setControls: { flex: 1, flexDirection: 'row', gap: spacing.md },
  controlGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  controlBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlValue: { alignItems: 'center', minWidth: 50 },
  controlValueText: { ...typography.body, fontSize: 20, fontFamily: 'Montserrat-SemiBold', color: colors.forest[50] },
  controlUnit: { ...typography.caption, fontSize: 10 },
  checkBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  checkBtnDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accentBright,
    ...shadows.glow,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(98,200,98,0.1)',
    gap: spacing.sm,
  },
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  addExerciseText: { ...typography.small, color: colors.accentBright, fontFamily: 'Montserrat-SemiBold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '70%',
    paddingBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  modalTitle: { ...typography.subheading },
  exerciseOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  exerciseOptionName: { ...typography.body, fontSize: 15, fontFamily: 'Montserrat-SemiBold' },
  exerciseOptionCat: { ...typography.caption, textTransform: 'capitalize' },
  addCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
