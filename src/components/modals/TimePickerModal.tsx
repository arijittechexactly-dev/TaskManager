import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { scale as s, verticalScale as vs, moderateScale as ms } from 'react-native-size-matters';

type Props = {
  visible: boolean;
  value: Date | null;
  onChange: (date: Date) => void;
  onRequestClose: () => void;
  title?: string;
};

const TimePickerModal: React.FC<Props> = ({ visible, value, onChange, onRequestClose, title = 'Select Time' }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onRequestClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <View style={{ backgroundColor: 'white', borderRadius: ms(12) }}>
            <DateTimePicker
              value={value ?? new Date()}
              mode="time"
              display="inline"
              onChange={(_event: any, date?: Date) => {
                if (date) onChange(date);
              }}
            />
          </View>
          <View style={[styles.modalActions, { marginTop: vs(12) }]}>            
            <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={onRequestClose}>
              <Text style={styles.modalBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, styles.modalSave]} onPress={onRequestClose}>
              <Text style={[styles.modalBtnText, styles.modalSaveText]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: 'white', padding: ms(16), borderTopLeftRadius: ms(20), borderTopRightRadius: ms(20) },
  modalTitle: { fontSize: ms(18), fontWeight: '800', marginBottom: vs(10), color: '#111827' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: vs(12) },
  modalBtn: { paddingVertical: vs(10), paddingHorizontal: s(14), borderRadius: ms(10) },
  modalCancel: { backgroundColor: '#f3f4f6', marginRight: s(8) },
  modalSave: { backgroundColor: '#4f46e5' },
  modalBtnText: { fontWeight: '700', color: '#111827', fontSize: ms(13) },
  modalSaveText: { color: 'white' },
});

export default TimePickerModal;
