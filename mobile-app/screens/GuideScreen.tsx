import React, { useCallback, useImperativeHandle, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
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
  description: string;
  equation: string;
  code: string;
}

function FormulaCard({ title, description, equation, code }: FormulaCardProps) {
  return (
    <View style={styles.formulaCard}>
      <Text style={styles.formulaTitle}>{title}</Text>
      <View style={styles.formulaSection}>
        <Text style={styles.formulaDesc}>{description}</Text>
      </View>
      <View style={styles.formulaSection}>
        <Text style={styles.formulaEquation}>{equation}</Text>
      </View>
      <View style={styles.formulaSection}>
        <Text style={styles.formulaLabel}>공식(코드)</Text>
        <View style={styles.formulaCodeBox}>
          <Text style={styles.formulaCode}>{code}</Text>
        </View>
      </View>
    </View>
  );
}

export type GuideScreenHandle = {
  scrollToTop: () => void;
};

const GuideScreen = React.forwardRef<GuideScreenHandle>(function GuideScreen(_, ref) {
  const scrollRef = useRef<ScrollView>(null);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      scrollToTop,
    }),
    [scrollToTop]
  );

  React.useEffect(() => {
    return navigation.addListener('tabPress', () => {
      if (navigation.isFocused()) {
        scrollToTop();
      }
    });
  }, [navigation, scrollToTop]);

  const formulaCards: FormulaCardProps[] = [
    {
      title: '고유 유저 수',
      description: '일평균 방문자 수와 실험 기간을 곱해 예상 고유 유저를 계산하고,\n실험 사용 비율을 반영해 실제 사용 가능 유저를 계산합니다.',
      equation: '예상 고유 유저 수 = 반올림(일평균 방문자 수 × 실험 기간)\n실험 사용 가능 유저 수 = 반올림(예상 고유 유저 수 × 실험 사용 비율 / 100)',
      code: 'totalUniqueUsers = round(dailyVisitors * duration)\navailableUsers = round(totalUniqueUsers * trafficUsagePct / 100)',
    },
    {
      title: '개선 목표 변환',
      description: '입력 방식(상대/절대)에 따라 계산용 개선율을 통일합니다.',
      equation: '상대 개선율 입력 시\n개선율 = 입력값 / 100\n실험군 예상 지표 = 현재 지표 × (1 + 개선율)\n\n절대 개선폭(%p) 입력 시\n실험군 예상 지표 = 현재 지표 + 입력값(%p)\n내부 계산용 개선율 = 입력값 / 현재 지표(%)',
      code: 'relativeEffect = (relative mode) ? (mdeInput / 100) : (mdeInput / baselinePct)\np2 = p1 * (1 + relativeEffect)\nabsoluteEffectPctPoint = p1 * relativeEffect * 100',
    },
    {
      title: '필요 샘플 수 (다중 그룹)',
      description: '각 실험군이 대조군과 비교될 때 필요한 샘플을 계산하고,\n그중 가장 큰 값을 전체 필요 샘플로 사용합니다.',
      equation: '실험군 i의 배분비(κi) = 실험군 i 비중 / 대조군 비중\n대조군 필요 샘플(ni) = (zα + zβ)^2 × [ p1(1-p1) + p2(1-p2)/κi ] / (p2-p1)^2\n해당 조합 총 필요 샘플 = ni / 대조군 비중\n최종 총 필요 샘플 수 = 올림(각 조합 총 필요 샘플 중 최대값)',
      code: 'kappa_i = treatmentRatio_i / controlRatio\nnControl_i = ((zAlpha + zBeta)^2 * (p1*(1-p1) + p2*(1-p2)/kappa_i)) / (p2 - p1)^2\ntotalForPair_i = nControl_i / controlRatio\nrequiredTotal = ceil(max(totalForPair_i))',
    },
    {
      title: '슬롯 계산',
      description: '사용 가능 유저를 10,000개 슬롯 기준으로 환산해\n필요한 슬롯 수를 계산합니다.',
      equation: '슬롯당 유저 수 = 실험 사용 가능 유저 수 / 10,000\n필요 슬롯 수 = 올림(총 필요 샘플 수 / 슬롯당 유저 수)\n슬롯 사용률(%) = 필요 슬롯 수 / 10,000 × 100',
      code: 'usersPerSlot = availableUsers / 10000\nrequiredSlots = ceil(requiredTotal / usersPerSlot)\nslotUsagePct = (requiredSlots / 10000) * 100',
    },
    {
      title: 'MDE 역산',
      description: '현재 조건에서 검증 가능한 최소 개선율을 찾기 위해,\n개선율을 가정하고 샘플 수를 비교하면서 범위를 반복적으로 줄입니다.',
      equation: '1) 개선율 r 가정 → p2 계산\n2) 해당 r의 필요 샘플 계산\n3) 필요 샘플 > 사용 가능 유저면 r 증가\n4) 필요 샘플 ≤ 사용 가능 유저면 r 감소\n5) 이 과정을 반복해 최소 r 확정 (최대 60회)\n\n최종 MDE(상대 %) = r * 100\n최종 MDE(절대 %p) = p1 * r * 100',
      code: 'low = 0.0001\nhigh = min(3, ((1 - p1) / p1) * 0.999)\nfor up to 60 iterations:\n  mid = (low + high) / 2\n  required = requiredUsers(mid)\n  if required <= availableUsers: high = mid\n  else: low = mid',
    },
  ];

  return (
    <ScrollView
      ref={scrollRef}
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
          icon={<Target size={18} color={Colors.error} />}
          title="배분 비율을 선택하세요"
          description="첫 번째 값은 대조군입니다. 쉼표로 구분하고 합계가 100이 되도록 입력하세요."
        />
        <GuideItem
          icon={<BarChart3 size={18} color={Colors.accent} />}
          title="목표 지표의 현재 수준은 어떤가요?"
          description="목표 지표의 최근 일평균 값을 입력하세요. (CTR, CVR 등) 이 값이 MDE 프리뷰 계산의 기준이 됩니다."
        />
        <GuideItem
          icon={<Info size={18} color={Colors.info} />}
          title="이 지표를 얼마나 개선하고 싶으신가요?"
          description="상대 개선율(%) 또는 절대 개선폭(%p)으로 목표를 입력하세요."
        />

        <Text style={styles.sectionTitle}>계산 공식</Text>

        {formulaCards.map((formula) => (
          <FormulaCard
            key={formula.title}
            title={formula.title}
            description={formula.description}
            equation={formula.equation}
            code={formula.code}
          />
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>A/B 테스트 계산기 Mark9</Text>
          <Text style={styles.footerSub}>v9 · 2026</Text>
        </View>
    </ScrollView>
  );
});

export default GuideScreen;

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
  formulaSection: {
    marginTop: 10,
  },
  formulaLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#4b5b73',
    marginBottom: 6,
  },
  formulaDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  formulaEquation: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  formulaCodeBox: {
    backgroundColor: '#f6f8fc',
    borderWidth: 1,
    borderColor: '#e3e8f2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  formulaCode: {
    fontSize: 12,
    color: '#37465d',
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
