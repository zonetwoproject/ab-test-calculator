export type MdeMode = 'relative' | 'absolute';

export interface RatioMeta {
  values: number[];
  ratios: number[];
}

export interface FormDataInput {
  duration: number;
  dailyVisitors: number;
  groupCount: number;
  baselinePct: number;
  mdeMode: MdeMode;
  mdeInput: number;
  confidencePct: number;
  powerPct: number;
}

export interface ExperimentResult {
  totalUniqueUsers: number;
  availableUsers: number;
  requiredTotal: number;
  sampleCounts: number[];
  requiredSlots: number;
  slotUsagePct: number;
  relativeEffectPct: number;
  absoluteEffectPctPoint: number;
}

export const TOTAL_SLOTS: number;
export const PRESET_MDE: {
  relative: number[];
  absolute: number[];
};
export const FIXED_K_META: {
  k: number;
  message: string;
};

export function normalCdfInverse(p: number): number;
export function formatNumber(value: number): string;
export function getDefaultRatios(groupCount: number): number[];
export function parseGroupRatios(text: string, groupCount: number): RatioMeta;
export function distributeByRatios(total: number, ratios: number[]): number[];
export function getZScores(confidencePct: number, powerPct: number): { zAlpha: number; zBeta: number };
export function calculateRequiredTotalUsers(
  p1: number,
  relativeEffect: number,
  controlRatio: number,
  treatmentRatios: number[],
  zAlpha: number,
  zBeta: number
): number;
export function calculateDetectableMde(
  availableUsers: number,
  baselinePct: number,
  controlRatio: number,
  treatmentRatios: number[],
  confidencePct: number,
  powerPct: number
): { relativePct: number; absolutePctPoint: number } | null;
export function validateBaseFormData(formData: FormDataInput, ratioMeta: RatioMeta): void;
export function validateFormData(formData: FormDataInput, ratioMeta: RatioMeta): void;
export function calculateExperiment(
  formData: FormDataInput,
  ratioMeta: RatioMeta,
  kMeta?: { k: number; message?: string }
): ExperimentResult;
