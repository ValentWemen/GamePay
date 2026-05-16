import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../user/Supabase';
import { Headphones } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

const PRIMARY = '#FFA800';
const BORDER = '#FFCD5C';

export default function Profile({ navigation }) {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');

  // Display name state
  const [displayName, setDisplayName] = useState('');
  const [originalDisplayName, setOriginalDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Avatar state
  const [uploading, setUploading] = useState(false);
  const [avatarUri, setAvatarUri] = useState(null);

  const ensureProfileExists = async (userId, userEmail) => {
    try {
      const { data, error } = await supabase
        .from('profiles').select('id').eq('id', userId).maybeSingle();
      if (error) throw error;
      if (!data) {
        const { error: insertError } = await supabase.from('profiles').insert([{
          id: userId,
          display_name: userEmail.split('@')[0],
          created_at: new Date().toISOString(),
        }]);
        if (insertError) throw insertError;
        const { data: newProfile } = await supabase
          .from('profiles').select('*').eq('id', userId).single();
        return newProfile;
      }
      // Fetch full profile
      const { data: fullProfile } = await supabase
        .from('profiles').select('*').eq('id', userId).single();
      return fullProfile;
    } catch (error) {
      console.error('Error ensuring profile exists:', error);
      throw error;
    }
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!session?.user) {
          setLoading(false);
          navigation.getParent()?.replace('Auth');
          return;
        }
        setUser(session.user);
        setEmail(session.user.email);
        const profile = await ensureProfileExists(session.user.id, session.user.email);
        if (!profile) throw new Error('Profile not found after creation');
        setProfile(profile);
        const dn = profile?.display_name || session.user.email?.split('@')[0] || 'User';
        setDisplayName(dn);
        setOriginalDisplayName(dn);
      } catch (error) {
        console.error('Failed to load user data:', error);
        Alert.alert('Error', 'Failed to load user data');
        navigation.getParent()?.replace('Auth');
      } finally {
        setLoading(false);
      }
    };
    loadUserData();
  }, []);

  useEffect(() => {
    const loadAvatar = async () => {
      if (!profile?.avatar_url) { setAvatarUri(null); return; }
      try {
        const path = profile.avatar_url.split('/avatars/')[1];
        if (!path) return;
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
        setAvatarUri(`${publicUrl}?t=${Date.now()}`);
      } catch (error) {
        console.log('Error loading avatar:', error);
        setAvatarUri(null);
      }
    };
    loadAvatar();
  }, [profile?.avatar_url]);

  const onLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigation.getParent()?.replace('Auth');
    } catch (error) {
      Alert.alert('Error', 'Gagal logout: ' + error.message);
    }
  };

  // FIX: Simpan nama dan LANGSUNG update semua state termasuk greeting
  const handleSaveDisplayName = async () => {
    if (!user?.id) return;
    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      Alert.alert('Nama Terlalu Pendek', 'Nama minimal 2 karakter'); return;
    }
    if (trimmed === originalDisplayName) {
      Alert.alert('Tidak Ada Perubahan', 'Nama belum diubah'); return;
    }
    setSavingName(true);
    try {
      const { error } = await supabase.from('profiles').update({
        display_name: trimmed,
        full_name: trimmed,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);
      if (error) throw error;

      // Update SEMUA state sekaligus agar greeting langsung berubah
      setOriginalDisplayName(trimmed);
      setDisplayName(trimmed);
      setProfile((prev: any) => ({ ...prev, display_name: trimmed, full_name: trimmed }));
      Alert.alert('✓ Berhasil', 'Nama profil berhasil disimpan!');
    } catch (e: any) {
      Alert.alert('Error', 'Gagal menyimpan: ' + e.message);
    } finally {
      setSavingName(false);
    }
  };

  // FIX: Password dengan konfirmasi & feedback yang benar
  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Password Terlalu Pendek', 'Password minimal 6 karakter'); return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Password Tidak Cocok', 'Password baru dan konfirmasi tidak sama'); return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      Alert.alert('✓ Berhasil', 'Password berhasil diubah!', [
        {
          text: 'OK', onPress: () => {
            setNewPassword('');
            setConfirmPassword('');
            setIsEditingPassword(false);
            setShowNewPw(false);
            setShowConfirmPw(false);
          }
        }
      ]);
    } catch (error: any) {
      Alert.alert('Gagal', error.message || 'Gagal mengubah password');
    } finally {
      setSavingPassword(false);
    }
  };

  const cancelPasswordEdit = () => {
    setIsEditingPassword(false);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPw(false);
    setShowConfirmPw(false);
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Izin diperlukan', 'Kami membutuhkan akses ke galeri untuk memilih foto'); return;
      }
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [1, 1], quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0].uri) await uploadImage(result.assets[0].uri);
    } catch (error: any) {
      Alert.alert('Error', 'Gagal memilih gambar: ' + error.message);
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Izin diperlukan', 'Kami membutuhkan akses kamera untuk mengambil foto'); return;
      }
      let result = await ImagePicker.launchCameraAsync({
        allowsEditing: true, aspect: [1, 1], quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0].uri) await uploadImage(result.assets[0].uri);
    } catch (error: any) {
      Alert.alert('Error', 'Gagal mengambil foto: ' + error.message);
    }
  };

  const uploadImage = async (uri: string) => {
    if (!user?.id) return;
    try {
      setUploading(true);
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/avatars/')[1];
        if (oldPath) await supabase.storage.from('avatars').remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage.from('avatars')
        .upload(filePath, decode(base64), {
          contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
          upsert: true, cacheControl: '3600',
        });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      if (!publicUrl) throw new Error('Could not generate image URL');

      const { error: updateError } = await supabase.from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (updateError) throw updateError;

      const { data: newProfile, error: fetchError } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      if (fetchError) throw fetchError;
      setProfile(newProfile);
      Alert.alert('✓ Berhasil', 'Foto profil berhasil diubah!');
    } catch (error: any) {
      Alert.alert('Upload Error', error.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert('Pilih Foto Profil', 'Dari mana Anda ingin mengambil foto profil?', [
      { text: 'Ambil Foto', onPress: takePhoto },
      { text: 'Pilih dari Galeri', onPress: pickImage },
      { text: 'Batal', style: 'cancel' },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContainer, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled">

        <View style={[styles.header, { paddingTop: insets.top, height: 60 + insets.top }]}>
          <Text style={styles.logo}>GamePay.</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => navigation.navigate('CustomerService')} style={styles.customerServiceBtn}>
              <Headphones size={24} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
              <Text style={styles.logoutTxt}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity style={styles.avatarWrapper} onPress={showImagePickerOptions} disabled={uploading}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri, cache: 'reload' }} style={styles.avatarImage}
                  onError={() => setAvatarUri(null)} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Image source={require('../assets/user-icon.png')} style={styles.avatarIcon} />
                </View>
              )}
              {uploading && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator size="small" color="#FFF" />
                  <Text style={styles.uploadingText}>Mengupload...</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* FIX: Greeting pakai displayName yang langsung update */}
            <Text style={styles.greeting}>
              Halo, <Text style={styles.username}>{displayName || 'User'}!</Text>
            </Text>
            <Text style={styles.subtitle}>
              Ingat, lebih baik mengelola keuangan dengan bijak daripada menyesal di kemudian hari.
            </Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Informasi Akun</Text>

            {/* Nama Profil */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nama Profil</Text>
              <TextInput
                style={styles.input}
                placeholder="Masukkan nama kamu"
                placeholderTextColor="#999"
                value={displayName}
                onChangeText={setDisplayName}
                maxLength={30}
              />
              {displayName.trim() !== originalDisplayName && displayName.trim().length >= 2 && (
                <TouchableOpacity
                  style={[styles.inlineBtn, savingName && { opacity: 0.5 }]}
                  onPress={handleSaveDisplayName} disabled={savingName}>
                  <Text style={styles.inlineBtnText}>{savingName ? 'Menyimpan...' : 'Simpan'}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Email (read-only) */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: '#EEE', color: '#666' }]}
                value={email} editable={false}
                autoCapitalize="none" keyboardType="email-address"
              />
              <Text style={styles.disabledText}>Email tidak dapat diubah</Text>
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              {!isEditingPassword ? (
                <>
                  <View style={[styles.input, styles.passwordPlaceholder]}>
                    <Text style={{ color: '#666', fontSize: 20, letterSpacing: 4 }}>••••••••</Text>
                  </View>
                  <TouchableOpacity style={styles.inlineBtn} onPress={() => setIsEditingPassword(true)}>
                    <Text style={styles.inlineBtnText}>Ubah</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.sublabel}>Password Baru</Text>
                  <View style={styles.passwordRow}>
                    <TextInput
                      style={[styles.input, { flex: 1, paddingRight: 90 }]}
                      placeholder="Min. 6 karakter"
                      placeholderTextColor="#999"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPw}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNewPw(!showNewPw)}>
                      <Text style={styles.eyeBtnText}>{showNewPw ? 'Sembunyikan' : 'Tampilkan'}</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.sublabel, { marginTop: 10 }]}>Konfirmasi Password Baru</Text>
                  <View style={styles.passwordRow}>
                    <TextInput
                      style={[styles.input, { flex: 1, paddingRight: 90 }]}
                      placeholder="Ulangi password baru"
                      placeholderTextColor="#999"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPw}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirmPw(!showConfirmPw)}>
                      <Text style={styles.eyeBtnText}>{showConfirmPw ? 'Sembunyikan' : 'Tampilkan'}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    <TouchableOpacity style={styles.cancelPasswordBtn} onPress={cancelPasswordEdit}>
                      <Text style={styles.cancelPasswordBtnText}>Batal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.savePasswordBtn, savingPassword && { opacity: 0.5 }]}
                      onPress={handleUpdatePassword} disabled={savingPassword}>
                      <Text style={styles.savePasswordBtnText}>
                        {savingPassword ? 'Menyimpan...' : 'Simpan Password'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scrollContainer: { flexGrow: 1 },
  header: {
    height: 80, backgroundColor: PRIMARY,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  logo: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  customerServiceBtn: { padding: 8, marginRight: 12 },
  logoutBtn: { backgroundColor: '#FFF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  logoutTxt: { color: PRIMARY, fontWeight: '600', fontSize: 14 },
  content: { padding: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarWrapper: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: BORDER,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16, overflow: 'hidden', position: 'relative',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarFallback: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' },
  avatarIcon: { width: 60, height: 60, tintColor: PRIMARY },
  uploadOverlay: {
    position: 'absolute', width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 1,
  },
  uploadingText: { color: '#FFF', fontSize: 12, marginTop: 5 },
  greeting: { fontSize: 20, fontWeight: '600', color: '#000', marginBottom: 8, textAlign: 'center' },
  username: { color: PRIMARY },
  subtitle: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 20 },
  formSection: { marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#000', marginBottom: 24 },
  inputContainer: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8 },
  sublabel: { fontSize: 13, fontWeight: '600', color: '#777', marginBottom: 6 },
  input: {
    height: 50, backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: BORDER,
    borderRadius: 12, paddingHorizontal: 16, fontSize: 14, color: '#000',
  },
  passwordPlaceholder: {
    justifyContent: 'center', paddingHorizontal: 16,
  },
  passwordRow: { position: 'relative' },
  eyeBtn: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
  eyeBtnText: { color: PRIMARY, fontWeight: '600', fontSize: 12 },
  disabledText: { fontSize: 12, color: '#999', marginTop: 6, textAlign: 'right' },
  inlineBtn: {
    position: 'absolute', right: 0, top: 0,
    backgroundColor: PRIMARY, paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 8, marginTop: 30,
  },
  inlineBtnText: { color: '#FFF', fontWeight: '600', fontSize: 12 },
  cancelPasswordBtn: {
    flex: 1, backgroundColor: '#F5F5F5', borderRadius: 12,
    height: 46, alignItems: 'center', justifyContent: 'center',
  },
  cancelPasswordBtnText: { fontSize: 14, fontWeight: '700', color: '#666' },
  savePasswordBtn: {
    flex: 2, backgroundColor: PRIMARY, borderRadius: 12,
    height: 46, alignItems: 'center', justifyContent: 'center',
  },
  savePasswordBtnText: { fontSize: 14, fontWeight: '800', color: '#000' },
});
