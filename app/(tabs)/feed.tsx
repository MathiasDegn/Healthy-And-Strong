import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { supabase, type Workout, type Profile, type WorkoutSet } from '@/lib/supabase';
import { colors, typography, spacing, borderRadius, shadows, gradients } from '@/lib/theme';
import { Card } from '@/components/ui';
import { formatVolume, formatDate } from '@/lib/programEngine';
import { Users, ChevronDown } from 'lucide-react-native';

type FeedItem = Workout & {
  profiles: Pick<Profile, 'username' | 'display_name'>;
  workout_sets: WorkoutSet[];
};

export default function FeedScreen() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [exercises, setExercises] = useState<Map<string, string>>(new Map());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data: exData } = await supabase.from('exercises').select('id, name');
    const exMap = new Map((exData ?? []).map((e: any) => [e.id, e.name]));
    setExercises(exMap);

    const { data: workouts } = await supabase
      .from('workouts')
      .select('*, profiles!inner(username, display_name), workout_sets(*)')
      .order('started_at', { ascending: false })
      .limit(50);

    setFeed((workouts ?? []) as FeedItem[]);
  }, []);

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

  const getWorkoutSummary = (item: FeedItem) => {
    const setsByExercise: Record<string, WorkoutSet[]> = {};
    for (const s of item.workout_sets) {
      const name = exercises.get(s.exercise_id) ?? 'Unknown';
      if (!setsByExercise[name]) setsByExercise[name] = [];
      setsByExercise[name].push(s);
    }
    return Object.entries(setsByExercise);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <View style={styles.header}>
        <LinearGradient colors={gradients.cardElevated as any} style={[styles.headerIcon, shadows.card]}>
          <Users size={26} color={colors.accentBright} strokeWidth={2} />
        </LinearGradient>
        <Text style={styles.title}>Community Feed</Text>
      </View>

      {feed.length === 0 && (
        <Card>
          <Text style={styles.emptyText}>No workouts yet. Be the first to train!</Text>
        </Card>
      )}

      {feed.map((item) => {
        const isExpanded = expanded === item.id;
        const summary = getWorkoutSummary(item);
        return (
          <Card key={item.id}>
            <TouchableOpacity
              style={styles.feedHeader}
              onPress={() => setExpanded(isExpanded ? null : item.id)}
              activeOpacity={0.7}
            >
              <LinearGradient colors={gradients.avatar as any} style={[styles.avatar, shadows.statCard]}>
                <Text style={styles.avatarText}>
                  {(item.profiles?.display_name ?? '?')[0].toUpperCase()}
                </Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.feedName}>{item.profiles?.display_name ?? 'Unknown'}</Text>
                <Text style={styles.feedDate}>{formatDate(item.started_at)}</Text>
              </View>
              <View style={styles.volumeBadge}>
                <Text style={styles.volumeText}>{formatVolume(Number(item.total_volume))}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.workoutTypeRow}>
              <Text style={styles.workoutType}>
                {item.workout_type === 'A' ? 'Workout A' : item.workout_type === 'B' ? 'Workout B' : 'Free Training'}
              </Text>
              <ChevronDown
                size={16}
                color={colors.forest[400]}
                strokeWidth={2}
                style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
              />
            </View>

            {isExpanded ? (
              <View style={styles.detailSection}>
                {summary.map(([name, sets]) => (
                  <View key={name} style={styles.exerciseDetail}>
                    <View style={styles.exerciseDetailHeader}>
                      <View style={styles.exerciseDot} />
                      <Text style={styles.exerciseDetailName}>{name}</Text>
                    </View>
                    {sets.map((s, i) => (
                      <View key={i} style={styles.setRow}>
                        <Text style={styles.setLabel}>Set {s.set_number}</Text>
                        <Text style={styles.setDetail}>{s.reps} reps @ {s.weight} kg</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.summaryRow}>
                {summary.slice(0, 3).map(([name]) => (
                  <View key={name} style={styles.summaryChip}>
                    <Text style={styles.summaryChipText}>{name}</Text>
                  </View>
                ))}
                {summary.length > 3 && (
                  <Text style={styles.moreText}>+{summary.length - 3} more</Text>
                )}
              </View>
            )}
          </Card>
        );
      })}
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
  emptyText: { ...typography.body, textAlign: 'center', color: colors.forest[300] },
  feedHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  avatarText: { ...typography.subheading, fontSize: 20, color: colors.forest[50] },
  feedName: { ...typography.body, fontSize: 15, fontFamily: 'Montserrat-SemiBold' },
  feedDate: { ...typography.caption },
  volumeBadge: {
    backgroundColor: 'rgba(98,200,98,0.12)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
  },
  volumeText: { ...typography.small, color: colors.accentBright, fontFamily: 'Montserrat-SemiBold' },
  workoutTypeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  workoutType: { ...typography.small, color: colors.forest[300], fontFamily: 'Montserrat-SemiBold' },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  summaryChip: {
    backgroundColor: 'rgba(98,200,98,0.08)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(98,200,98,0.1)',
  },
  summaryChipText: { ...typography.caption, color: colors.forest[100] },
  moreText: { ...typography.caption, color: colors.forest[300], paddingVertical: spacing.xs },
  detailSection: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  exerciseDetail: { marginBottom: spacing.md },
  exerciseDetailHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  exerciseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, ...shadows.glow },
  exerciseDetailName: { ...typography.body, fontSize: 15, fontFamily: 'Montserrat-SemiBold' },
  setRow: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: spacing.lg, paddingVertical: 3 },
  setLabel: { ...typography.small, color: colors.forest[300] },
  setDetail: { ...typography.small, color: colors.forest[200], fontFamily: 'Montserrat-SemiBold' },
});
