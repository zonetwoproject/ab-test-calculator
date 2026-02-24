export const TOTAL_SLOTS = 10000;

export const PRESET_MDE = {
  relative: [5, 10, 15, 20],
  absolute: [0.1, 0.2, 0.5, 1.0],
};

export const FIXED_K_META = {
  k: 1,
  message: 'K값은 1로 고정됩니다.',
};

export function normalCdfInverse(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  const a = [
    -3.969683028665376e1,
    2.209460984245205e2,
    -2.759285104469687e2,
    1.38357751867269e2,
    -3.066479806614716e1,
    2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1,
    1.615858368580409e2,
    -1.556989798598866e2,
    6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3,
    -3.223964580411365e-1,
    -2.400758277161838,
    -2.549732539343734,
    4.374664141464968,
    2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3,
    3.224671290700398e-1,
    2.445134137142996,
    3.754408661907416,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q;
  let r;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }

  if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }

  q = Math.sqrt(-2 * Math.log(1 - p));
  return (
    -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

export function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return '-';
  }
  return Math.round(value).toLocaleString('ko-KR');
}

export function getDefaultRatios(groupCount) {
  const base = Math.floor(100 / groupCount);
  const values = Array(groupCount).fill(base);
  let remaining = 100 - base * groupCount;
  let idx = 0;
  while (remaining > 0) {
    values[idx] += 1;
    remaining -= 1;
    idx += 1;
  }
  return values;
}

export function parseGroupRatios(text, groupCount) {
  const tokens = text
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter(Boolean);

  if (tokens.length !== groupCount) {
    throw new Error(`그룹 수(${groupCount})와 비중 개수가 다릅니다.`);
  }

  const values = tokens.map((token) => Number(token));
  if (values.some((num) => !Number.isFinite(num) || num <= 0)) {
    throw new Error('그룹 비중은 0보다 큰 숫자여야 합니다.');
  }

  const sum = values.reduce((acc, cur) => acc + cur, 0);
  if (Math.abs(sum - 100) > 0.01) {
    throw new Error(`그룹 비중 합계는 100이어야 합니다. 현재 ${sum.toFixed(2)}입니다.`);
  }

  const ratios = values.map((value) => value / sum);
  return { values, ratios };
}

export function distributeByRatios(total, ratios) {
  if (!Number.isFinite(total)) {
    return ratios.map(() => Number.POSITIVE_INFINITY);
  }

  const raw = ratios.map((ratio) => ratio * total);
  const floors = raw.map((value) => Math.floor(value));
  let remaining = total - floors.reduce((acc, cur) => acc + cur, 0);

  const order = raw
    .map((value, idx) => ({ idx, frac: value - floors[idx] }))
    .sort((a, b) => b.frac - a.frac)
    .map((item) => item.idx);

  let pointer = 0;
  while (remaining > 0 && order.length > 0) {
    floors[order[pointer % order.length]] += 1;
    pointer += 1;
    remaining -= 1;
  }

  return floors;
}

export function getZScores(confidencePct, powerPct) {
  const alpha = 1 - confidencePct / 100;
  const power = powerPct / 100;

  const zAlpha = normalCdfInverse(1 - alpha / 2);
  const zBeta = normalCdfInverse(power);

  if (!Number.isFinite(zAlpha) || !Number.isFinite(zBeta)) {
    throw new Error('신뢰도/검정력 값으로 Z-score를 계산하지 못했습니다.');
  }

  return { zAlpha, zBeta };
}

export function calculateRequiredTotalUsers(p1, relativeEffect, controlRatio, treatmentRatios, zAlpha, zBeta) {
  const p2 = p1 * (1 + relativeEffect);
  if (p2 <= p1 || p2 >= 1) {
    return Number.POSITIVE_INFINITY;
  }

  const zSumSq = Math.pow(zAlpha + zBeta, 2);
  let maxTotalUsers = 0;

  for (const treatmentRatio of treatmentRatios) {
    const kappa = treatmentRatio / controlRatio;
    const nControl =
      (zSumSq * (p1 * (1 - p1) + p2 * (1 - p2) / kappa)) /
      Math.pow(p2 - p1, 2);

    const totalUsersForPair = nControl / controlRatio;
    if (totalUsersForPair > maxTotalUsers) {
      maxTotalUsers = totalUsersForPair;
    }
  }

  return maxTotalUsers;
}

