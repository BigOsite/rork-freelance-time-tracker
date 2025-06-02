import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Check, Clock, DollarSign, Calendar } from 'lucide-react-native';
import { PayPeriod } from '@/types';
import { formatDuration, formatPayPeriodRange } from '@/utils/time';
import { formatCurrency } from '@/utils/helpers';
import { useBusinessStore } from '@/store/businessStore';
import Colors from '@/constants/colors';

type PayPeriodCardProps = {
  period: PayPeriod;
  onTogglePaid: () => void;
};

export default function PayPeriodCard({ period, onTogglePaid }: PayPeriodCardProps) {
  const { taxSettings } = useBusinessStore();
  const { startDate, endDate, totalDuration, totalEarnings, isPaid, paidDate } = period;
  
  const handleTogglePaid = React.useCallback(() => {
    onTogglePaid();
  }, [onTogglePaid]);
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.dateContainer}>
          <Calendar size={16} color={Colors.light.subtext} />
          <Text style={styles.dateRange}>
            {formatPayPeriodRange(startDate, endDate)}
          </Text>
        </View>
        <View style={[
          styles.statusBadge, 
          isPaid ? styles.paidBadge : styles.unpaidBadge
        ]}>
          <Text style={[
            styles.statusText,
            isPaid ? styles.paidText : styles.unpaidText
          ]}>
            {isPaid ? 'Paid' : 'Unpaid'}
          </Text>
        </View>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Clock size={16} color={Colors.light.subtext} />
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {formatDuration(totalDuration)}
          </Text>
        </View>
        
        <View style={styles.statItem}>
          <DollarSign size={16} color={Colors.light.subtext} />
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {formatCurrency(totalEarnings, taxSettings.currency, taxSettings.currencySymbol)}
          </Text>
        </View>
      </View>
      
      {isPaid && paidDate && (
        <Text style={styles.paidDate}>
          Marked as paid on {new Date(paidDate).toLocaleDateString()}
        </Text>
      )}
      
      <TouchableOpacity 
        style={[
          styles.toggleButton,
          isPaid ? styles.unpaidButton : styles.paidButton
        ]}
        onPress={handleTogglePaid}
      >
        {!isPaid && <Check size={16} color="#FFFFFF" style={styles.buttonIcon} />}
        <Text style={styles.toggleButtonText}>
          {isPaid ? 'Mark as Unpaid' : 'Mark as Paid'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateRange: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginLeft: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paidBadge: {
    backgroundColor: Colors.light.success + '20', // 20% opacity
  },
  unpaidBadge: {
    backgroundColor: Colors.light.warning + '20', // 20% opacity
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  paidText: {
    color: Colors.light.success,
  },
  unpaidText: {
    color: Colors.light.warning,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    color: Colors.light.text,
    marginLeft: 6,
    flexShrink: 1,
  },
  paidDate: {
    fontSize: 12,
    color: Colors.light.subtext,
    marginBottom: 12,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  paidButton: {
    backgroundColor: Colors.light.success,
  },
  unpaidButton: {
    backgroundColor: Colors.light.danger,
  },
  buttonIcon: {
    marginRight: 6,
  },
  toggleButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
});