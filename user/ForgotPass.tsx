import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from './Supabase';
import { Headphones } from 'lucide-react-native';

const PRIMARY = '#FFA800';
const BORDER = '#FFCD5C';

export default function ForgotPass({ navigation }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [secureEntry, setSecureEntry] = useState(true);

  const handleSendCode = async () => {
  if (!email) {
    setError('Email harus diisi');
    return;
  }

  setLoading(true);
  setError('');

  try {
    setStep(2);
    Alert.alert('Reset Password', 'Silakan buat password baru Anda');
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

const handleResetPassword = async () => {
  if (!newPassword || !confirmPassword) {
    setError('Password baru dan konfirmasi password harus diisi');
    return;
  }

  if (newPassword !== confirmPassword) {
    setError('Password dan konfirmasi password tidak sama');
    return;
  }

  setLoading(true);
  setError('');

  try {
    // Langsung pakai Supabase Auth — gak perlu cek profile dulu
    // (Supabase akan handle silent jika email tidak terdaftar untuk keamanan)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);

    if (resetError) throw resetError;

    Alert.alert(
      'Email Terkirim',
      'Link untuk reset password telah dikirim ke email Anda. Silakan cek email Anda untuk melanjutkan proses reset password.',
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  } catch (err) {
    setError(err.message || 'Gagal mereset password');
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={[styles.header, { 
        paddingTop: insets.top,
        height: 60 + insets.top,
      }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lupa Password</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={60 + insets.top}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            { 
              paddingTop: 80 + insets.top,
              paddingBottom: 20 + insets.bottom 
            }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formContainer}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              {step === 1 
                ? 'Masukkan email yang terdaftar untuk mereset password'
                : 'Buat password baru untuk akun Anda'}
            </Text>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {step === 1 ? (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email terdaftar"
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
            ) : (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Password Baru</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Password baru"
                    placeholderTextColor="#999"
                    secureTextEntry={secureEntry}
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
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

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Konfirmasi Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Konfirmasi password"
                    placeholderTextColor="#999"
                    secureTextEntry={secureEntry}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      setError('');
                    }}
                  />
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={step === 1 ? handleSendCode : handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>
                  {step === 1 ? 'LANJUTKAN' : 'RESET PASSWORD'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Ingat password? </Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
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
  backButton: {
    padding: 8,
  },
  backText: {
    color: '#FFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
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
    lineHeight: 20,
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
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
    top: 40,
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