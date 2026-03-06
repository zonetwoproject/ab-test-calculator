import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration } from 'react-native';
import Colors from '@/constants/color';

interface PresetButtonsProps<T extends string | number> {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}

function PresetButtonsInner<T extends string | number>({
  options,
  selected,
  onSelect,
}: PresetButtonsProps<T>) {
  const handlePress = useCallback(
    (value: T) => {
      Vibration.vibrate(8);
      onSelect(value);
    },
    [onSelect]
  );

  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const isActive = opt.value === selected;
        return (
          <TouchableOpacity
            key={String(opt.value)}
            style={[styles.btn, isActive && styles.btnActive]}
            onPress={() => handlePress(opt.value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.btnText, isActive && styles.btnTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default React.memo(PresetButtonsInner) as typeof PresetButtonsInner;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  btnActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  btnTextActive: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
});
