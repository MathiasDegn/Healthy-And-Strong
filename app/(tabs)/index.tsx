import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/lib/auth';
import { supabase, type Workout, type Profile } from '@/lib/supabase';
import {
  ensureProgram,
  buildWorkoutFromProgram,
  type Program,
  type WorkoutDefinition,
  formatVolume,
  formatDate,
  estimate1RM,
} from '@/lib/programEngine';
import { colors, typography, spacing, borderRadius, shadows, gradients } from '@/lib/theme';
import { Card, SectionTitle, StatCard, GlowBadge } from '@/components/ui';
import { Dumbbell, TrendingUp, Trophy, Flame, TreePine, Medal } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';

export default function HomeScreen() {
  const { profile, session } = useAuth();
  const [program, setProgram] = useState<Program | null>(null);
  const [nextWorkout, setNextWorkout] = useState<WorkoutDefinition | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<(Workout & { profiles: Pick<Profile, 'username' | 'display_name'> })[]>([]);
  const [totalVolume, setTotalVolume] = useState(0);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [bestLift, setBestLift] = useState<{ name: string; weight: number } | null>(null);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!session?.user) return;
    const userId = session.user.id;

    const prog = await ensureProgram(userId);
    setProgram(prog);
    if (prog) {
      const { data: exercises } = await supabase.from('exercises').select('*');
      const exMap = new Map((exercises ?? []).map((e: any) => [e.name, e]));
      setNextWorkout(buildWorkoutFromProgram(prog, exMap));
    }

    const { data: workouts } = await supabase
      .from('workouts')
      .select('*, profiles!inner(username, display_name)')
      .order('started_at', { ascending: false })
      .limit(10);

    setRecentWorkouts((workouts ?? []) as any);

    const { data: myWorkouts } = await supabase
      .from('workouts')
      .select('total_volume')
      .eq('user_id', userId);

    const allMyWorkouts = myWorkouts ?? [];
    setWorkoutCount(allMyWorkouts.length);
    setTotalVolume(allMyWorkouts.reduce((sum, w) => sum + Number(w.total_volume), 0));

    const { data: bestSet } = await supabase
      .from('workout_sets')
      .select('weight, reps, exercise_id')
      .order('weight', { ascending: false })
      .limit(50);

    if (bestSet && bestSet.length > 0) {
      const { data: exercises } = await supabase.from('exercises').select('id, name');
      const exMap = new Map((exercises ?? []).map((e: any) => [e.id, e.name]));
      let best = { name: '', weight: 0 };
      for (const s of bestSet) {
        const name = exMap.get(s.exercise_id) ?? '';
        const e1rm = estimate1RM(Number(s.weight), s.reps);
        if (e1rm > best.weight) best = { name, weight: e1rm };
      }
      if (best.name) setBestLift(best);
    }

    const { data: volData } = await supabase.rpc('get_leaderboard_volume');
    if (volData) {
      const ranked = (volData as any[]).sort((a, b) => b.total_volume - a.total_volume);
      const rank = ranked.findIndex((r) => r.user_id === userId);
      setLeaderboardRank(rank >= 0 ? rank + 1 : null);
    }
  }, [session?.user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.name}>{profile?.display_name ?? 'Athlete'}</Text>
        </View>
        <LinearGradient colors={gradients.cardElevated as any} style={[styles.headerIcon, shadows.card]}>
          <TreePine size={28} color={colors.forest[300]} strokeWidth={2} />
        </LinearGradient>
      </View>

      {nextWorkout && (
        <Card variant="hero" style={styles.heroCard}>
          <LinearGradient colors={['rgba(98,200,98,0.08)', 'transparent'] as any} style={styles.heroOverlay}>
            <View style={styles.cardHeader}>
              <LinearGradient colors={gradients.cardElevated as any} style={[styles.iconCircle, shadows.glow]}>
                <Dumbbell size={22} color={colors.accentBright} strokeWidth={2} />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Next Workout</Text>
                <Text style={styles.cardSubtitle}>
                  {nextWorkout.type === 'A' ? 'Workout A' : 'Workout B'} · {program?.current_phase ?? '5x5'}
                </Text>
              </View>
              <GlowBadge label={program?.current_phase?.toUpperCase() ?? '5X5'} />
            </View>
            {nextWorkout.exercises.map((ex, i) => (
              <View key={i} style={styles.exerciseRow}>
                <View style={styles.exerciseLeft}>
                  <View style={styles.exerciseDot} />
                  <Text style={styles.exerciseName}>{ex.name}</Text>
                </View>
                <Text style={styles.exerciseDetail}>
                  {ex.sets}×{ex.reps} @ {ex.weight} kg
                </Text>
              </View>
            ))}
          </LinearGradient>
        </Card>
      )}

      <SectionTitle title="Your Stats" />
      <View style={styles.statsRow}>
        <StatCard
          label="Workouts"
          value={String(workoutCount)}
          icon={<Flame size={20} color={colors.accent} strokeWidth={2} />}
        />
        <StatCard
          label="Total Volume"
          value={formatVolume(totalVolume)}
          icon={<TrendingUp size={20} color={colors.accent} strokeWidth={2} />}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          label="Best Lift"
          value={bestLift ? `${Math.round(bestLift.weight)} kg` : '—'}
          sublabel={bestLift?.name}
          icon={<Dumbbell size={20} color={colors.accent} strokeWidth={2} />}
        />
        <StatCard
          label="Rank"
          value={leaderboardRank ? `#${leaderboardRank}` : '—'}
          sublabel="Total volume"
          icon={<Medal size={20} color={colors.gold} strokeWidth={2} />}
        />
      </View>

      <SectionTitle title="Recent Activity" />
      {recentWorkouts.slice(0, 5).map((w, i) => (
        <Card key={w.id} style={styles.feedCard}>
          <View style={styles.feedHeader}>
            <LinearGradient colors={gradients.avatar as any} style={[styles.feedAvatar, shadows.statCard]}>
              <Text style={styles.feedAvatarText}>
                {(w.profiles?.display_name ?? '?')[0].toUpperCase()}
              </Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.feedName}>{w.profiles?.display_name ?? 'Unknown'}</Text>
              <Text style={styles.feedDate}>{formatDate(w.started_at)}</Text>
            </View>
            <View style={styles.volumePill}>
              <Text style={styles.feedVolume}>{formatVolume(Number(w.total_volume))}</Text>
            </View>
          </View>
          <Text style={styles.feedType}>
            {w.workout_type === 'A' ? 'Workout A' : w.workout_type === 'B' ? 'Workout B' : 'Free Training'}
          </Text>
        </Card>
      ))}
      {recentWorkouts.length === 0 && (
        <Card>
          <Text style={styles.emptyText}>No workouts yet. Start your first training session!</Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.forest[950] },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.xl,
  },
  greeting: { ...typography.small, color: colors.forest[300] },
  name: { ...typography.title, fontSize: 24 },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  heroCard: {
    padding: 0,
    overflow: 'hidden',
  },
  heroOverlay: {
    padding: spacing.lg,
  borderRadius: borderRadius.lg,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(98,200,98,0.2)',
  },
  cardTitle: { ...typography.subheading, fontSize: 16, color: colors.forest[50] },
  cardSubtitle: { ...typography.caption, color: colors.forest[300], marginTop: 2 },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  exerciseLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  exerciseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  ...shadows.glow,
  },
  exerciseName: { ...typography.body, fontSize: 15 },
  exerciseDetail: { ...typography.small, color: colors.accentBright, fontFamily: 'Montserrat-SemiBold' },
  statsRow: { flexDirection: 'row', marginBottom: spacing.sm },
  feedCard: { marginBottom: spacing.sm },
  feedHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  feedAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  feedAvatarText: { ...typography.subheading, fontSize: 18, color: colors.forest[50] },
  feedName: { ...typography.body, fontSize: 15, fontFamily: 'Montserrat-SemiBold' },
  feedDate: { ...typography.caption },
  volumePill: {
    backgroundColor: 'rgba(98,200,98,0.12)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
  },
  feedVolume: { ...typography.small, color: colors.accentBright, fontFamily: 'Montserrat-SemiBold' },
  feedType: { ...typography.small, marginTop: spacing.xs, color: colors.forest[300], fontFamily: 'Montserrat-SemiBold' },
  emptyText: { ...typography.body, textAlign: 'center', color: colors.forest[300] },
});
