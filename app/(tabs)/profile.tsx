import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useAuth, validatePassword, PASSWORD_REQUIREMENTS } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors, typography, spacing, borderRadius, shadows, gradients } from '@/lib/theme';
import { Card, SectionTitle, StatCard, GlowBadge } from '@/components/ui';
import { formatVolume, estimate1RM } from '@/lib/programEngine';
import { Trophy, LogOut, TrendingUp, Dumbbell, Medal, Settings, X, Lock, Flame } from 'lucide-react-native';

type LeaderboardEntry = {
  user_id: string;
  username: string;
  display_name: string;
  total_volume: number;
  workout_count: number;
};

type PR = {
  exercise_name: string;
  weight: number;
  reps: number;
  est_1rm: number;
};

export default function ProfileScreen() {
  const { profile, session, signOut, updatePassword } = useAuth();
  const [totalVolume, setTotalVolume] = useState(0);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [prs, setPRs] = useState<PR[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardType, setLeaderboardType] = useState<'volume' | '1rm'>('volume');
  const [oneRMLeaderboard, setOneRMLeaderboard] = useState<{ user_id: string; display_name: string; exercise_name: string; est_1rm: number }[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('Squat');
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user) return;
    const userId = session.user.id;

    const { data: myWorkouts } = await supabase
      .from('workouts')
      .select('total_volume')
      .eq('user_id', userId);

    const all = myWorkouts ?? [];
    setWorkoutCount(all.length);
    setTotalVolume(all.reduce((sum, w) => sum + Number(w.total_volume), 0));

    const { data: mySets } = await supabase
      .from('workout_sets')
      .select('weight, reps, exercise_id, workout_id')
      .in('workout_id', (await supabase.from('workouts').select('id').eq('user_id', userId)).data?.map((w: any) => w.id) ?? []);

    const { data: exercises } = await supabase.from('exercises').select('id, name');
    const exMap = new Map((exercises ?? []).map((e: any) => [e.id, e.name]));

    const prMap: Record<string, PR> = {};
    for (const s of mySets ?? []) {
      const name = exMap.get(s.exercise_id) ?? 'Unknown';
      const e1rm = estimate1RM(Number(s.weight), s.reps);
      if (!prMap[name] || e1rm > prMap[name].est_1rm) {
        prMap[name] = { exercise_name: name, weight: Number(s.weight), reps: s.reps, est_1rm: e1rm };
      }
    }
    setPRs(Object.values(prMap).sort((a, b) => b.est_1rm - a.est_1rm));

    const { data: volData } = await supabase.rpc('get_leaderboard_volume');
    if (volData) {
      setLeaderboard((volData as LeaderboardEntry[]).sort((a, b) => b.total_volume - a.total_volume));
    }

    const { data: oneRmData } = await supabase.rpc('get_leaderboard_1rm', { ex_name: selectedExercise });
    if (oneRmData) {
      setOneRMLeaderboard(oneRmData as any);
    }
  }, [session?.user, selectedExercise]);

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

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setPasswordError('Please fill in both fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    const pwError = validatePassword(newPassword);
    if (pwError) {
      setPasswordError(pwError);
      return;
    }
    setPasswordBusy(true);
    const result = await updatePassword(newPassword);
    setPasswordBusy(false);
    if (result.error) {
      setPasswordError(result.error);
    } else {
      setPasswordSuccess('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const myRank = leaderboard.findIndex((e) => e.user_id === session?.user?.id) + 1;
  const standardExNames = ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press', 'Barbell Row'];
  const my1rmRank = oneRMLeaderboard.findIndex((e) => e.user_id === session?.user?.id) + 1;

  const renderMedal = (index: number) => {
    if (index === 0) return <Medal size={22} color={colors.gold} strokeWidth={2} />;
    if (index === 1) return <Medal size={22} color="#c0c0c0" strokeWidth={2} />;
    if (index === 2) return <Medal size={22} color="#cd7f32" strokeWidth={2} />;
    return <Text style={styles.lbRankText}>{index + 1}</Text>;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <View style={styles.header}>
        <LinearGradient colors={gradients.avatar as any} style={[styles.avatarLarge, shadows.glow]}>
          <Text style={styles.avatarLargeText}>
            {(profile?.display_name ?? '?')[0].toUpperCase()}
          </Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.displayName}>{profile?.display_name ?? 'Athlete'}</Text>
          <Text style={styles.username}>@{profile?.username}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.headerBtn}>
          <Settings size={20} color={colors.forest[200]} strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSignOut} style={[styles.headerBtn, { marginLeft: spacing.sm }]}>
          <LogOut size={20} color={colors.forest[200]} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Workouts" value={String(workoutCount)} icon={<Flame size={20} color={colors.accent} strokeWidth={2} />} />
        <StatCard label="Total Volume" value={formatVolume(totalVolume)} icon={<TrendingUp size={20} color={colors.accent} strokeWidth={2} />} />
      </View>

      <SectionTitle title="Personal Records" />
      {prs.length > 0 ? (
        prs.map((pr, i) => (
          <Card key={i} style={styles.prCard}>
            <View style={styles.prHeader}>
              <LinearGradient colors={gradients.cardElevated as any} style={[styles.prRank, shadows.statCard]}>
                <Text style={styles.prRankText}>{i + 1}</Text>
              </LinearGradient>
              <Text style={styles.prName}>{pr.exercise_name}</Text>
              <Text style={styles.pr1rm}>{Math.round(pr.est_1rm)} kg</Text>
            </View>
            <Text style={styles.prDetail}>Best set: {pr.weight} kg × {pr.reps} reps (est. 1RM)</Text>
          </Card>
        ))
      ) : (
        <Card>
          <Text style={styles.emptyText}>No personal records yet. Start training!</Text>
        </Card>
      )}

      <SectionTitle title="Leaderboard" />

      <View style={styles.lbTabs}>
        <TouchableOpacity
          style={[styles.lbTab, leaderboardType === 'volume' && styles.lbTabActive]}
          onPress={() => setLeaderboardType('volume')}
        >
          {leaderboardType === 'volume' ? (
            <LinearGradient colors={gradients.buttonPrimary as any} style={styles.lbTabGradient}>
              <TrendingUp size={16} color={colors.forest[950]} strokeWidth={2} />
              <Text style={styles.lbTabTextActive}>Total Volume</Text>
            </LinearGradient>
          ) : (
            <View style={styles.lbTabInner}>
              <TrendingUp size={16} color={colors.forest[300]} strokeWidth={2} />
              <Text style={styles.lbTabText}>Total Volume</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.lbTab, leaderboardType === '1rm' && styles.lbTabActive]}
          onPress={() => setLeaderboardType('1rm')}
        >
          {leaderboardType === '1rm' ? (
            <LinearGradient colors={gradients.buttonPrimary as any} style={styles.lbTabGradient}>
              <Dumbbell size={16} color={colors.forest[950]} strokeWidth={2} />
              <Text style={styles.lbTabTextActive}>1RM Lifts</Text>
            </LinearGradient>
          ) : (
            <View style={styles.lbTabInner}>
              <Dumbbell size={16} color={colors.forest[300]} strokeWidth={2} />
              <Text style={styles.lbTabText}>1RM Lifts</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {leaderboardType === 'volume' ? (
        <>
          {myRank > 0 && (
            <View style={styles.myRankBanner}>
              <Medal size={20} color={colors.accent} strokeWidth={2} />
              <Text style={styles.myRankText}>Your rank: #{myRank} of {leaderboard.length}</Text>
            </View>
          )}
          {leaderboard.slice(0, 20).map((entry, i) => {
            const isMe = entry.user_id === session?.user?.id;
            return (
              <View
                key={entry.user_id}
                style={[styles.lbRow, isMe && styles.lbRowMe, i === 0 && styles.lbRowTop]}
              >
                <View style={styles.lbRank}>
                  {renderMedal(i)}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lbName}>{entry.display_name}</Text>
                  <Text style={styles.lbSub}>{entry.workout_count} workouts</Text>
                </View>
                <Text style={styles.lbVolume}>{formatVolume(Number(entry.total_volume))}</Text>
              </View>
            );
          })}
        </>
      ) : (
        <>
          <Text style={styles.lbSelectLabel}>Select exercise:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.exSelectScroll}>
            {standardExNames.map((name) => (
              <TouchableOpacity
                key={name}
                style={[styles.exSelectChip, selectedExercise === name && styles.exSelectChipActive]}
                onPress={() => setSelectedExercise(name)}
              >
                <Text style={[styles.exSelectChipText, selectedExercise === name && styles.exSelectChipTextActive]}>
                  {name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {my1rmRank > 0 && (
            <View style={styles.myRankBanner}>
              <Medal size={20} color={colors.accent} strokeWidth={2} />
              <Text style={styles.myRankText}>Your rank: #{my1rmRank} in {selectedExercise}</Text>
            </View>
          )}

          {oneRMLeaderboard.slice(0, 20).map((entry, i) => {
            const isMe = entry.user_id === session?.user?.id;
            return (
              <View
                key={`${entry.user_id}-${i}`}
                style={[styles.lbRow, isMe && styles.lbRowMe, i === 0 && styles.lbRowTop]}
              >
                <View style={styles.lbRank}>
                  {renderMedal(i)}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lbName}>{entry.display_name}</Text>
                  <Text style={styles.lbSub}>{entry.exercise_name}</Text>
                </View>
                <Text style={styles.lbVolume}>{Math.round(entry.est_1rm)} kg</Text>
              </View>
            );
          })}
          {oneRMLeaderboard.length === 0 && (
            <Card>
              <Text style={styles.emptyText}>No lifts logged for {selectedExercise} yet.</Text>
            </Card>
          )}
        </>
      )}

      <Modal visible={showSettings} animationType="slide" transparent>
        <View style={styles.settingsOverlay}>
          <LinearGradient colors={gradients.card as any} style={[styles.settingsContent, shadows.tabbar]}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>Settings</Text>
              <TouchableOpacity onPress={() => { setShowSettings(false); setPasswordError(null); setPasswordSuccess(null); setNewPassword(''); setConfirmPassword(''); }}>
                <X size={24} color={colors.forest[200]} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingsSection}>
              <View style={styles.settingsSectionHeader}>
                <View style={styles.settingsSectionIcon}>
                  <Lock size={16} color={colors.accentBright} strokeWidth={2} />
                </View>
                <Text style={styles.settingsSectionTitle}>Change Password</Text>
              </View>
              <Text style={styles.settingsLabel}>New Password</Text>
              <TextInput
                style={styles.settingsInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.forest[300]}
                secureTextEntry
              />
              <Text style={styles.settingsLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.settingsInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.forest[300]}
                secureTextEntry
              />
              <Text style={styles.passwordHint}>{PASSWORD_REQUIREMENTS}</Text>
              {passwordError && <Text style={styles.settingsError}>{passwordError}</Text>}
              {passwordSuccess && <Text style={styles.settingsSuccess}>{passwordSuccess}</Text>}
              <TouchableOpacity
                style={[styles.settingsButton, shadows.button, passwordBusy && styles.settingsButtonDisabled]}
                onPress={handleChangePassword}
                disabled={passwordBusy}
                activeOpacity={0.85}
              >
                <LinearGradient colors={gradients.buttonPrimary as any} style={styles.settingsButtonGradient}>
                  {passwordBusy ? (
                    <ActivityIndicator color={colors.forest[950]} />
                  ) : (
                    <Text style={styles.settingsButtonText}>Update Password</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.settingsSection}>
              <TouchableOpacity style={styles.signOutRow} onPress={handleSignOut}>
                <LogOut size={18} color={colors.error} strokeWidth={2} />
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xl, marginBottom: spacing.lg },
  avatarLarge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  avatarLargeText: { ...typography.title, fontSize: 28, color: colors.forest[50] },
  displayName: { ...typography.subheading, fontSize: 20 },
  username: { ...typography.small, color: colors.forest[200] },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', marginBottom: spacing.sm },
  prCard: { marginBottom: spacing.sm },
  prHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  prRank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prRankText: { ...typography.body, fontSize: 14, fontFamily: 'Montserrat-SemiBold', color: colors.accentBright },
  prName: { ...typography.body, fontSize: 15, fontFamily: 'Montserrat-SemiBold', flex: 1 },
  pr1rm: { ...typography.body, fontSize: 18, fontFamily: 'Montserrat-Bold', color: colors.accentBright },
  prDetail: { ...typography.caption, marginTop: spacing.xs, paddingLeft: 44 },
  emptyText: { ...typography.body, textAlign: 'center', color: colors.forest[300] },
  lbTabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  lbTab: { flex: 1, borderRadius: borderRadius.md, overflow: 'hidden' },
  lbTabActive: {},
  lbTabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
  },
  lbTabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  lbTabText: { ...typography.small, color: colors.forest[300], fontFamily: 'Montserrat-SemiBold' },
  lbTabTextActive: { color: colors.forest[950], fontFamily: 'Montserrat-SemiBold' },
  myRankBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(98,200,98,0.08)', borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md, borderWidth: 1, borderColor: 'rgba(98,200,98,0.2)' },
  myRankText: { ...typography.body, fontSize: 14, color: colors.accentBright, fontFamily: 'Montserrat-SemiBold' },
  lbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.md, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: borderRadius.md, marginBottom: spacing.xs, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  lbRowMe: { borderColor: colors.accent, borderWidth: 2, backgroundColor: 'rgba(98,200,98,0.06)' },
  lbRowTop: { borderColor: 'rgba(232,184,74,0.3)', borderWidth: 1 },
  lbRank: { width: 36, alignItems: 'center' },
  lbRankText: { ...typography.body, fontSize: 16, fontFamily: 'Montserrat-SemiBold', color: colors.forest[200] },
  lbName: { ...typography.body, fontSize: 15, fontFamily: 'Montserrat-SemiBold' },
  lbSub: { ...typography.caption },
  lbVolume: { ...typography.body, fontSize: 16, fontFamily: 'Montserrat-Bold', color: colors.accentBright },
  lbSelectLabel: { ...typography.small, color: colors.forest[200], marginBottom: spacing.xs },
  exSelectScroll: { flexDirection: 'row', marginBottom: spacing.md },
  exSelectChip: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginRight: spacing.xs, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  exSelectChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  exSelectChipText: { ...typography.small, color: colors.forest[200], fontFamily: 'Montserrat-SemiBold' },
  exSelectChipTextActive: { color: colors.forest[950] },
  settingsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  settingsContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  settingsTitle: {
    ...typography.subheading,
    fontSize: 20,
  },
  settingsSection: {
    marginBottom: spacing.lg,
  },
  settingsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  settingsSectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(98,200,98,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsSectionTitle: {
    ...typography.subheading,
    fontSize: 16,
  },
  settingsLabel: {
    ...typography.small,
    color: colors.forest[200],
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  settingsInput: {
    backgroundColor: colors.forest[950],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.forest[50],
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    borderWidth: 1,
    borderColor: 'rgba(98,200,98,0.1)',
    marginBottom: spacing.xs,
  },
  settingsError: {
    color: colors.error,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginTop: spacing.sm,
  },
  settingsSuccess: {
    color: colors.accentBright,
    fontSize: 14,
    fontFamily: 'Montserrat-SemiBold',
    marginTop: spacing.sm,
  },
  settingsButton: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  settingsButtonGradient: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButtonDisabled: {
    opacity: 0.5,
  },
  settingsButtonText: {
    color: colors.forest[950],
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
  },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  signOutText: {
    ...typography.body,
    fontSize: 16,
    color: colors.error,
    fontFamily: 'Montserrat-SemiBold',
  },
  passwordHint: {
    ...typography.caption,
    color: colors.forest[300],
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
});
