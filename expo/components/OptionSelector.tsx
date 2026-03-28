import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  FlatList,
  SafeAreaView
} from 'react-native';
import { ChevronDown, Check, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

type Option = {
  label: string;
  value: string | number;
};

type OptionSelectorProps = {
  options: Option[];
  selectedValue: string | number;
  onSelect: (value: string | number) => void;
  placeholder?: string;
};

export default function OptionSelector({ 
  options, 
  selectedValue, 
  onSelect,
  placeholder = "Select an option" 
}: OptionSelectorProps) {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  
  const selectedOption = Array.isArray(options) ? options.find(option => option && option.value === selectedValue) : null;
  
  const handleSelect = (value: string | number) => {
    if (onSelect && value !== undefined && value !== null) {
      onSelect(value);
    }
    setModalVisible(false);
  };
  
  const handleClose = () => {
    setModalVisible(false);
  };
  
  const safeOptions = Array.isArray(options) ? options.filter(Boolean) : [];
  
  const styles = createStyles(colors);
  
  return (
    <>
      <TouchableOpacity 
        style={styles.selector}
        onPress={() => setModalVisible(true)}
      >
        <Text style={selectedOption ? styles.selectedText : styles.placeholderText}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <ChevronDown size={20} color={colors.subtext} />
      </TouchableOpacity>
      
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleClose}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Option</Text>
              <TouchableOpacity 
                onPress={handleClose}
                style={styles.closeButton}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={safeOptions}
              keyExtractor={(item) => item?.value?.toString() || ''}
              renderItem={({ item }) => {
                if (!item) return null;
                
                return (
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      item.value === selectedValue && styles.selectedItem
                    ]}
                    onPress={() => handleSelect(item.value)}
                  >
                    <Text 
                      style={[
                        styles.optionText,
                        item.value === selectedValue && styles.selectedOptionText
                      ]}
                    >
                      {item.label}
                    </Text>
                    
                    {item.value === selectedValue && (
                      <Check size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 12,
  },
  selectedText: {
    fontSize: 16,
    color: colors.text,
  },
  placeholderText: {
    fontSize: 16,
    color: colors.subtext,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedItem: {
    backgroundColor: colors.primaryLight,
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
  },
  selectedOptionText: {
    fontWeight: '600',
    color: colors.primary,
  },
});