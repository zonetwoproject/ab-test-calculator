import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/color';

interface ResultCardProps {
  title: string;
  value: string;
  subtitle?: string;
  accent?: boolean;
  icon?: React.ReactNode;
}

export default React.memo(function ResultCard({
  title,
  value,
  subtitle,
  accent,
  icon,
}: ResultCardProps) {
  return (
    <View style={[styles.card, accent && styles.cardAccent]}>
      <View style={styles.header}>
        {icon}
        <Text style={[styles.title, accent && styles.titleAccent]}>{title}</Text>
      </View>
      <Text style={[styles.value, accent && styles.valueAccent]}>{value}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, accent && styles.subtitleAccent]}>{subtitle}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    minWidth: 140,
  },
  cardAccent: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  titleAccent: {
    color: 'rgba(255,255,255,0.75)',
  },
  value: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  valueAccent: {
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  subtitleAccent: {
    color: 'rgba(255,255,255,0.6)',
  },
});
