import { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { registerUser } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Shield } from "lucide-react-native";
import { colors, typography, spacing, borderRadius } from "@/lib/theme";

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login: authLogin } = useAuth();
  const router = useRouter();
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  async function handleRegister() {
    if (!firstName || !lastName || !email || !password) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Erreur", "Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    setLoading(true);
    try {
      await registerUser({ email, password, firstName, lastName });
      const result = await authLogin(email, password);
      if (result.error) {
        Alert.alert("Inscription réussie", "Connectez-vous avec vos identifiants");
        router.replace("/login");
      } else {
        router.replace("/(tabs)");
      }
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Inscription impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Shield size={24} color={colors.primary} />
          </View>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Rejoignez la plateforme OVERSIGHT AI</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <View style={[styles.halfInput, { marginRight: spacing.sm }]}>
              <Text style={styles.label}>PRÉNOM</Text>
              <TextInput
                style={styles.input} placeholder="Jean" placeholderTextColor={colors.textMuted}
                value={firstName} onChangeText={setFirstName} returnKeyType="next"
                onSubmitEditing={() => lastNameRef.current?.focus()}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>NOM</Text>
              <TextInput
                ref={lastNameRef} style={styles.input} placeholder="Dupont" placeholderTextColor={colors.textMuted}
                value={lastName} onChangeText={setLastName} returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              ref={emailRef} style={styles.input} placeholder="vous@exemple.com" placeholderTextColor={colors.textMuted}
              value={email} onChangeText={setEmail} keyboardType="email-address"
              autoCapitalize="none" returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>MOT DE PASSE</Text>
            <TextInput
              ref={passwordRef} style={styles.input} placeholder="Minimum 8 caractères"
              placeholderTextColor={colors.textMuted} value={password} onChangeText={setPassword}
              secureTextEntry returnKeyType="go" onSubmitEditing={handleRegister}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister} disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Créer mon compte</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkBtn} onPress={() => router.back()}>
            <Text style={styles.linkText}>
              Déjà un compte ?{" "}
              <Text style={styles.linkHighlight}>Se connecter</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: "center", padding: spacing.xl },
  header: { alignItems: "center", marginBottom: 32 },
  logoWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: "rgba(6,182,212,0.1)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 12, borderWidth: 1, borderColor: "rgba(6,182,212,0.2)",
  },
  title: { ...typography.h2, marginBottom: 4 },
  subtitle: { ...typography.caption },
  form: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.xl,
    borderWidth: 1, borderColor: colors.border,
  },
  row: { flexDirection: "row", marginBottom: spacing.lg },
  halfInput: { flex: 1 },
  inputGroup: { marginBottom: spacing.lg },
  label: { ...typography.label, marginBottom: spacing.sm },
  input: {
    height: 44, backgroundColor: colors.bg, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md,
    color: colors.text, fontSize: 15,
  },
  button: {
    height: 44, backgroundColor: colors.primary, borderRadius: borderRadius.md,
    alignItems: "center", justifyContent: "center", marginTop: spacing.xs,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  linkBtn: { marginTop: spacing.lg, alignItems: "center" },
  linkText: { ...typography.caption },
  linkHighlight: { color: colors.primary, fontWeight: "600" },
});
