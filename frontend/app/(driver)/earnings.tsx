import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import I18n from '../utils/i18n';

export default function DriverEarnings() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{I18n.t('driver.earnings')}</Text>
      </View>
      
      <ScrollView style={styles.content}>
        {/* Today's Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Today's Summary</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>$0.00</Text>
              <Text style={styles.summaryLabel}>Total Earned</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>0</Text>
              <Text style={styles.summaryLabel}>Rides Completed</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>0h</Text>
              <Text style={styles.summaryLabel}>Online Time</Text>
            </View>
          </View>
        </View>

        {/* Weekly Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>This Week</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>0 ETB</Text>
              <Text style={styles.summaryLabel}>Total Earned</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>0</Text>
              <Text style={styles.summaryLabel}>Total Rides</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>5.0</Text>
              <Text style={styles.summaryLabel}>Avg Rating</Text>
            </View>
          </View>
        </View>

        {/* Empty State */}
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💰</Text>
          <Text style={styles.emptyText}>Start driving to earn</Text>
          <Text style={styles.emptySubtext}>
            Go online and accept rides to start earning money
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  summaryCard: {
    backgroundColor: '#fff',
    marginVertical: 8,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});