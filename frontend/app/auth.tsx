import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import I18n from './utils/i18n';
import { authAPI } from './services/api';

export default function Auth() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!phone.trim()) {
      Alert.alert(I18n.t('common.error'), 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      await authAPI.sendCode(phone);
      setStep('verify');
      Alert.alert(I18n.t('common.success'), `Verification code sent to ${phone}\nFor demo: use code 123456`);
    } catch (error) {
      console.error('Send code error:', error);
      Alert.alert(I18n.t('common.error'), 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      Alert.alert(I18n.t('common.error'), 'Please enter verification code');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.verifyCode(phone, code);
      
      if (response.data.isNewUser) {
        // New user, navigate to user type selection
        router.push({
          pathname: '/user-type',
          params: { phone }
        });
      } else {
        // Existing user, navigate based on user type
        const user = response.data.user;
        if (user.userType === 'rider') {
          router.replace('/(rider)');
        } else {
          router.replace('/(driver)');
        }
      }
    } catch (error) {
      console.error('Verify code error:', error);
      Alert.alert(I18n.t('common.error'), 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    await handleSendCode();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => step === 'verify' ? setStep('phone') : router.back()}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            {step === 'phone' ? (
              <>
                <Text style={styles.title}>{I18n.t('auth.phoneNumber')}</Text>
                <Text style={styles.subtitle}>{I18n.t('auth.enterPhone')}</Text>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+251-9-XX-XX-XX-XX"
                    keyboardType="phone-pad"
                    autoFocus
                    maxLength={15}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, (!phone.trim() || loading) && styles.buttonDisabled]}
                  onPress={handleSendCode}
                  disabled={!phone.trim() || loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>{I18n.t('auth.sendCode')}</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.title}>{I18n.t('auth.verifyCode')}</Text>
                <Text style={styles.subtitle}>
                  {I18n.t('auth.enterCode')} {phone}
                </Text>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={code}
                    onChangeText={setCode}
                    placeholder="123456"
                    keyboardType="number-pad"
                    autoFocus
                    maxLength={6}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, (!code.trim() || loading) && styles.buttonDisabled]}
                  onPress={handleVerifyCode}
                  disabled={!code.trim() || loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>{I18n.t('auth.verify')}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.resendButton} onPress={handleResendCode}>
                  <Text style={styles.resendButtonText}>{I18n.t('auth.resendCode')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: '#333',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    backgroundColor: '#f9f9f9',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resendButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
});