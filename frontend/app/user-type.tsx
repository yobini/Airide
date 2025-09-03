import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import I18n from './utils/i18n';
import { authAPI } from './services/api';
import { useAuthStore } from './store/authStore';

export default function UserType() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { setUser } = useAuthStore();
  const [selectedType, setSelectedType] = useState<'rider' | 'driver' | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTypeSelect = (type: 'rider' | 'driver') => {
    setSelectedType(type);
  };

  const handleContinue = async () => {
    if (!selectedType) {
      Alert.alert(I18n.t('common.error'), 'Please select your user type');
      return;
    }

    setLoading(true);
    try {
      const userData = {
        phone: phone!,
        userType: selectedType,
        language: I18n.locale,
      };

      const response = await authAPI.register(userData);
      const user = response.data;

      // Update auth store
      await setUser(user);

      // Navigate to appropriate screen
      if (selectedType === 'rider') {
        router.replace('/(rider)');
      } else {
        router.replace('/(driver)');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert(I18n.t('common.error'), 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <Text style={styles.title}>{I18n.t('userType.selectType')}</Text>

          <View style={styles.optionsContainer}>
            {/* Rider Option */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                selectedType === 'rider' && styles.optionCardSelected,
              ]}
              onPress={() => handleTypeSelect('rider')}
            >
              <View style={styles.optionIcon}>
                <Text style={styles.optionIconText}>🚶‍♂️</Text>
              </View>
              <Text style={styles.optionTitle}>{I18n.t('userType.rider')}</Text>
              <Text style={styles.optionDescription}>{I18n.t('userType.riderDesc')}</Text>
              <View
                style={[
                  styles.radioButton,
                  selectedType === 'rider' && styles.radioButtonSelected,
                ]}
              >
                {selectedType === 'rider' && <View style={styles.radioButtonInner} />}
              </View>
            </TouchableOpacity>

            {/* Driver Option */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                selectedType === 'driver' && styles.optionCardSelected,
              ]}
              onPress={() => handleTypeSelect('driver')}
            >
              <View style={styles.optionIcon}>
                <Text style={styles.optionIconText}>🚗</Text>
              </View>
              <Text style={styles.optionTitle}>{I18n.t('userType.driver')}</Text>
              <Text style={styles.optionDescription}>{I18n.t('userType.driverDesc')}</Text>
              <View
                style={[
                  styles.radioButton,
                  selectedType === 'driver' && styles.radioButtonSelected,
                ]}
              >
                {selectedType === 'driver' && <View style={styles.radioButtonInner} />}
              </View>
            </TouchableOpacity>
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.continueButton, (!selectedType || loading) && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!selectedType || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.continueButtonText}>{I18n.t('welcome.continue')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    paddingTop: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 32,
  },
  optionsContainer: {
    gap: 20,
    marginBottom: 40,
  },
  optionCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    position: 'relative',
  },
  optionCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  optionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionIconText: {
    fontSize: 32,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  radioButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#007AFF',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  continueButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
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
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});