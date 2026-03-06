import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Keyboard,
  Vibration,
} from 'react-native';
import { useScrollToTop } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Layers,
  RotateCcw,
  Users,
  Zap,
} from 'lucide-react-native';

import Colors from '@/constants/color';
import {
  DEFAULTS,
  DURATION_SUGGESTIONS,
  FIXED_K,
  GROUP_COUNT_OPTIONS,
  MDE_ABSOLUTE_PRESETS,
  MDE_RELATIVE_PRESETS,
} from '@/constants/calculator';
import {
  calculate,
  computeDetectable,
  formatNumber,
  getEvenRatios,
  getFixedKMeta,
  getPreviewContext,
  parseRatios,
  validateInput,
  type CalculationBundle,
  type CalculationInput,
  type MdeMode,
} from '@/utils/statistics';
import FeedbackMessage from '@/components/FeedbackMessage';
import InputField from '@/components/InputField';
import PresetButtons from '@/components/PresetButtons';
import SectionCard from '@/components/SectionCard';

type ComparisonInfo =
  | {
      kind: 'success' | 'warning' | 'error';
      title: string;
      detail: string;
      suggestions?: { days: number; minRelPct: number }[];
    }
  | null;

function parseNumber(value: string): number {
  return Number.parseFloat(value);
}

function sanitizeIntegerInput(value: string): string {
  return value.replace(/[^\d]/g, '');
}

function sanitizeDecimalInput(value: string): string {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const [first, ...rest] = cleaned.split('.');
  if (rest.length === 0) return first;
  return `${first}.${rest.join('')}`;
}

function sanitizeRatioInput(value: string): string {
  return value.replace(/[^0-9.,]/g, '');
}

function formatPctInput(value: number): string {
  return value.toFixed(4).replace(/\.?0+$/, '');
}

