import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { supabase, type Exercise } from '@/lib/supabase';
import {
  ensureProgram,
  getWorkoutExercises,
  getSetsRepsForPhase,
  type Program,
} from '@/lib/programEngine';
import { colors, typography, spacing, borderRadius, shadows, gradients } from '@/lib/theme';
import { Card, SectionTitle, PrimaryButton, GlowBadge } from '@/components/ui';
import { CalendarDays, Plus, X, Info, TreePine } from 'lucide-react-native';

export default function ProgramScreen() {
  const { session } = useAuth();
  const [program, setProgram] = useState<Program | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExDesc, setNewExDesc] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user) return;
    const prog = await ensureProgram(session.user.id);
    setProgram(prog);
    const { data: exData } = await supabase.from('exercises').select('*').order('is_standard', { ascending: false });
    setExercises((exData ?? []) as Exercise[]);
  }, [session?.user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const addExercise = async () => {
    if (!newExName.trim() || !session?.user) return;
    const { error } = await supabase.from('exercises').insert({
      name: newExName.trim(),
      description: newExDesc.trim() || null,
      category: 'accessory',
      is_standard: false,
      user_id: session.user.id,
    });
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setNewExName('');
    setNewExDesc('');
    setShowAddExercise(false);
    load();
  };

  const deleteExercise = async (ex: Exercise) => {
    if (ex.is_standard) return;
    Alert.alert('Delete exercise?', `Remove "${ex.name}" from your library?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('exercises').delete().eq('id', ex.id);
          load();
        },
      },
    ]);
  };

  const renderWorkoutPlan = (type: 'A' | 'B') => {
    if (!program) return null;
    const weights = type === 'A' ? program.workout_a_weights : program.workout_b_weights;
    const names = getWorkoutExercises(type);
    const { sets, reps } = getSetsRepsForPhase(program.current_phase);

    return (
      <Card>
        <View style={styles.workoutHeader}>
          <View style={styles.workoutHeaderLeft}>
            <LinearGradient colors={gradients.cardElevated as any} style={styles.workoutIcon}>
              <Text style={styles.workoutIconText}>{type}</Text>
            </LinearGradient>
            <Text style={styles.workoutTitle}>Workout {type}</Text>
          </View>
          {program.next_workout === type && <GlowBadge label="NEXT" />}
        </View>
        {names.map((name, i) => (
          <View key={i} style={styles.planRow}>
            <View style={styles.planLeft}>
              <View style={styles.planDot} />
              <Text style={styles.planName}>{name}</Text>
            </View>
            <Text style={styles.planDetail}>
              {sets}×{reps} @ {weights[name] ?? 40} kg
            </Text>
          </View>
        ))}
      </Card>
    );
  };

  const phaseDescription = (phase: string) => {
    switch (phase) {
      case '5x5': return 'Building base strength with 5 sets of 5 reps. Linear progression — add weight every workout.';
      case '3x5': return 'Intermediate phase. Reduced volume to 3 sets of 5 for heavier lifts. Still linear progression.';
      case '3x3': return 'Advanced phase. Heavy triples for maximal strength. Slower progression, higher intensity.';
      case 'advanced': return 'Periodized training. Varied intensity and volume for continued adaptation.';
      default: return '';
    }
  };

  const standardExercises = exercises.filter((e) => e.is_standard);
  const customExercises = exercises.filter((e) => !e.is_standard);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <View style={styles.header}>
        <LinearGradient colors={gradients.cardElevated as any} style={[styles.headerIcon, shadows.card]}>
          <CalendarDays size={26} color={colors.accentBright} strokeWidth={2} />
        </LinearGradient>
        <Text style={styles.title}>Your Program</Text>
      </View>

      {program && (
        <>
          <Card variant="hero">
            <View style={styles.phaseHeader}>
              <View>
                <Text style={styles.phaseLabel}>Current Phase</Text>
                <Text style={styles.phaseName}>{program.current_phase.toUpperCase()}</Text>
              </View>
              <View style={styles.workoutCount}>
                <Text style={styles.workoutCountNum}>{program.total_workouts}</Text>
                <Text style={styles.workoutCountLabel}>workouts</Text>
              </View>
            </View>
            <Text style={styles.phaseDesc}>{phaseDescription(program.current_phase)}</Text>
          </Card>

          <SectionTitle title="Planned Workouts" />
          {renderWorkoutPlan('A')}
          {renderWorkoutPlan('B')}

          <Card>
            <View style={styles.infoHeader}>
              <View style={styles.infoIcon}>
                <Info size={18} color={colors.forest[300]} strokeWidth={2} />
              </View>
              <Text style={styles.infoTitle}>How Progression Works</Text>
            </View>
            <Text style={styles.infoText}>
              • Squat increases 2.5 kg per workout{'\n'}
              • Bench/Row increases 2.5 kg per workout{'\n'}
              • Overhead Press increases 1 kg per workout{'\n'}
              • Deadlift increases 5 kg per workout{'\n'}
              {'\n'}
              After 3 failed attempts at a weight, deload 10% and build back up.{'\n'}
              {'\n'}
              Your program automatically transitions through phases as you complete more workouts — from 5×5 to 3×5 to 3×3 and beyond.
            </Text>
          </Card>
        </>
      )}

      <SectionTitle title="Exercise Library" action="Add" />
      <TouchableOpacity style={styles.addExBtn} onPress={() => setShowAddExercise(true)}>
        <View style={styles.addExIcon}>
          <Plus size={20} color={colors.accentBright} strokeWidth={2} />
        </View>
        <Text style={styles.addExText}>Add Custom Exercise</Text>
      </TouchableOpacity>

      <Text style={styles.librarySection}>Standard Exercises</Text>
      {standardExercises.map((ex) => (
        <View key={ex.id} style={styles.exerciseItem}>
          <View>
            <Text style={styles.exItemName}>{ex.name}</Text>
            <Text style={styles.exItemDesc}>{ex.description}</Text>
          </View>
          <View style={styles.exBadge}>
            <Text style={styles.exBadgeText}>{ex.category}</Text>
          </View>
        </View>
      ))}

      {customExercises.length > 0 && (
        <>
          <Text style={styles.librarySection}>My Custom Exercises</Text>
          {customExercises.map((ex) => (
            <TouchableOpacity key={ex.id} style={styles.exerciseItem} onPress={() => deleteExercise(ex)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.exItemName}>{ex.name}</Text>
                <Text style={styles.exItemDesc}>{ex.description ?? 'No description'}</Text>
              </View>
              <View style={[styles.exBadge, { backgroundColor: 'rgba(184,147,96,0.15)' }]}>
                <Text style={[styles.exBadgeText, { color: colors.earth[300] }]}>{ex.category}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

      <Modal visible={showAddExercise} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <LinearGradient colors={gradients.card as any} style={[styles.modalContent, shadows.tabbar]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Custom Exercise</Text>
              <TouchableOpacity onPress={() => setShowAddExercise(false)}>
                <X size={24} color={colors.forest[200]} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Exercise Name</Text>
            <TextInput
              style={styles.input}
              value={newExName}
              onChangeText={setNewExName}
              placeholder="e.g. Bulgarian Split Squat"
              placeholderTextColor={colors.forest[300]}
            />
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              value={newExDesc}
              onChangeText={setNewExDesc}
              placeholder="Brief description of the exercise..."
              placeholderTextColor={colors.forest[300]}
              multiline
              textAlignVertical="top"
            />
            <View style={{ marginTop: spacing.md }}>
              <PrimaryButton label="Add Exercise" onPress={addExercise} disabled={!newExName.trim()} />
            </View>
          </LinearGradient>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.forest[950] },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.lg },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  title: { ...typography.title, fontSize: 24 },
  phaseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  phaseLabel: { ...typography.caption, textTransform: 'uppercase', letterSpacing: 1.5, color: colors.forest[300] },
  phaseName: { ...typography.number, fontSize: 28, color: colors.accentBright },
  workoutCount: { alignItems: 'center' },
  workoutCountNum: { ...typography.number, fontSize: 28, color: colors.forest[200] },
  workoutCountLabel: { ...typography.caption },
  phaseDesc: { ...typography.small, color: colors.forest[200], lineHeight: 22 },
  workoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  workoutHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  workoutIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutIconText: { ...typography.subheading, fontSize: 16, color: colors.accentBright, fontFamily: 'Montserrat-Bold' },
  workoutTitle: { ...typography.subheading, fontSize: 18 },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  planLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  planDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, ...shadows.glow },
  planName: { ...typography.body, fontSize: 15 },
  planDetail: { ...typography.small, color: colors.accentBright, fontFamily: 'Montserrat-SemiBold' },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: { ...typography.subheading, fontSize: 16 },
  infoText: { ...typography.small, color: colors.forest[200], lineHeight: 22 },
  addExBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.md, marginBottom: spacing.md, borderRadius: borderRadius.md, backgroundColor: 'rgba(98,200,98,0.06)', borderWidth: 1, borderColor: 'rgba(98,200,98,0.12)' },
  addExIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(98,200,98,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addExText: { ...typography.body, fontSize: 15, color: colors.accentBright, fontFamily: 'Montserrat-SemiBold' },
  librarySection: { ...typography.subheading, fontSize: 16, marginTop: spacing.lg, marginBottom: spacing.sm, color: colors.forest[200] },
  exerciseItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.md, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: borderRadius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  exItemName: { ...typography.body, fontSize: 15, fontFamily: 'Montserrat-SemiBold' },
  exItemDesc: { ...typography.caption, marginTop: spacing.xs },
  exBadge: { backgroundColor: 'rgba(98,200,98,0.1)', borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  exBadgeText: { ...typography.caption, textTransform: 'capitalize', fontFamily: 'Montserrat-SemiBold', color: colors.accentBright },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.lg, paddingBottom: spacing.xxl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { ...typography.subheading, fontSize: 18 },
  label: { ...typography.small, marginBottom: spacing.xs, marginTop: spacing.sm, color: colors.forest[200] },
  input: { backgroundColor: colors.forest[950], borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.forest[50], fontSize: 16, fontFamily: 'Inter-Regular', borderWidth: 1, borderColor: 'rgba(98,200,98,0.1)', marginBottom: spacing.sm },
});
