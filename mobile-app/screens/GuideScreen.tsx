import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import {
  BookOpen,
  FlaskConical,
  BarChart3,
  Layers,
  Target,
  Info,
} from 'lucide-react-native';
import Colors from '@/constants/color';

interface GuideItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function GuideItem({ icon, title, description }: GuideItemProps) {
  return (
    <View style={styles.item}>
      <View style={styles.itemIcon}>{icon}</View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemDesc}>{description}</Text>
      </View>
    </View>
  );
}

interface FormulaCardProps {
  title: string;
  children: React.ReactNode;
}

function FormulaCard({ title, children }: FormulaCardProps) {
  return (
    <View style={styles.formulaCard}>
      <Text style={styles.formulaTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function GuideScreen() {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>실험 계산기란?</Text>
          <Text style={styles.introText}>
            동일 지면에서 여러 실험을 진행할 때 샘플이 겹치지 않도록 슬롯을 나눠 사용하세요.
            실험 기간, 방문 수, 트래픽 사용률을 입력하면 권장 슬롯 수를 자동으로 계산합니다.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>입력 항목 안내</Text>

        <GuideItem
          icon={<FlaskConical size={18} color={Colors.primary} />}
          title="실험 기간은 며칠인가요?"
          description="실험 기간은 1일 이상 입력하세요. 요일 효과를 반영하려면 최소 7일, 안정적인 결과를 위해 14일 이상을 권장합니다."
        />
        <GuideItem
          icon={<Layers size={18} color={Colors.warning} />}
          title="전체 트래픽 중 실험 사용 비율"
          description="예: 70 입력 시 추정 고유 유저의 70%만 실험에 사용합니다."
        />
        <GuideItem
          icon={<BarChart3 size={18} color={Colors.accent} />}
          title="목표 지표의 현재 수준은 어떤가요?"
          description="목표 지표의 최근 일평균 값을 입력하세요. (CTR, CVR 등) 이 값이 MDE 프리뷰 계산의 기준이 됩니다."
        />
        <GuideItem
          icon={<Target size={18} color={Colors.error} />}
          title="배분 비율을 선택하세요"
          description="첫 번째 값은 대조군입니다. 쉼표로 구분하고 합계가 100이 되도록 입력하세요."
        />
        <GuideItem
          icon={<Info size={18} color={Colors.info} />}
          title="이 지표를 얼마나 개선하고 싶으신가요?"
          description="상대 개선율(%) 또는 절대 개선폭(%p)으로 목표를 입력하세요."
        />

        <Text style={styles.sectionTitle}>계산 공식</Text>

        <FormulaCard title="고유 유저 수">
          <Text style={styles.formulaText}>
            totalUniqueUsers = round( dailyVisitors × duration ){'\n'}
            availableUsers = round( totalUniqueUsers × trafficUsagePct / 100 )
          </Text>
        </FormulaCard>

        <FormulaCard title="개선 목표 변환">
          <Text style={styles.formulaText}>
            relativeEffect = (relative mode) ? mdeInput/100 : mdeInput/baselinePct{'\n'}
            p2 = p1 × (1 + relativeEffect){'\n'}
            absoluteEffect(%p) = p1 × relativeEffect × 100
          </Text>
        </FormulaCard>

        <FormulaCard title="필요 샘플 수 (다중 그룹)">
          <Text style={styles.formulaText}>
            p2 = p1 × (1 + relativeEffect){'\n'}
            κᵢ = treatmentRatioᵢ / controlRatio{'\n'}
            nControlᵢ = (zα + zβ)² × [ p1(1-p1) + p2(1-p2)/κᵢ ] / (p2 - p1)²{'\n'}
            totalForPairᵢ = nControlᵢ / controlRatio{'\n'}
            requiredTotal = ceil( max(totalForPairᵢ) )
          </Text>
        </FormulaCard>

        <FormulaCard title="슬롯 계산">
          <Text style={styles.formulaText}>
            usersPerSlot = availableUsers / 10,000{'\n'}
            requiredSlots = ceil( requiredTotal / usersPerSlot ){'\n'}
            slotUsagePct = requiredSlots / 10,000 × 100
          </Text>
        </FormulaCard>

        <FormulaCard title="MDE 역산">
          <Text style={styles.formulaText}>
            이진 탐색으로 requiredTotal ≤ availableUsers를{'\n'}
            만족하는 최소 상대 효과를 산출합니다.{'\n'}
            탐색 범위: 0.0001 ~ min(3, (1-p1)/p1 × 0.999){'\n'}
            반복: 최대 60회
          </Text>
        </FormulaCard>

        <Text style={styles.sectionTitle}>Mark9 기준 안내</Text>
        <View style={styles.formulaCard}>
          <Text style={styles.formulaText}>
            - K값: 1 고정{'\n'}
            - 그룹 비중: 합계 100 필수{'\n'}
            - 현재 지표: 최근 일평균 기준값 입력 (CTR/CVR 등){'\n'}
            - 개선 목표: 상대(%) / 절대(%p) 선택{'\n'}
            - MDE 비교: 목표 가능 여부 + 기간(14/21/30일) 제안
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>A/B 테스트 계산기 Mark9</Text>
          <Text style={styles.footerSub}>v9 · 2026</Text>
        </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingTop: 8,
  },
  introCard: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 21,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
    marginTop: 8,
    letterSpacing: -0.2,
  },
  item: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  itemDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  formulaCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  formulaTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.primary,
    marginBottom: 8,
  },
  formulaText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  kTable: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  kRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  kBadge: {
    width: 40,
    height: 28,
    borderRadius: 6,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kBadgeText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  kDesc: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
  },
  footerSub: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },
});
