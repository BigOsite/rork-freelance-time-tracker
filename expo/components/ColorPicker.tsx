import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  FlatList,
  SafeAreaView
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

type ColorPickerProps = {
  visible?: boolean;
  initialColor?: string;
  selectedColor?: string; // Added for compatibility with JobForm
  onClose?: () => void;
  onSelectColor: (color: string) => void;
};

export default function ColorPicker({ 
  visible, 
  initialColor,
  selectedColor, // Added for compatibility
  onClose = () => {}, 
  onSelectColor
}: ColorPickerProps) {
  const { colors } = useTheme();
  
  // Use selectedColor as fallback if initialColor is not provided
  const currentColor = initialColor || selectedColor || '#4A7AFF';
  
  const colorOptions = [
    '#4A7AFF', // Blue
    '#6C63FF', // Indigo
    '#FF5252', // Red
    '#4CAF50', // Green
    '#FFC107', // Yellow
    '#9C27B0', // Purple
    '#FF9800', // Orange
    '#03A9F4', // Light Blue
    '#E91E63', // Pink
    '#009688', // Teal
    '#795548', // Brown
    '#607D8B', // Blue Grey
  ];
  
  const styles = createStyles(colors);
  
  // If used as a modal
  if (visible !== undefined) {
    const renderColorItem = ({ item }: { item: string }) => (
      <TouchableOpacity
        style={[
          styles.colorItem,
          { backgroundColor: item },
          currentColor === item && styles.selectedColorItem
        ]}
        onPress={() => onSelectColor(item)}
      />
    );
    
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.title}>Select Color</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.colorPreviewContainer}>
              <View style={[styles.colorPreview, { backgroundColor: currentColor }]} />
            </View>
            
            <FlatList
              data={colorOptions}
              renderItem={renderColorItem}
              keyExtractor={(item) => item}
              numColumns={4}
              contentContainerStyle={styles.colorGrid}
            />
            
            <TouchableOpacity 
              style={styles.confirmButton} 
              onPress={() => onSelectColor(currentColor)}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }
  
  // If used as an inline component
  return (
    <View style={styles.inlineContainer}>
      <View style={styles.colorRow}>
        {colorOptions.slice(0, 6).map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.inlineColorItem,
              { backgroundColor: color },
              currentColor === color && styles.selectedColorItem
            ]}
            onPress={() => onSelectColor(color)}
          />
        ))}
      </View>
      <View style={styles.colorRow}>
        {colorOptions.slice(6).map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.inlineColorItem,
              { backgroundColor: color },
              currentColor === color && styles.selectedColorItem
            ]}
            onPress={() => onSelectColor(color)}
          />
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  colorPreviewContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  colorPreview: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  colorGrid: {
    alignItems: 'center',
    marginBottom: 20,
  },
  colorItem: {
    width: 50,
    height: 50,
    borderRadius: 25,
    margin: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  selectedColorItem: {
    borderWidth: 3,
    borderColor: colors.text,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Inline styles
  inlineContainer: {
    marginTop: 10,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  inlineColorItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
});