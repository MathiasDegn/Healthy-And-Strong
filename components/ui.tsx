import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius, shadows, gradients } from '@/lib/theme';

export function Card({ children, style, variant = 'default' }: { children: React.ReactNode; style?: any; variant?: 'default' | 'elevated' | 'hero' }) {
  const grad = variant === 'hero' ? gradients.heroCard : variant === 'elevated' ? gradients.cardElevated : gradients.card;
  return (
    <LinearGradient
      colors={grad as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.card, shadows.card, style]}
    >
      {children}
    </LinearGradient>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionAccent} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action && <Text style={styles.sectionAction}>{action}</Text>}
    </View>
  );
}

export function StatCard({
  label,
  value,
  sublabel,
  icon,
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon?: React.ReactNode;
}) {
  return (
    <LinearGradient
      colors={gradients.statCard as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.statCard, shadows.statCard]}
    >
      {icon && <View style={styles.statIcon}>{icon}</View>}
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {sublabel && <Text style={styles.statSublabel}>{sublabel}</Text>}
    </LinearGradient>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      style={[styles.primaryButton, shadows.button, disabled && styles.primaryButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={gradients.buttonPrimary as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primaryButtonGradient}
      >
        {icon}
        <Text style={styles.primaryButtonText}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function GlowBadge({ label, color = 'accent' }: { label: string; color?: 'accent' | 'gold' }) {
  const glow = color === 'gold' ? shadows.goldGlow : shadows.glow;
  const bg = color === 'gold' ? colors.gold : colors.accent;
  return (
    <View style={[styles.glowBadge, glow, { backgroundColor: bg }]}>
      <Text style={styles.glowBadgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionAccent: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  sectionTitle: {
    ...typography.subheading,
  },
  sectionAction: {
    ...typography.small,
    color: colors.accent,
    fontFamily: 'Montserrat-SemiBold',
  },
  statCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flex: 1,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statIcon: {
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: colors.forest[200],
  },
  statValue: {
    ...typography.number,
    fontSize: 24,
    color: colors.accentBright,
  },
  statSublabel: {
    ...typography.caption,
    marginTop: spacing.xs,
    color: colors.forest[300],
  },
  primaryButton: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    color: colors.forest[950],
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
  },
  glowBadge: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  glowBadgeText: {
    color: colors.forest[950],
    fontFamily: 'Montserrat-Bold',
    fontSize: 11,
  },
});
