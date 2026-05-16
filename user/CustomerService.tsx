//CustomerService.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  SafeAreaView,
  Linking,
} from 'react-native';
import { Headphones } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIMARY = '#FFA800';
const BORDER = '#FFCD5C';

export default function CustomerService({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* <StatusBar backgroundColor={PRIMARY} barStyle="light-content" /> */}
      
      {/* Fixed Header */}
      <View style={[styles.header, { 
        paddingTop: insets.top,
        height: 60 + insets.top,
      }]}>
        <Text style={styles.logo}>GamePay.</Text>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Kembali</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { 
            paddingTop: 60 + insets.top, // Space for fixed header
            paddingBottom: insets.bottom + 20 
          }
        ]}
      >
        {/* Content */}
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Headphones size={48} color={PRIMARY} />
          </View>
          
          <Text style={styles.title}>Customer Service</Text>
          <Text style={styles.subtitle}>
            Bila ada yang perlu dipertanyakan silahkan hubungi kami melalui kontak berikut:
          </Text>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity 
              style={styles.button}
              onPress={() => Linking.openURL('https://api.whatsapp.com/send/?phone=6281211772544&text=Halo%2C+saya+ingin+bertanya&type=phone_number&app_absent=0')}
            >
              <Text style={styles.buttonText}>WhatsApp CS 1</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.button}
              onPress={() => Linking.openURL('https://api.whatsapp.com/send/?phone=6285920637925&text=Halo%2C+saya+ingin+bertanya&type=phone_number&app_absent=0')}
            >
              <Text style={styles.buttonText}>WhatsApp CS 2</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Jam Operasional</Text>
            <Text style={styles.sectionText}>
              Senin - Minggu: 07.00 - 23.00 WIB
              {'\n'}Tutup pada hari libur nasional
            </Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Informasi Penting</Text>
            <Text style={styles.sectionText}>
              • Kesalahan input data tidak dapat direfund
              {'\n'}• Respon CS maksimal 1x24 jam
              {'\n'}• Pastikan data valid sebelum submit
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
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
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
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
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 32,
  },
  button: {
    backgroundColor: PRIMARY,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
  },
  infoSection: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
});