import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { scale as s, verticalScale as vs, moderateScale as ms } from 'react-native-size-matters';

export type Priority = 'high' | 'medium' | 'low' | 'none';

type Props = {
  visible: boolean;
  selected: Priority;
  onSelect: (p: Priority) => void;
  onRequestClose: () => void;
};

const PriorityPickerModal: React.FC<Props> = ({ visible, selected, onSelect, onRequestClose }) => {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onRequestClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Select Priority</Text>
          <View style={styles.priorityList}>
            <PriorityRow label="None" color="#9ca3af" active={selected === 'none'} onPress={() => onSelect('none')} />
            <PriorityRow label="High" color="#ef4444" active={selected === 'high'} onPress={() => onSelect('high')} />
            <PriorityRow label="Medium" color="#f59e0b" active={selected === 'medium'} onPress={() => onSelect('medium')} />
            <PriorityRow label="Low" color="#10b981" active={selected === 'low'} onPress={() => onSelect('low')} />
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={onRequestClose}>
              <Text style={styles.modalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const PriorityRow: React.FC<{ label: string; color: string; active?: boolean; onPress: () => void }> = ({ label, color, active, onPress }) => (
  <TouchableOpacity style={[styles.priorityOption, active && { borderColor: color }]} onPress={onPress} accessibilityLabel={`${label} priority`}>
    <MaterialIcons name="flag" size={20} color={color} />
    <Text style={[styles.priorityLabel, { color }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: 'white', padding: ms(16), borderTopLeftRadius: ms(20), borderTopRightRadius: ms(20) },
  modalTitle: { fontSize: ms(18), fontWeight: '800', marginBottom: vs(10), color: '#111827' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: vs(12) },
  modalBtn: { paddingVertical: vs(10), paddingHorizontal: s(14), borderRadius: ms(10) },
  modalCancel: { backgroundColor: '#f3f4f6', marginRight: s(8) },
  modalBtnText: { fontWeight: '700', color: '#111827', fontSize: ms(13) },

  priorityList: { marginTop: vs(4) },
  priorityOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', paddingVertical: vs(10), paddingHorizontal: s(12), borderRadius: ms(12), marginBottom: vs(8) },
  priorityLabel: { marginLeft: s(10), fontWeight: '800', fontSize: ms(13) },
});

export default PriorityPickerModal;
