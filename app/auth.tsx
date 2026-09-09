import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, validatePassword, PASSWORD_REQUIREMENTS } from '@/lib/auth';
import { colors, typography, spacing, borderRadius, shadows, gradients } from '@/lib/theme';
import { Dumbbell, X } from 'lucide-react-native';

export default function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetBusy, setResetBusy] = useState(false);

  const handleResetPassword = async () => {
    setResetMessage(null);
    if (!resetEmail.trim()) {
      setResetMessage('Please enter your email address.');
      return;
    }
    setResetBusy(true);
    const result = await resetPassword(resetEmail.trim());
    setResetBusy(false);
    if (result.error) {
      setResetMessage(result.error);
    } else {
      setResetMessage('Reset link sent! Check your email.');
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Please fill in email and password.');
      return;
    }
    if (mode === 'signup' && (!username.trim() || !displayName.trim())) {
      setError('Please choose a username and display name.');
      return;
    }
    if (mode === 'signup') {
      const pwError = validatePassword(password);
      if (pwError) {
        setError(pwError);
        return;
      }
    }
    setBusy(true);
    const result =
      mode === 'signin'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, username.trim(), displayName.trim());
    setBusy(false);
    if (result.error) setError(result.error);
  };

  return (
    <LinearGradient colors={gradients.background as any} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'web' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <LinearGradient colors={gradients.cardElevated as any} style={[styles.logoCircle, shadows.glow]}>
              <Dumbbell size={40} color={colors.accentBright} strokeWidth={2} />
            </LinearGradient>
            <Text style={styles.appName}>Healthy And Strong</Text>
            <Text style={styles.tagline}>Train smart. Get strong. Together.</Text>
          </View>

          <LinearGradient colors={gradients.card as any} style={[styles.card, shadows.card]}>
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, mode === 'signin' && styles.tabActive]}
                onPress={() => setMode('signin')}
              >
                {mode === 'signin' && (
                  <LinearGradient colors={gradients.buttonPrimary as any} style={styles.tabGradient}>
                    <Text style={styles.tabTextActive}>Sign In</Text>
                  </LinearGradient>
                )}
                {mode !== 'signin' && <Text style={styles.tabText}>Sign In</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === 'signup' && styles.tabActive]}
                onPress={() => setMode('signup')}
              >
                {mode === 'signup' && (
                  <LinearGradient colors={gradients.buttonPrimary as any} style={styles.tabGradient}>
                    <Text style={styles.tabTextActive}>Sign Up</Text>
                  </LinearGradient>
                )}
                {mode !== 'signup' && <Text style={styles.tabText}>Sign Up</Text>}
              </TouchableOpacity>
            </View>

            {mode === 'signup' && (
              <>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="yourname"
                  placeholderTextColor={colors.forest[300]}
                  autoCapitalize="none"
                />
                <Text style={styles.label}>Display Name</Text>
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Your Name"
                  placeholderTextColor={colors.forest[300]}
                />
              </>
            )}

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.forest[300]}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.forest[300]}
              secureTextEntry
            />
            {mode === 'signup' && (
              <Text style={styles.passwordHint}>{PASSWORD_REQUIREMENTS}</Text>
            )}

            {error && <Text style={styles.error}>{error}</Text>}

            {mode === 'signin' && (
              <TouchableOpacity style={styles.forgotLink} onPress={() => { setShowReset(true); setResetEmail(email); setResetMessage(null); }}>
                <Text style={styles.forgotText}>Forgot your password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.buttonWrap, shadows.button]} onPress={handleSubmit} disabled={busy} activeOpacity={0.85}>
              <LinearGradient colors={gradients.buttonPrimary as any} style={styles.button}>
                {busy ? (
                  <ActivityIndicator color={colors.forest[950]} />
                ) : (
                  <Text style={styles.buttonText}>
                    {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>

          <Modal visible={showReset} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <LinearGradient colors={gradients.card as any} style={[styles.modalContent, shadows.card]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Reset Password</Text>
                  <TouchableOpacity onPress={() => setShowReset(false)}>
                    <X size={24} color={colors.forest[200]} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalDesc}>
                  Enter your email and we'll send you a link to reset your password.
                </Text>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.forest[300]}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                {resetMessage && (
                  <Text style={[styles.error, resetMessage.includes('sent') && styles.successMsg]}>
                    {resetMessage}
                  </Text>
                )}
                <TouchableOpacity style={[styles.buttonWrap, shadows.button]} onPress={handleResetPassword} disabled={resetBusy}>
                  <LinearGradient colors={gradients.buttonPrimary as any} style={styles.button}>
                    {resetBusy ? (
                      <ActivityIndicator color={colors.forest[950]} />
                    ) : (
                      <Text style={styles.buttonText}>Send Reset Link</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </Modal>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, minHeight: '100%' },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  appName: { ...typography.title, fontSize: 26, textAlign: 'center' },
  tagline: { ...typography.small, marginTop: spacing.xs, color: colors.forest[300] },
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    backgroundColor: colors.forest[950],
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  tabActive: {},
  tabGradient: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.sm,
  },
  tabText: { ...typography.small, color: colors.forest[200], fontWeight: '600' },
  tabTextActive: { color: colors.forest[950], fontFamily: 'Montserrat-SemiBold', fontSize: 14 },
  label: { ...typography.small, marginBottom: spacing.xs, marginTop: spacing.sm, color: colors.forest[200] },
  input: {
    backgroundColor: colors.forest[950],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.forest[50],
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(98, 200, 98, 0.12)',
  },
  error: {
    color: colors.error,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  buttonWrap: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginTop: spacing.lg,
  },
  button: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.forest[950],
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  forgotText: {
    ...typography.small,
    color: colors.accent,
    fontFamily: 'Montserrat-SemiBold',
  },
  passwordHint: {
    ...typography.caption,
    color: colors.forest[300],
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.subheading,
    fontSize: 18,
  },
  modalDesc: {
    ...typography.small,
    color: colors.forest[200],
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  successMsg: {
    color: colors.accent,
  },
});