export default function CalculatorScreen() {
  const [duration, setDuration] = useState<string>(String(DEFAULTS.duration));
  const [dailyVisitors, setDailyVisitors] = useState<string>(String(DEFAULTS.dailyVisitors));
  const [groupCount, setGroupCount] = useState<number>(DEFAULTS.groupCount);
  const [groupRatiosStr, setGroupRatiosStr] = useState<string>(getEvenRatios(DEFAULTS.groupCount).join(','));
  const [baselinePct, setBaselinePct] = useState<string>(String(DEFAULTS.baselinePct));
  const [mdeMode, setMdeMode] = useState<MdeMode>(DEFAULTS.mdeMode);
  const [mdeValue, setMdeValue] = useState<string>(String(DEFAULTS.mdeRelative));
  const [confidencePct, setConfidencePct] = useState<string>(String(DEFAULTS.confidencePct));
  const [powerPct, setPowerPct] = useState<string>(String(DEFAULTS.powerPct));
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [bundle, setBundle] = useState<CalculationBundle | null>(null);

  const advancedAnim = useRef(new Animated.Value(0)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const durationFeedback = useMemo(() => {
    const days = Number.parseInt(duration, 10);
    if (!days || days < 1) {
      return { type: 'error' as const, message: '❌ 1일 이상 입력하세요.' };
    }
    if (days < 7) {
      return { type: 'warning' as const, message: `💡 ${days}일은 7일 미만으로 요일 효과가 남을 수 있습니다.` };
    }
    if (days < 14) {
      return { type: 'info' as const, message: `✅ ${days}일은 가능하지만, 14일 이상이 더 안정적입니다.` };
    }
    return { type: 'success' as const, message: `✅ ${days}일은 요일 효과를 제거하기에 충분한 기간입니다.` };
  }, [duration]);

  const visitorsFeedback = useMemo(() => {
    const raw = dailyVisitors.trim();
    if (!raw) {
      return {
        type: 'info' as const,
        message: '실험 분배 단위 기준, 최근 1개월 일평균 방문 수를 입력하세요.',
      };
    }

    const visitors = parseNumber(raw);
    if (!Number.isFinite(visitors) || visitors < 1) {
      return {
        type: 'error' as const,
        message: '❌ 1명 이상 입력하세요.',
      };
    }

    if (visitors < 1000) {
      return {
        type: 'warning' as const,
        message: '💡 트래픽이 낮아 실험 기간이 길어질 수 있습니다.',
      };
    }

    return null;
  }, [dailyVisitors]);

  const uniqueUsersPreview = useMemo(() => {
    const days = Number.parseInt(duration, 10);
    const visitors = parseNumber(dailyVisitors);

    if (!Number.isFinite(days) || !Number.isFinite(visitors)) {
      return null;
    }
    if (days < 1 || visitors < 1) {
      return null;
    }

    const totalUniqueUsers = Math.round((visitors * days) / FIXED_K);
    const availableUsers = totalUniqueUsers;

    return {
      totalUniqueUsers,
      availableUsers,
      visitors,
      days,
    };
  }, [duration, dailyVisitors]);

  const ratioFeedback = useMemo(() => {
    try {
      const ratioMeta = parseRatios(groupRatiosStr, groupCount);
      const control = ratioMeta.values[0].toFixed(2).replace(/\.00$/, '');
      const treatments = ratioMeta.values
        .slice(1)
        .map((v) => v.toFixed(2).replace(/\.00$/, ''))
        .join(' / ');

      return {
        type: 'success' as const,
        message: `대조군 ${control}% | 실험군 ${treatments}%`,
      };
    } catch (error) {
      return {
        type: 'error' as const,
        message: error instanceof Error ? error.message : '그룹 비중을 확인해주세요.',
      };
    }
  }, [groupRatiosStr, groupCount]);

  const previewInput = useMemo<CalculationInput>(() => ({
    duration: Number.parseInt(duration, 10),
    dailyVisitors: parseNumber(dailyVisitors),
    groupCount,
    groupRatiosText: groupRatiosStr,
    baselinePct: parseNumber(baselinePct),
    mdeMode,
    mdeInput: parseNumber(mdeValue),
    confidencePct: parseNumber(confidencePct),
    powerPct: parseNumber(powerPct),
  }), [duration, dailyVisitors, groupCount, groupRatiosStr, baselinePct, mdeMode, mdeValue, confidencePct, powerPct]);

  const mdePreview = useMemo(() => {
    try {
      const { formData, ratioMeta, availableUsers } = getPreviewContext(previewInput);
      if (!formData.baselinePct || formData.baselinePct <= 0) {
        return null;
      }

      const detectable = computeDetectable(
        availableUsers,
        formData.baselinePct,
        ratioMeta,
        formData.confidencePct,
        formData.powerPct
      );

      if (!detectable) {
        return null;
      }

      return {
        relativePct: detectable.relativePct,
        absolutePctPoint: detectable.absolutePctPoint,
        baselineBefore: formData.baselinePct,
        baselineAfter: formData.baselinePct + detectable.absolutePctPoint,
      };
    } catch {
      return null;
    }
  }, [previewInput]);

  const mdeComparison = useMemo<ComparisonInfo>(() => {
    try {
      const { formData, ratioMeta, availableUsers } = getPreviewContext(previewInput);

      if (!formData.mdeInput || !formData.baselinePct) {
        return null;
      }

      const validationError = validateInput(previewInput);
      if (validationError) {
        return null;
      }

      const detectable = computeDetectable(
        availableUsers,
        formData.baselinePct,
        ratioMeta,
        formData.confidencePct,
        formData.powerPct
      );

      if (!detectable) {
        return null;
      }

      const targetRelative = formData.mdeMode === 'relative'
        ? formData.mdeInput
        : (formData.mdeInput / formData.baselinePct) * 100;

      if (!Number.isFinite(targetRelative) || targetRelative <= 0) {
        return null;
      }

      if (targetRelative > detectable.relativePct * 1.5) {
        return {
          kind: 'success',
          title: `최소 감지 가능 개선: ${detectable.relativePct.toFixed(4)}% (상대)`,
          detail: `목표(${targetRelative.toFixed(2)}%)는 충분히 검증 가능합니다.`,
        };
      }

      if (targetRelative >= detectable.relativePct) {
        return {
          kind: 'warning',
          title: `최소 감지 가능 개선: ${detectable.relativePct.toFixed(4)}% (상대)`,
          detail: `목표(${targetRelative.toFixed(2)}%)는 검증 가능하지만 여유가 크지 않습니다.`,
        };
      }

      const suggestions: { days: number; minRelPct: number }[] = [];
      for (const days of DURATION_SUGGESTIONS) {
        if (days <= formData.duration) {
          continue;
        }

        const futureTotal = Math.round((formData.dailyVisitors * days) / FIXED_K);
        const futureAvailable = futureTotal;

        const futureDetectable = computeDetectable(
          futureAvailable,
          formData.baselinePct,
          ratioMeta,
          formData.confidencePct,
          formData.powerPct
        );

        if (futureDetectable && futureDetectable.relativePct <= targetRelative) {
          suggestions.push({
            days,
            minRelPct: futureDetectable.relativePct,
          });
        }
      }

      return {
        kind: 'error',
        title: `현재 최소 감지 가능 개선: ${detectable.relativePct.toFixed(4)}% (상대)`,
        detail: `목표(${targetRelative.toFixed(2)}%)는 현재 설정에서 검증이 어렵습니다.`,
        suggestions,
      };
    } catch {
      return null;
    }
  }, [previewInput]);

  const groupCountOptions = useMemo(
    () =>
      GROUP_COUNT_OPTIONS.map((value) => {
        const labels: Record<number, string> = {
          2: '2개 (A/B)',
          3: '3개 (A/B/C)',
          4: '4개 (A/B/C/D)',
          5: '5개 (A/B/C/D/E)',
        };
        return { value, label: labels[value] ?? `${value}개` };
      }),
    []
  );

  const mdePresetOptions = useMemo(() => {
    const values = mdeMode === 'relative' ? MDE_RELATIVE_PRESETS : MDE_ABSOLUTE_PRESETS;
    return values.map((value) => ({
      value,
      label: mdeMode === 'relative' ? `+${value}%` : `+${value}%p`,
    }));
  }, [mdeMode]);

  const advancedHeight = advancedAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 180],
  });

  const toggleAdvanced = useCallback(() => {
    setShowAdvanced((prev) => {
      Animated.timing(advancedAnim, {
        toValue: prev ? 0 : 1,
        duration: 240,
        useNativeDriver: false,
      }).start();
      return !prev;
    });
  }, [advancedAnim]);

  const applyEvenRatios = useCallback(() => {
    const values = getEvenRatios(groupCount);
    setGroupRatiosStr(values.join(','));
  }, [groupCount]);

  const applySuggestedDuration = useCallback((days: number) => {
    setDuration(String(days));
  }, []);

  const handleGroupCountChange = useCallback((count: number) => {
    setGroupCount(count);
    setGroupRatiosStr(getEvenRatios(count).join(','));
  }, []);

  const handleMdeModeChange = useCallback((mode: MdeMode) => {
    setMdeMode(mode);
    setMdeValue(mode === 'relative' ? String(DEFAULTS.mdeRelative) : String(DEFAULTS.mdeAbsolute));
  }, []);

  const handleReset = useCallback(() => {
    setDuration(String(DEFAULTS.duration));
    setDailyVisitors(String(DEFAULTS.dailyVisitors));
    setGroupCount(DEFAULTS.groupCount);
    setGroupRatiosStr(getEvenRatios(DEFAULTS.groupCount).join(','));
    setBaselinePct(String(DEFAULTS.baselinePct));
    setMdeMode(DEFAULTS.mdeMode);
    setMdeValue(String(DEFAULTS.mdeRelative));
    setConfidencePct(String(DEFAULTS.confidencePct));
    setPowerPct(String(DEFAULTS.powerPct));
    setBundle(null);
    setShowAdvanced(false);
    advancedAnim.setValue(0);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [advancedAnim]);

  const handleCalculate = useCallback(() => {
    Keyboard.dismiss();
    Vibration.vibrate(10);

    const input: CalculationInput = {
      duration: Number.parseInt(duration, 10),
      dailyVisitors: parseNumber(dailyVisitors),
      groupCount,
      groupRatiosText: groupRatiosStr,
      baselinePct: parseNumber(baselinePct),
      mdeMode,
      mdeInput: parseNumber(mdeValue),
      confidencePct: parseNumber(confidencePct),
      powerPct: parseNumber(powerPct),
    };

    const errorMessage = validateInput(input);
    if (errorMessage) {
      Alert.alert('입력 오류', errorMessage);
      return;
    }

    const calcBundle = calculate(input);
    setBundle(calcBundle);

    resultAnim.setValue(0);
    Animated.spring(resultAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 300);
  }, [duration, dailyVisitors, groupCount, groupRatiosStr, baselinePct, mdeMode, mdeValue, confidencePct, powerPct, resultAnim]);

  const handleCopy = useCallback(() => {
    if (!bundle) {
      Alert.alert('알림', '먼저 계산을 실행해주세요.');
      return;
    }

    Vibration.vibrate(12);

    const { formData, ratioMeta, result } = bundle;
    const baselineText = `${formatPctInput(formData.baselinePct)}%`;
    const targetValue = formData.mdeMode === 'relative'
      ? formData.baselinePct * (1 + formData.mdeInput / 100)
      : formData.baselinePct + formData.mdeInput;
    const targetText = `${targetValue.toFixed(2)}%`;
    const improvementText = formData.mdeMode === 'relative'
      ? `${formatPctInput(formData.mdeInput)}% (${baselineText} → ${targetText})`
      : `${formatPctInput(formData.mdeInput)}%p (${baselineText} → ${targetText})`;

    const roundedRatios = ratioMeta.values.map((value) => Math.round(value));
    const allocationText = roundedRatios.length === 2
      ? `대조군(${roundedRatios[0]}%) : 실험군(${roundedRatios[1]}%)`
      : roundedRatios.map((value, idx) => `그룹${idx + 1}(${value}%)`).join(' : ');

    const detectable = computeDetectable(
      result.availableUsers,
      formData.baselinePct,
      ratioMeta,
      formData.confidencePct,
      formData.powerPct
    );

    const targetRelative = formData.mdeMode === 'relative'
      ? formData.mdeInput
      : (formData.mdeInput / formData.baselinePct) * 100;
    const mdeText = detectable ? `${detectable.relativePct.toFixed(4)}%` : '계산 불가';
    const verdictText = detectable && targetRelative >= detectable.relativePct
      ? '실험 검증 가능'
      : '실험 검증 어려움';

    const slotRangeText = Number.isFinite(result.requiredSlots)
      ? `${formatNumber(result.requiredSlots)}`
      : '계산 불가';

    const slotPctText = Number.isFinite(result.slotUsagePct)
      ? result.slotUsagePct.toFixed(1)
      : '계산 불가';

    const slotSummaryText = Number.isFinite(result.requiredSlots) && Number.isFinite(result.slotUsagePct)
      ? `${slotRangeText}개 (${slotPctText}%)`
      : '계산 불가';

    const kMeta = getFixedKMeta();
    const summary =
      '<고유 사용자 계산>\n' +
      `- 실험 기간: ${formData.duration}일\n` +
      `- 예상 방문 빈도: 고정(k=${kMeta.k.toFixed(2)})\n` +
      `- 일평균 방문자 수: ${formatNumber(formData.dailyVisitors)}\n` +
      `→ 예상 고유 사용자 수: ${formatNumber(result.totalUniqueUsers)}명\n\n` +
      '<실험 목표 계산>\n' +
      `- 실험 그룹 배분: ${allocationText}\n` +
      `- 기준 지표: ${baselineText}\n` +
      `- 개선 목표: ${improvementText}\n` +
      `- MDE: ${mdeText}\n` +
      `→ ${verdictText}\n\n` +
      '<슬롯 계산 결과>\n' +
      `- 총 필요 샘플 수: ${formatNumber(result.requiredTotal)}명\n` +
      `→ 필요 슬롯 수: ${slotSummaryText}`;

    Clipboard.setString(summary);
      Alert.alert('결과 복사', '결과를 복사했습니다.');
  }, [bundle]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <SectionCard title="고유 유저 계산하기">
        <InputField
          label="실험 기간은 며칠인가요?"
          value={duration}
          onChangeText={(text) => setDuration(sanitizeIntegerInput(text))}
          placeholder="14"
          suffix="일"
          keyboardType="numeric"
          testID="prop-duration"
        />
        <FeedbackMessage type={durationFeedback.type} message={durationFeedback.message} />

        <View style={styles.spacerSm} />

        <FeedbackMessage type="info" message="K값은 1로 고정됩니다." />

        <InputField
          label="하루에 몇 명이 방문하나요?"
          value={dailyVisitors}
          onChangeText={(text) => setDailyVisitors(sanitizeIntegerInput(text))}
          placeholder="예: 100000"
          suffix="명/일"
          keyboardType="numeric"
          testID="prop-daily-visitors"
        />
        {visitorsFeedback ? <FeedbackMessage type={visitorsFeedback.type} message={visitorsFeedback.message} /> : null}

        {uniqueUsersPreview ? (
          <View style={styles.previewBox}>
            <Users size={14} color={Colors.primary} />
            <Text style={styles.previewText}>
              💡 예상 고유 유저: 약 <Text style={styles.previewBold}>{formatNumber(uniqueUsersPreview.totalUniqueUsers)}명</Text>{'\n'}
              계산 사용 유저: <Text style={styles.previewBold}>{formatNumber(uniqueUsersPreview.availableUsers)}명</Text>{'\n'}
              계산: ({formatNumber(uniqueUsersPreview.visitors)} × {uniqueUsersPreview.days}일) ÷ {FIXED_K.toFixed(2)} (K=1 고정)
            </Text>
          </View>
        ) : null}
      </SectionCard>

      <SectionCard title="실험 그룹 배분하기" subtitle="최소 감지 효과 계산하기">
        <Text style={styles.fieldLabel}>실험 그룹 수 (대조군 포함)</Text>
        <PresetButtons options={groupCountOptions} selected={groupCount} onSelect={handleGroupCountChange} />

        <View style={styles.spacerSm} />

        <InputField
          label="배분 비율을 선택하세요"
          value={groupRatiosStr}
          onChangeText={(text) => setGroupRatiosStr(sanitizeRatioInput(text))}
          placeholder="예: 50,30,20"
          keyboardType="default"
          testID="group-ratios"
        />
        <Text style={styles.helpText}>첫 번째 값은 대조군입니다. 쉼표로 구분하세요.</Text>

        <TouchableOpacity style={styles.evenBtn} onPress={applyEvenRatios} activeOpacity={0.7}>
          <Text style={styles.evenBtnText}>균등 비중 자동입력</Text>
        </TouchableOpacity>

        <FeedbackMessage type={ratioFeedback.type} message={ratioFeedback.message} />

        <View style={styles.spacerMd} />

        <InputField
          label="목표 지표의 현재 수준은 어떤가요?"
          value={baselinePct}
          onChangeText={(text) => setBaselinePct(sanitizeDecimalInput(text))}
          placeholder="예: 3"
          suffix="%"
          keyboardType="decimal-pad"
          testID="prop-baseline"
        />

        <Text style={styles.fieldLabel}>이 지표를 얼마나 개선하고 싶으신가요?</Text>
        <PresetButtons
          options={[
            { value: 'relative' as MdeMode, label: '상대 개선율 (%)' },
            { value: 'absolute' as MdeMode, label: '절대 개선폭 (%p)' },
          ]}
          selected={mdeMode}
          onSelect={handleMdeModeChange}
        />

        <View style={styles.spacerSm} />

        <Text style={styles.fieldLabel}>목표 개선값</Text>
        <PresetButtons
          options={mdePresetOptions}
          selected={Number.parseFloat(mdeValue) || 0}
          onSelect={(value) => setMdeValue(String(value))}
        />

        <InputField
          label=""
          value={mdeValue}
          onChangeText={(text) => setMdeValue(sanitizeDecimalInput(text))}
          placeholder={mdeMode === 'relative' ? '예: 5' : '예: 0.2'}
          suffix={mdeMode === 'relative' ? '%' : '%p'}
          keyboardType="decimal-pad"
          testID="prop-mde"
        />

        <Text style={styles.helpText}>
          {mdeMode === 'relative'
            ? '상대 개선율 기준으로 목표를 입력하세요.'
            : '절대 개선폭(%p) 기준으로 목표를 입력하세요. 예: 0.2%p'}
        </Text>

        {mdePreview ? (
          <View style={styles.mdePreviewBox}>
            <Text style={styles.mdePreviewTitle}>🎯 현재 조건에서 검증 가능한 최소 효과</Text>
            <Text style={styles.mdePreviewText}>
              상대 <Text style={styles.previewBold}>{mdePreview.relativePct.toFixed(4)}%</Text> / 절대{' '}
              <Text style={styles.previewBold}>{mdePreview.absolutePctPoint.toFixed(3)}%p</Text>{'\n'}
              기준 {mdePreview.baselineBefore.toFixed(2)}% → {mdePreview.baselineAfter.toFixed(2)}%
            </Text>
          </View>
        ) : null}

        {mdeComparison ? (
          <View
            style={[
              styles.comparisonBox,
              mdeComparison.kind === 'success' && styles.comparisonSuccess,
              mdeComparison.kind === 'warning' && styles.comparisonWarning,
              mdeComparison.kind === 'error' && styles.comparisonError,
            ]}
          >
            <Text style={styles.comparisonTitle}>{mdeComparison.title}</Text>
            <Text style={styles.comparisonDetail}>{mdeComparison.detail}</Text>
            {mdeComparison.kind === 'error' ? (
              <View style={styles.suggestionWrap}>
                {mdeComparison.suggestions && mdeComparison.suggestions.length > 0 ? (
                  mdeComparison.suggestions.map((s) => (
                    <TouchableOpacity
                      key={`${s.days}-${s.minRelPct}`}
                      style={styles.suggestionBtn}
                      onPress={() => applySuggestedDuration(s.days)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.suggestionBtnText}>
                        {s.days}일로 재계산 → 최소 {s.minRelPct.toFixed(4)}%
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.suggestionFallback}>권장: 기간 연장 또는 방문자 수 증가를 검토하세요.</Text>
                )}
              </View>
            ) : null}
          </View>
        ) : null}
      </SectionCard>

      <TouchableOpacity style={styles.advancedToggle} onPress={toggleAdvanced} activeOpacity={0.7}>
        <Text style={styles.advancedToggleText}>⚙️ 고급 설정</Text>
        {showAdvanced ? <ChevronUp size={16} color={Colors.textSecondary} /> : <ChevronDown size={16} color={Colors.textSecondary} />}
      </TouchableOpacity>

      <Animated.View style={[styles.advancedContainer, { maxHeight: advancedHeight, overflow: 'hidden' }]}> 
        <View style={styles.advancedInner}>
          <InputField
            label="신뢰도 (Confidence)"
            value={confidencePct}
            onChangeText={(text) => setConfidencePct(sanitizeDecimalInput(text))}
            placeholder="95"
            suffix="%"
            keyboardType="decimal-pad"
            testID="confidence-level"
          />
          <InputField
            label="검정력 (Power)"
            value={powerPct}
            onChangeText={(text) => setPowerPct(sanitizeDecimalInput(text))}
            placeholder="80"
            suffix="%"
            keyboardType="decimal-pad"
            testID="power-level"
          />
        </View>
      </Animated.View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.calculateBtn} onPress={handleCalculate} activeOpacity={0.8} testID="calculate-btn">
          <Zap size={18} color="#FFFFFF" />
          <Text style={styles.calculateBtnText}>🎰 슬롯 계산하기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.8} testID="reset-btn">
          <RotateCcw size={16} color={Colors.textSecondary} />
          <Text style={styles.resetBtnText}>초기화</Text>
        </TouchableOpacity>
      </View>

      {bundle ? (
        <Animated.View
          style={[
            styles.resultSection,
            {
              opacity: resultAnim,
              transform: [
                {
                  translateY: resultAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [24, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>계산 결과</Text>
            <TouchableOpacity
              style={styles.copyIconBtn}
              onPress={handleCopy}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="결과 복사"
            >
              <Copy size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.slotCard}>
            <View style={styles.slotHeader}>
              <Layers size={18} color={Colors.primary} />
              <Text style={styles.slotTitle}>필요한 슬롯</Text>
            </View>
            <Text style={styles.slotValue}>{Number.isFinite(bundle.result.requiredSlots) ? formatNumber(bundle.result.requiredSlots) : '계산 불가'}</Text>
            <Text style={styles.slotPct}>
              {Number.isFinite(bundle.result.slotUsagePct)
                ? `전체 슬롯의 ${bundle.result.slotUsagePct.toFixed(2)}% (10,000개 중 ${formatNumber(bundle.result.requiredSlots)}개 필요)`
                : '슬롯 사용률 계산 불가'}
            </Text>
          </View>

          <View style={styles.resultGrid}>
            <View style={styles.resultCard}>
              <Text style={styles.resultCardLabel}>총 필요 샘플</Text>
              <Text style={styles.resultCardValue}>{formatNumber(bundle.result.requiredTotal)}명</Text>
            </View>
            <View style={styles.resultCard}>
              <Text style={styles.resultCardLabel}>실험 기간</Text>
              <Text style={styles.resultCardValue}>{bundle.formData.duration}일</Text>
            </View>
            <View style={styles.resultCard}>
              <Text style={styles.resultCardLabel}>배분</Text>
              <Text style={styles.resultCardValueSmall}>
                {bundle.ratioMeta.values.map((value) => value.toFixed(2).replace(/\.00$/, '')).join(' : ')}
              </Text>
            </View>
          </View>
        </Animated.View>
      ) : null}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingTop: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  helpText: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
    marginBottom: 8,
  },
  spacerSm: {
    height: 12,
  },
  spacerMd: {
    height: 18,
  },
  evenBtn: {
    alignSelf: 'flex-start',
    marginTop: -8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  evenBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  previewBox: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  previewText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  previewBold: {
    fontWeight: '700',
    color: Colors.primary,
  },
  mdePreviewBox: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 6,
  },
  mdePreviewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  mdePreviewText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  comparisonBox: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  comparisonSuccess: {
    borderColor: '#A7F3D0',
    backgroundColor: Colors.successBg,
  },
  comparisonWarning: {
    borderColor: '#FDE68A',
    backgroundColor: Colors.warningBg,
  },
  comparisonError: {
    borderColor: '#FECACA',
    backgroundColor: Colors.errorBg,
  },
  comparisonTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  comparisonDetail: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  suggestionWrap: {
    marginTop: 8,
    gap: 6,
  },
  suggestionBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  suggestionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  suggestionFallback: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    marginBottom: 4,
  },
  advancedToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  advancedContainer: {
    marginBottom: 8,
  },
  advancedInner: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  actionRow: {
    gap: 10,
    marginTop: 6,
    marginBottom: 16,
  },
  calculateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: 12,
  },
  calculateBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 13,
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  resultSection: {
    marginBottom: 24,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  copyIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  slotCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 10,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  slotTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  slotValue: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
  },
  slotPct: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  resultGrid: {
    gap: 10,
    marginBottom: 10,
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  resultCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  resultCardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  resultCardValueSmall: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  bottomSpacer: {
    height: 24,
  },
});
