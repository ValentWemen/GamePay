import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Headphones } from 'lucide-react-native';
import { supabase } from './Supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as AuthSession from 'expo-auth-session';

const PRIMARY = '#FFA800';
const BORDER = '#FFCD5C';

export default function Register({ navigation }) {
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureEntry, setSecureEntry] = useState(true);

  const onRegister = async () => {
    if (!displayName.trim()) {
      setError('Nama harus diisi');
      return;
    }
    if (displayName.trim().length < 2) {
      setError('Nama minimal 2 karakter');
      return;
    }
    if (!email || !password) {
      setError('Email dan password harus diisi');
      return;
    }

    if (password.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Pakai scheme app sendiri (gamepay://) untuk email verification redirect
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'gamepay',
        path: 'auth/callback',
      });

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUri,
          data: {
            display_name: displayName.trim(),
            full_name: displayName.trim(),
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.user?.identities?.length === 0) {
        throw new Error('Email sudah terdaftar');
      }

      // Backup: kalau trigger gak jalan, update manual
      if (data.user?.id) {
        await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            display_name: displayName.trim(),
            full_name: displayName.trim(),
          })
          .select();
      }

      navigation.replace('Login', {
        successMessage: 'Pendaftaran berhasil! Silakan login.'
      });

    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat pendaftaran');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* <StatusBar barStyle="light-content" backgroundColor={PRIMARY} /> */}
      
      {/* Fixed Header */}
      <View style={[styles.header, { 
        paddingTop: insets.top,
        height: 60 + insets.top,
      }]}>
        <Text style={styles.logo}>GamePay.</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('CustomerService')}
          style={styles.customerServiceBtn}
        >
          <Headphones size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={60 + insets.top} // Adjust for header height
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            { 
              paddingTop: 80 + insets.top, // Space for fixed header
              paddingBottom: 20 + insets.bottom 
            }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Register Form */}
          <View style={styles.formContainer}>
            <Text style={styles.title}>Daftar Akun Baru</Text>
            <Text style={styles.subtitle}>
              Buat akun baru untuk mulai top up game
            </Text>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Nama Lengkap"
                placeholderTextColor="#999"
                value={displayName}
                onChangeText={(text) => {
                  setDisplayName(text);
                  setError('');
                }}
                maxLength={30}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#999"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError('');
                }}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Password (min. 6 karakter)"
                placeholderTextColor="#999"
                secureTextEntry={secureEntry}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError('');
                }}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setSecureEntry(!secureEntry)}
              >
                <Text style={styles.eyeIconText}>
                  {secureEntry ? 'Tampilkan' : 'Sembunyikan'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={onRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>DAFTAR</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Sudah punya akun? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}>Login di sini</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  customerServiceBtn: {
    padding: 8,
  },
  formContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 32,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  input: {
    height: 50,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#000',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 13,
  },
  eyeIconText: {
    color: PRIMARY,
    fontWeight: '600',
    fontSize: 12,
  },
  button: {
    backgroundColor: PRIMARY,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  footerText: {
    color: '#555',
  },
  footerLink: {
    color: PRIMARY,
    fontWeight: '600',
  },
});