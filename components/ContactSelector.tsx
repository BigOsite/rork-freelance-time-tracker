import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { X, User, Search, Plus } from 'lucide-react-native';
import * as Contacts from 'expo-contacts';
import Colors from '@/constants/colors';

export type Contact = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
};

type ContactSelectorProps = {
  visible: boolean;
  onClose: () => void;
  onSelectContact: (contact: Contact) => void;
};

export default function ContactSelector({ visible, onClose, onSelectContact }: ContactSelectorProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  // Form state for manual contact entry
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);
  
  useEffect(() => {
    if (visible) {
      loadContacts();
    }
  }, [visible]);
  
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredContacts(contacts);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = contacts.filter(contact => 
        contact.name.toLowerCase().includes(query) || 
        (contact.email && contact.email.toLowerCase().includes(query)) ||
        (contact.phone && contact.phone.toLowerCase().includes(query))
      );
      setFilteredContacts(filtered);
    }
  }, [searchQuery, contacts]);
  
  const loadContacts = async () => {
    try {
      setLoading(true);
      
      // Skip contacts permission on web
      if (Platform.OS === 'web') {
        setPermissionDenied(true);
        setLoading(false);
        return;
      }
      
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status !== 'granted') {
        setPermissionDenied(true);
        setLoading(false);
        return;
      }
      
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.ID,
          Contacts.Fields.Name,
          Contacts.Fields.Emails,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Addresses
        ],
        sort: Contacts.SortTypes.FirstName
      });
      
      if (data.length > 0) {
        const formattedContacts: Contact[] = data
          .filter(contact => contact.name) // Filter out contacts without names
          .map(contact => {
            const primaryEmail = contact.emails && contact.emails.length > 0 
              ? contact.emails[0].email 
              : undefined;
              
            const primaryPhone = contact.phoneNumbers && contact.phoneNumbers.length > 0 
              ? contact.phoneNumbers[0].number 
              : undefined;
              
            const primaryAddress = contact.addresses && contact.addresses.length > 0 
              ? [
                  contact.addresses[0].street,
                  contact.addresses[0].city,
                  contact.addresses[0].region,
                  contact.addresses[0].postalCode,
                  contact.addresses[0].country
                ].filter(Boolean).join(', ')
              : undefined;
            
            return {
              id: contact.id,
              name: contact.name,
              email: primaryEmail,
              phone: primaryPhone,
              address: primaryAddress
            };
          });
        
        setContacts(formattedContacts);
        setFilteredContacts(formattedContacts);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSelectContact = (contact: Contact) => {
    onSelectContact(contact);
    onClose();
  };
  
  const handleAddManualContact = () => {
    if (!manualName.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    
    const newContact: Contact = {
      id: `manual-${Date.now()}`,
      name: manualName.trim(),
      email: manualEmail.trim() || undefined,
      phone: manualPhone.trim() || undefined,
      address: manualAddress.trim() || undefined
    };
    
    onSelectContact(newContact);
    onClose();
  };
  
  const renderContactItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity 
      style={styles.contactItem}
      onPress={() => handleSelectContact(item)}
    >
      <View style={styles.contactAvatar}>
        <Text style={styles.contactInitial}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        {item.email && <Text style={styles.contactDetail}>{item.email}</Text>}
        {item.phone && <Text style={styles.contactDetail}>{item.phone}</Text>}
      </View>
    </TouchableOpacity>
  );
  
  const renderManualForm = () => (
    <View style={styles.manualFormContainer}>
      <Text style={styles.manualFormTitle}>Add Client</Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Name (required)</Text>
        <TextInput
          style={styles.input}
          value={manualName}
          onChangeText={setManualName}
          placeholder="Client name"
          placeholderTextColor={Colors.light.inactive}
        />
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={manualEmail}
          onChangeText={setManualEmail}
          placeholder="client@example.com"
          placeholderTextColor={Colors.light.inactive}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={manualPhone}
          onChangeText={setManualPhone}
          placeholder="(123) 456-7890"
          placeholderTextColor={Colors.light.inactive}
          keyboardType="phone-pad"
        />
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Address</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={manualAddress}
          onChangeText={setManualAddress}
          placeholder="Client address"
          placeholderTextColor={Colors.light.inactive}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>
      
      <View style={styles.formActions}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => setShowManualForm(false)}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.saveButton,
            !manualName.trim() && styles.disabledButton
          ]}
          onPress={handleAddManualContact}
          disabled={!manualName.trim()}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  const renderContactsList = () => (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Choose from contacts</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <Search size={20} color={Colors.light.subtext} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search contacts"
          placeholderTextColor={Colors.light.inactive}
        />
      </View>
      
      <TouchableOpacity 
        style={styles.addManualButton}
        onPress={() => setShowManualForm(true)}
      >
        <Plus size={20} color={Colors.light.primary} />
        <Text style={styles.addManualText}>Add client manually</Text>
      </TouchableOpacity>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : permissionDenied ? (
        <View style={styles.emptyContainer}>
          <User size={48} color={Colors.light.inactive} />
          <Text style={styles.emptyTitle}>Contacts access denied</Text>
          <Text style={styles.emptyText}>
            Please enable contacts permission in your device settings or add a client manually.
          </Text>
          <TouchableOpacity 
            style={styles.manualEntryButton}
            onPress={() => setShowManualForm(true)}
          >
            <Text style={styles.manualEntryButtonText}>Add Client Manually</Text>
          </TouchableOpacity>
        </View>
      ) : filteredContacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <User size={48} color={Colors.light.inactive} />
          <Text style={styles.emptyTitle}>No contacts found</Text>
          <Text style={styles.emptyText}>
            {searchQuery.trim() 
              ? `No results for "${searchQuery}"`
              : "You don't have any contacts yet"}
          </Text>
          <TouchableOpacity 
            style={styles.manualEntryButton}
            onPress={() => setShowManualForm(true)}
          >
            <Text style={styles.manualEntryButtonText}>Add Client Manually</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredContacts}
          renderItem={renderContactItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.contactsList}
        />
      )}
    </>
  );
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {showManualForm ? renderManualForm() : renderContactsList()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginLeft: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 8,
    margin: 16,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: Colors.light.text,
  },
  addManualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  addManualText: {
    fontSize: 16,
    color: Colors.light.primary,
    marginLeft: 8,
  },
  contactsList: {
    paddingBottom: 24,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 4,
  },
  contactDetail: {
    fontSize: 14,
    color: Colors.light.subtext,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.subtext,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.subtext,
    textAlign: 'center',
    marginBottom: 24,
  },
  manualEntryButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  manualEntryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  manualFormContainer: {
    flex: 1,
    padding: 16,
  },
  manualFormTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F7F9FC',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.light.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginLeft: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  disabledButton: {
    backgroundColor: Colors.light.inactive,
  },
});