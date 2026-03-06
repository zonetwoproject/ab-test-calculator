import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react-native';
import Colors from '@/constants/color';

type FeedbackType = 'success' | 'warning' | 'error' | 'info';

interface FeedbackMessageProps {
  type: FeedbackType;
  message: string;
}

const iconMap = {
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleAlert,
  info: Info,
};

const colorMap = {
  success: { bg: Colors.successBg, text: Colors.success, border: '#A7F3D0' },
  warning: { bg: Colors.warningBg, text: Colors.warning, border: '#FDE68A' },
  error: { bg: Colors.errorBg, text: Colors.error, border: '#FECACA' },
  info: { bg: Colors.infoBg, text: Colors.info, border: '#BFDBFE' },
};

export default React.memo(function FeedbackMessage({ type, message }: FeedbackMessageProps) {
  const Icon = iconMap[type];
  const colors = colorMap[type];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Icon size={14} color={colors.text} />
      <Text style={[styles.text, { color: colors.text }]}>{message}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '500' as const,
    flex: 1,
  },
});
