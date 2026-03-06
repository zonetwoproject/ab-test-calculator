import {
  FIXED_K_META,
  formatNumber as formatNumberShared,
  getDefaultRatios,
  parseGroupRatios,
  calculateExperiment,
  calculateDetectableMde,
  validateFormData,
  validateBaseFormData,
  normalCdfInverse,
  type FormDataInput,
  type RatioMeta,
  type ExperimentResult,
} from '../../shared/mark8-core';

export type MdeMode = 'relative' | 'absolute';

export interface CalculationInput extends FormDataInput {
  groupRatiosText: string;
}

export interface CalculationBundle {
  formData: FormDataInput;
  ratioMeta: RatioMeta;
  result: ExperimentResult;
}

export { normalCdfInverse };

export function getEvenRatios(count: number): number[] {
  return getDefaultRatios(count);
}

export function formatNumber(value: number): string {
  return formatNumberShared(value);
}

export function parseRatios(text: string, groupCount: number): RatioMeta {
  return parseGroupRatios(text, groupCount);
}

export function getFixedKMeta(): { k: number; message: string } {
  return FIXED_K_META;
}

export function validateInput(input: CalculationInput): string | null {
  try {
    const ratioMeta = parseGroupRatios(input.groupRatiosText, input.groupCount);
    validateFormData(input, ratioMeta);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : '입력값을 확인해주세요.';
  }
}

export function calculate(input: CalculationInput): CalculationBundle {
  const ratioMeta = parseGroupRatios(input.groupRatiosText, input.groupCount);
  validateFormData(input, ratioMeta);

  const result = calculateExperiment(input, ratioMeta, FIXED_K_META);

  return {
    formData: input,
    ratioMeta,
    result,
  };
}

export function getPreviewContext(input: CalculationInput): {
  formData: FormDataInput;
  ratioMeta: RatioMeta;
  availableUsers: number;
  totalUniqueUsers: number;
} {
  const ratioMeta = parseGroupRatios(input.groupRatiosText, input.groupCount);
  validateBaseFormData(input, ratioMeta);

  const totalUniqueUsers = Math.round((input.dailyVisitors * input.duration) / FIXED_K_META.k);
  const availableUsers = totalUniqueUsers;

  return {
    formData: input,
    ratioMeta,
    availableUsers,
    totalUniqueUsers,
  };
}

export function computeDetectable(
  availableUsers: number,
  baselinePct: number,
  ratioMeta: RatioMeta,
  confidencePct: number,
  powerPct: number
): { relativePct: number; absolutePctPoint: number } | null {
  return calculateDetectableMde(
    availableUsers,
    baselinePct,
    ratioMeta.ratios[0],
    ratioMeta.ratios.slice(1),
    confidencePct,
    powerPct
  );
}
