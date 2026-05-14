import { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { registerUser } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

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
      Alert.alert("Erreur", "Le mot de passe doit contenir au moins 8 caracteres");
      return;
    }
    setLoading(true);
    try {
      await registerUser({ email, password, firstName, lastName });
      const result = await authLogin(email, password);
      if (result.error) {
        Alert.alert("Inscription reussie", "Connectez-vous avec vos identifiants");
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
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>OVERSIGHT AI</Text>
        <Text style={styles.subtitle}>Creer un compte</Text>

        <TextInput
          style={styles.input} placeholder="Prenom" placeholderTextColor="#888"
          value={firstName} onChangeText={setFirstName} returnKeyType="next"
          onSubmitEditing={() => lastNameRef.current?.focus()}
          autoCapitalize="words" accessibilityLabel="Prenom"
        />
        <TextInput
          ref={lastNameRef} style={styles.input} placeholder="Nom" placeholderTextColor="#888"
          value={lastName} onChangeText={setLastName} returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          autoCapitalize="words" accessibilityLabel="Nom"
        />
        <TextInput
          ref={emailRef} style={styles.input} placeholder="Email" placeholderTextColor="#888"
          value={email} onChangeText={setEmail} keyboardType="email-address"
          autoCapitalize="none" returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          accessibilityLabel="Adresse email"
        />
        <TextInput
          ref={passwordRef} style={styles.input} placeholder="Mot de passe (min 8 car.)"
          placeholderTextColor="#888" value={password} onChangeText={setPassword}
          secureTextEntry returnKeyType="go" onSubmitEditing={handleRegister}
          accessibilityLabel="Mot de passe"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister} disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Creer mon compte</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkBtn} onPress={() => router.back()}>
          <Text style={styles.linkText}>Deja un compte ? Se connecter</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0a0a", padding: 16 },
  form: { width: "100%", maxWidth: 400, padding: 24, borderRadius: 8, borderWidth: 1, borderColor: "#333", backgroundColor: "#111" },
  title: { fontSize: 24, fontWeight: "bold", color: "#ededed", textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#888", textAlign: "center", marginBottom: 24 },
  input: { width: "100%", padding: 10, borderRadius: 4, borderWidth: 1, borderColor: "#333", backgroundColor: "#0a0a0a", color: "#ededed", fontSize: 16, marginBottom: 16 },
  button: { width: "100%", padding: 12, borderRadius: 4, backgroundColor: "#2563eb", alignItems: "center" },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  linkBtn: { marginTop: 16, alignItems: "center" },
  linkText: { color: "#2563eb", fontSize: 14 },
});
