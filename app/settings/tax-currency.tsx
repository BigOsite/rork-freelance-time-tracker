import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView,
  TextInput,
  Alert
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, DollarSign, Percent } from 'lucide-react-native';
import { useBusinessStore } from '@/store/businessStore';
import { useTheme } from '@/contexts/ThemeContext';
import OptionSelector from '@/components/OptionSelector';
import { CURRENCIES, getCurrencyByCode } from '@/constants/currencies';

export default function TaxCurrencyScreen() {
  const router = useRouter();
  const { taxSettings, updateCurrency, updateTaxRate } = useBusinessStore();
  const { colors } = useTheme();
  
  const [selectedCurrency, setSelectedCurrency] = useState(taxSettings.currency);
  const [taxRate, setTaxRate] = useState(taxSettings.defaultTaxRate.toString());
  const [hasChanges, setHasChanges] = useState(false);
  
  const currencyOptions = CURRENCIES.map(currency => ({
    label: `${currency.name} (${currency.symbol})`,
    value: currency.code
  }));
  
  const handleCurrencyChange = (currencyCode: string | number) => {
    const code = currencyCode.toString();
    const currency = getCurrencyByCode(code);
    
    if (currency) {
      setSelectedCurrency(code);
      setHasChanges(true);
    }
  };
  
  const handleTaxRateChange = (value: string) => {
    // Only allow numbers and decimal point
    const numericValue = value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return;
    }
    
    // Limit to reasonable tax rate (0-100%)
    const num = parseFloat(numericValue);
    if (num > 100) {
      return;
    }
    
    setTaxRate(numericValue);
    setHasChanges(true);
  };
  
  const handleSave = () => {
    const currency = getCurrencyByCode(selectedCurrency);
    if (!currency) {
      Alert.alert('Error', 'Please select a valid currency');
      return;
    }
    
    const taxRateNum = parseFloat(taxRate) || 0;
    if (taxRateNum < 0 || taxRateNum > 100) {
      Alert.alert('Error', 'Tax rate must be between 0% and 100%');
      return;
    }
    
    // Update currency
    updateCurrency(currency.code, currency.symbol);
    
    // Update tax rate
    updateTaxRate(taxRateNum);
    
    setHasChanges(false);
    
    Alert.alert(
      'Settings Saved',
      'Your tax and currency settings have been updated successfully.',
      [
        {
          text: 'OK',
          onPress: () => router.back()
        }
      ]
    );
  };
  
  const handleBack = () => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Do you want to save them before leaving?',
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => router.back()
          },
          {
            text: 'Save',
            onPress: handleSave
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } else {
      router.back();
    }
  };
  
  const selectedCurrencyData = getCurrencyByCode(selectedCurrency);
  
  const styles = createStyles(colors);
  
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Tax & Currency',
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
              <ChevronLeft size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <DollarSign size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Currency Settings</Text>
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Preferred Currency</Text>
            <Text style={styles.settingDescription}>
              This currency will be used throughout the app for displaying earnings and invoices.
            </Text>
            <OptionSelector
              options={currencyOptions}
              selectedValue={selectedCurrency}
              onSelect={handleCurrencyChange}
              placeholder="Select currency"
            />
            
            {selectedCurrencyData && (
              <View style={styles.currencyPreview}>
                <Text style={styles.previewLabel}>Preview:</Text>
                <Text style={styles.previewValue}>
                  {selectedCurrencyData.symbol}1,234.56
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Percent size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Tax Settings</Text>
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Default Tax Rate (%)</Text>
            <Text style={styles.settingDescription}>
              Set your default tax rate for future invoice calculations. This can be customized per invoice.
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={taxRate}
                onChangeText={handleTaxRateChange}
                placeholder="0.00"
                placeholderTextColor={colors.placeholder}
                keyboardType="decimal-pad"
                maxLength={6}
              />
              <Text style={styles.inputSuffix}>%</Text>
            </View>
            
            {taxRate && (
              <View style={styles.taxPreview}>
                <Text style={styles.previewLabel}>
                  Example: {selectedCurrencyData?.symbol || '$'}100.00 + {taxRate}% tax = {selectedCurrencyData?.symbol || '$'}{(100 + (parseFloat(taxRate) || 0)).toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {hasChanges && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flexGrow: 1,
    padding: 24,
  },
  headerButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.inputBg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  section: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  settingItem: {
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 20,
    marginBottom: 16,
  },
  currencyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    gap: 8,
  },
  previewLabel: {
    fontSize: 14,
    color: colors.subtext,
    fontWeight: '500',
  },
  previewValue: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  inputSuffix: {
    fontSize: 16,
    color: colors.subtext,
    fontWeight: '600',
    marginLeft: 8,
  },
  taxPreview: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.inputBg,
    borderRadius: 12,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});