export function calculateDetectableMde(availableUsers, baselinePct, controlRatio, treatmentRatios, confidencePct, powerPct) {
  if (!Number.isFinite(availableUsers) || availableUsers <= 0) {
    return null;
  }

  const p1 = baselinePct / 100;
  if (p1 <= 0 || p1 >= 1) {
    return null;
  }

  let zAlpha;
  let zBeta;
  try {
    ({ zAlpha, zBeta } = getZScores(confidencePct, powerPct));
  } catch {
    return null;
  }

  const maxRelative = Math.min(3, ((1 - p1) / p1) * 0.999);
  if (!Number.isFinite(maxRelative) || maxRelative <= 0.0001) {
    return null;
  }

  let low = 0.0001;
  let high = maxRelative;
  let best = null;

  for (let i = 0; i < 60 && high - low > 0.000001; i += 1) {
    const mid = (low + high) / 2;
    const requiredUsers = calculateRequiredTotalUsers(p1, mid, controlRatio, treatmentRatios, zAlpha, zBeta);

    if (requiredUsers <= availableUsers) {
      best = mid;
      high = mid;
    } else {
      low = mid;
    }
  }

  if (best === null) {
    return null;
  }

  return {
    relativePct: best * 100,
    absolutePctPoint: p1 * best * 100,
  };
}

export function validateBaseFormData(formData, ratioMeta) {
  if (!Number.isFinite(formData.duration) || formData.duration < 1) {
    throw new Error('실험 기간을 1일 이상 입력해주세요.');
  }
  if (!Number.isFinite(formData.dailyVisitors) || formData.dailyVisitors < 1) {
    throw new Error('하루 방문수를 1 이상 입력해주세요.');
  }
  if (!Number.isFinite(formData.trafficUsagePct) || formData.trafficUsagePct <= 0 || formData.trafficUsagePct > 100) {
    throw new Error('실험 사용 비율은 0 초과 100 이하로 입력해주세요.');
  }
  if (!Number.isFinite(formData.baselinePct) || formData.baselinePct <= 0 || formData.baselinePct >= 100) {
    throw new Error('현재 지표는 0~100 사이 값으로 입력해주세요.');
  }
  if (!Number.isFinite(formData.confidencePct) || formData.confidencePct <= 50 || formData.confidencePct >= 100) {
    throw new Error('신뢰도는 50 초과 100 미만으로 입력해주세요.');
  }
  if (!Number.isFinite(formData.powerPct) || formData.powerPct <= 50 || formData.powerPct >= 100) {
    throw new Error('검정력은 50 초과 100 미만으로 입력해주세요.');
  }
  if (!ratioMeta || !ratioMeta.ratios || ratioMeta.ratios.length !== formData.groupCount) {
    throw new Error('그룹 비중 설정을 확인해주세요.');
  }

  const controlRatio = ratioMeta.ratios[0];
  if (controlRatio <= 0) {
    throw new Error('대조군 비중은 0보다 커야 합니다.');
  }
}

export function validateFormData(formData, ratioMeta) {
  validateBaseFormData(formData, ratioMeta);

  if (!Number.isFinite(formData.mdeInput) || formData.mdeInput <= 0) {
    throw new Error('개선 목표는 0보다 큰 값이어야 합니다.');
  }
  if (formData.mdeMode === 'absolute' && formData.baselinePct + formData.mdeInput >= 100) {
    throw new Error('절대 개선폭은 baseline과 합쳐 100% 미만이어야 합니다.');
  }
}

export function calculateExperiment(formData, ratioMeta, kMeta = FIXED_K_META) {
  const controlRatio = ratioMeta.ratios[0];
  const treatmentRatios = ratioMeta.ratios.slice(1);
  const p1 = formData.baselinePct / 100;

  const relativeEffect = formData.mdeMode === 'relative'
    ? formData.mdeInput / 100
    : formData.mdeInput / formData.baselinePct;

  const { zAlpha, zBeta } = getZScores(formData.confidencePct, formData.powerPct);

  const totalUniqueUsers = Math.round((formData.dailyVisitors * formData.duration) / kMeta.k);
  const availableUsers = Math.round(totalUniqueUsers * (formData.trafficUsagePct / 100));

  const requiredTotalRaw = calculateRequiredTotalUsers(p1, relativeEffect, controlRatio, treatmentRatios, zAlpha, zBeta);
  const requiredTotal = Math.ceil(requiredTotalRaw);

  const sampleCounts = distributeByRatios(requiredTotal, ratioMeta.ratios);

  const usersPerSlot = availableUsers / TOTAL_SLOTS;
  const requiredSlots = usersPerSlot > 0 ? Math.ceil(requiredTotal / usersPerSlot) : Number.POSITIVE_INFINITY;
  const slotUsagePct = Number.isFinite(requiredSlots)
    ? (requiredSlots / TOTAL_SLOTS) * 100
    : Number.POSITIVE_INFINITY;

  return {
    totalUniqueUsers,
    availableUsers,
    requiredTotal,
    sampleCounts,
    requiredSlots,
    slotUsagePct,
    relativeEffectPct: relativeEffect * 100,
    absoluteEffectPctPoint: p1 * relativeEffect * 100,
  };
}
