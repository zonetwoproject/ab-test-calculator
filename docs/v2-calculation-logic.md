# A/B 테스트 계산기 v2 계산 로직 상세

v2의 통계 계산 및 슬롯 할당 로직 완전 가이드

---

## 목차

1. [샘플 크기 계산](#1-샘플-크기-계산)
2. [고유 유저 추정](#2-고유-유저-추정)
3. [슬롯 할당](#3-슬롯-할당)
4. [배분 효율성](#4-배분-효율성)
5. [검증 및 테스트](#5-검증-및-테스트)

---

## 1. 샘플 크기 계산

### 1.1 기본 공식 (Two-proportion Z-test)

**목표:** 두 비율(대조군 vs 실험군)의 차이를 검증하는 데 필요한 샘플 크기

**공식:**
```
n₁ = (Z_α + Z_β)² × [p₁(1-p₁) + p₂(1-p₂)/κ] / (p₂-p₁)²
n₂ = n₁ × κ
n_total = n₁ + n₂

여기서:
- n₁: 대조군 샘플 크기
- n₂: 실험군 샘플 크기
- Z_α: 유의수준에 따른 Z-score
- Z_β: 검정력에 따른 Z-score
- p₁: 대조군 전환율 (baseline)
- p₂: 실험군 전환율 (baseline × (1 + MDE))
- κ: 배분 비율 (n₂/n₁)
```

### 1.2 파라미터 설명

#### Z-score (신뢰수준)

| 유의수준 (α) | Z_α | 의미 |
|--------------|-----|------|
| 0.05 (기본) | 1.96 | 95% 신뢰수준 |
| 0.01 (엄격) | 2.576 | 99% 신뢰수준 |
| 0.10 (완화) | 1.645 | 90% 신뢰수준 |

**의미:** α = 0.05는 "실제로 차이가 없는데 있다고 판단할 확률" 5%

#### 검정력 (Power)

| 검정력 (1-β) | Z_β | 의미 |
|--------------|-----|------|
| 0.80 (기본) | 0.84 | 80% 검출력 |
| 0.90 (높음) | 1.282 | 90% 검출력 |
| 0.70 (낮음) | 0.524 | 70% 검출력 |

**의미:** Power = 0.80은 "실제 차이가 있을 때 발견할 확률" 80%

#### 배분 비율 (κ)

```javascript
κ = treatmentRatio / controlRatio

예시:
50:50 → κ = 0.5/0.5 = 1.00
60:40 → κ = 0.4/0.6 = 0.67
70:30 → κ = 0.3/0.7 = 0.43
80:20 → κ = 0.2/0.8 = 0.25
```

### 1.3 계산 예시

**입력:**
- 현재 전환율 (p₁): 3% = 0.03
- 목표 개선: 10%
- 실험군 전환율 (p₂): 0.03 × 1.10 = 0.033
- 배분 비율: 50:50 (κ = 1.0)
- 유의수준: 0.05 (Z_α = 1.96)
- 검정력: 0.80 (Z_β = 0.84)

**계산:**
```javascript
// 1. 분자 계산
numerator = (1.96 + 0.84)²
          = 2.80²
          = 7.84

// 2. 분모 일부 (비율 분산)
variance = 0.03 × (1-0.03) + 0.033 × (1-0.033) / 1.0
         = 0.03 × 0.97 + 0.033 × 0.967
         = 0.0291 + 0.0319
         = 0.0610

// 3. 분모 일부 (차이 제곱)
difference = (0.033 - 0.03)²
           = 0.003²
           = 0.000009

// 4. 대조군 샘플
n₁ = 7.84 × 0.0610 / 0.000009
   = 53,138명

// 5. 실험군 샘플
n₂ = 53,138 × 1.0
   = 53,138명

// 6. 총 샘플
n_total = 106,276명
```

### 1.4 코드 구현

```javascript
function calculateSampleSize(baseline, mde, allocation, alpha, power) {
    // 1. Z-scores
    const z_alpha = alpha === 0.05 ? 1.96 : 
                    (alpha === 0.01 ? 2.576 : 1.645);
    const z_beta = power === 0.80 ? 0.84 : 
                   (power === 0.90 ? 1.282 : 0.524);
    
    // 2. 배분 비율
    const [c, t] = allocation.split(':').map(Number);
    const controlRatio = c / (c + t);
    const treatmentRatio = t / (c + t);
    const kappa = treatmentRatio / controlRatio;
    
    // 3. 전환율
    const p1 = baseline / 100;
    const p2 = p1 * (1 + mde / 100);
    
    // 4. 샘플 크기
    const numerator = Math.pow(z_alpha + z_beta, 2);
    const variance = p1 * (1 - p1) + p2 * (1 - p2) / kappa;
    const difference = Math.pow(p2 - p1, 2);
    
    const n1 = numerator * variance / difference;
    const n2 = n1 * kappa;
    
    return {
        control: Math.ceil(n1),
        treatment: Math.ceil(n2),
        total: Math.ceil(n1 + n2)
    };
}
```

---

## 2. 고유 유저 추정

### 2.1 문제 정의

**문제:** 
- DAU (일일 활성 유저) ≠ N일 고유 유저
- 같은 사용자가 여러 날 방문 → 중복 카운트

**예시:**
```
하루 10만 방문 × 7일 = 70만?  ❌
실제 7일 고유 유저 ≈ 42만     ✅ (60% 정도)
```

### 2.2 중복 제거 계수

**정의:** N일 동안의 고유 유저 / (DAU × N일)

**업계 표준 값:**

| 기간 | 계수 | 의미 | 예시 (DAU 10만) |
|------|------|------|-----------------|
| 1일 | 1.00 | 중복 없음 | 10만 |
| 3일 | 0.75 | 75% 고유 | 22.5만 |
| 7일 | 0.60 | 60% 고유 | 42만 ⭐ |
| 14일 | 0.50 | 50% 고유 | 70만 |
| 21일 | 0.45 | 45% 고유 | 94.5만 |
| 30일 | 0.40 | 40% 고유 | 120만 |
| 60일 | 0.30 | 30% 고유 | 180만 |

**경향:**
- 기간이 길수록 계수 감소 (중복 증가)
- 지수적 감소 패턴
- 서비스 특성에 따라 다를 수 있음

### 2.3 보간 계산

**문제:** 표준 값 사이의 기간 (예: 10일, 25일)

**해결:** 선형 보간 (Linear Interpolation)

**공식:**
```
coefficient(d) = lower + (upper - lower) × (d - d_lower) / (d_upper - d_lower)

여기서:
- d: 목표 기간
- d_lower, d_upper: 목표를 감싸는 표준 기간
- lower, upper: 해당 표준 계수
```

**예시 1: 10일**
```javascript
// 7일(0.60) ←→ 14일(0.50)
ratio = (10 - 7) / (14 - 7) 
      = 3 / 7 
      = 0.429

coefficient = 0.60 + (0.50 - 0.60) × 0.429
            = 0.60 - 0.043
            = 0.557
```

**예시 2: 25일**
```javascript
// 21일(0.45) ←→ 30일(0.40)
ratio = (25 - 21) / (30 - 21)
      = 4 / 9
      = 0.444

coefficient = 0.45 + (0.40 - 0.45) × 0.444
            = 0.45 - 0.022
            = 0.428
```

### 2.4 코드 구현

```javascript
const CONFIG = {
    DEDUPLICATION_COEFFICIENT: {
        1: 1.00, 3: 0.75, 7: 0.60, 14: 0.50,
        21: 0.45, 30: 0.40, 60: 0.30
    }
};

function getCoefficient(duration) {
    // 1. 정확한 매칭
    if (CONFIG.DEDUPLICATION_COEFFICIENT[duration]) {
        return CONFIG.DEDUPLICATION_COEFFICIENT[duration];
    }
    
    // 2. 보간 계산
    const keys = Object.keys(CONFIG.DEDUPLICATION_COEFFICIENT)
        .map(Number)
        .sort((a, b) => a - b);
    
    for (let i = 0; i < keys.length - 1; i++) {
        const lower = keys[i];
        const upper = keys[i + 1];
        
        if (duration >= lower && duration <= upper) {
            const ratio = (duration - lower) / (upper - lower);
            const lowerCoef = CONFIG.DEDUPLICATION_COEFFICIENT[lower];
            const upperCoef = CONFIG.DEDUPLICATION_COEFFICIENT[upper];
            return lowerCoef - (lowerCoef - upperCoef) * ratio;
        }
    }
    
    // 3. 범위 밖 처리
    if (duration < keys[0]) return CONFIG.DEDUPLICATION_COEFFICIENT[keys[0]];
    return CONFIG.DEDUPLICATION_COEFFICIENT[keys[keys.length - 1]];
}
```

### 2.5 고유 유저 계산

**공식:**
```
uniqueUsers = dailyVisitors × duration × coefficient
```

**예시:**
```javascript
// 입력
dailyVisitors = 100,000
duration = 7
coefficient = 0.60

// 계산
uniqueUsers = 100,000 × 7 × 0.60
            = 420,000명
```

### 2.6 수동 계수 입력

**우선순위:**
1. 사용자가 직접 입력한 계수
2. 자동 계산 계수

**사용 케이스:**
- 실제 데이터 기반 정확한 계수 확보
- 특수한 서비스 패턴
- 보수적 추정 (더 낮은 계수)

**코드:**
```javascript
const customCoef = parseFloat(document.getElementById('custom-coefficient').value);
const coefficient = customCoef || getCoefficient(duration);
```

---

## 3. 슬롯 할당

### 3.1 슬롯 시스템 이해

**개념:**
- 총 슬롯: 10,000개 (0~9,999)
- 할당 방식: `slot = hash(device_id) % 10000`
- 특징: 결정적, 균등 분포, 고정

**장점:**
- 동일 사용자 → 항상 같은 슬롯
- 병렬 실험 가능 (슬롯 분리)
- 관리 단순

**제약:**
- 동시 사용 중인 슬롯 재사용 불가
- 10,000개 한도

### 3.2 슬롯 계산 로직

**1단계: 슬롯당 유저 수**
```
usersPerSlot = uniqueUsers / 10,000
```

**2단계: 필요 슬롯**
```
requiredSlots = ceil(totalSamples / usersPerSlot)
```

**3단계: 슬롯 범위 할당**
```
controlSlots = ceil(requiredSlots × controlRatio)
treatmentSlots = requiredSlots - controlSlots

대조군: 1 ~ controlSlots
실험군: (controlSlots + 1) ~ requiredSlots
```

### 3.3 계산 예시

**입력:**
```
dailyVisitors = 100,000명
duration = 7일
coefficient = 0.60
totalSamples = 10,000명
allocation = 50:50
```

**계산:**
```javascript
// 1. 고유 유저
uniqueUsers = 100,000 × 7 × 0.60
            = 420,000명

// 2. 슬롯당 유저
usersPerSlot = 420,000 / 10,000
             = 42명/슬롯

// 3. 필요 슬롯
requiredSlots = ceil(10,000 / 42)
              = ceil(238.1)
              = 239개

// 4. 슬롯 범위 (50:50)
controlSlots = ceil(239 × 0.5)
             = 120개

대조군: 1 ~ 120 (120개)
실험군: 121 ~ 239 (119개)

// 5. 사용률
usage = 239 / 10,000
      = 2.39%
```

### 3.4 배분 비율별 예시

**동일 조건, 배분만 변경:**

| 배분 | 대조군 슬롯 | 실험군 슬롯 | 총 슬롯 |
|------|------------|------------|---------|
| 50:50 | 1~120 (120) | 121~239 (119) | 239 |
| 60:40 | 1~143 (143) | 144~239 (96) | 239 |
| 70:30 | 1~167 (167) | 168~239 (72) | 239 |
| 80:20 | 1~191 (191) | 192~239 (48) | 239 |

**특징:** 총 슬롯은 동일, 분배만 다름

### 3.5 슬롯 경고 로직

```javascript
function getSlotWarning(requiredSlots, totalSlots = 10000) {
    const percentage = (requiredSlots / totalSlots) * 100;
    
    if (requiredSlots > totalSlots) {
        return {
            level: 'error',
            message: `필요 슬롯(${requiredSlots})이 전체 슬롯(10,000)을 초과합니다.
                     실험 기간을 늘리거나 목표 개선폭을 줄이세요.`
        };
    }
    
    if (percentage > 50) {
        return {
            level: 'warning',
            message: `슬롯 사용률이 ${percentage.toFixed(1)}%로 높습니다.
                     다른 실험과 병행 실행 시 주의하세요.`
        };
    }
    
    if (percentage > 30) {
        return {
            level: 'info',
            message: `슬롯 사용률이 ${percentage.toFixed(1)}%입니다. 여유있는 편입니다.`
        };
    }
    
    return {
        level: 'success',
        message: `슬롯 사용률이 ${percentage.toFixed(1)}%로 효율적입니다.`
    };
}
```

---

## 4. 배분 효율성

### 4.1 효율성의 의미

**정의:** 같은 통계적 검출력을 얻기 위해 50:50 대비 얼마나 더 많은 샘플이 필요한가?

**공식:**
```
relativeEfficiency = 4 × p × (1-p)

여기서 p = 실험군 비율
```

### 4.2 계산 예시

| 배분 | p | 계산 | 효율성 | 의미 |
|------|---|------|--------|------|
| 50:50 | 0.5 | 4×0.5×0.5 | 100% | 기준 (최고) |
| 60:40 | 0.4 | 4×0.4×0.6 | 96% | 4% 더 필요 |
| 70:30 | 0.3 | 4×0.3×0.7 | 84% | 19% 더 필요 |
| 80:20 | 0.2 | 4×0.2×0.8 | 64% | 56% 더 필요 |
| 90:10 | 0.1 | 4×0.1×0.9 | 36% | 178% 더 필요 |

**대칭성:** 20:80도 64% (동일)

### 4.3 추가 샘플 계산

```javascript
// 효율성
efficiency = 4 × p × (1-p)

// 샘플 배수
multiplier = 1 / efficiency

// 추가 필요 비율
additional = (multiplier - 1) × 100

// 예: 80:20
efficiency = 0.64
multiplier = 1.56
additional = 56%
```

### 4.4 안내 문구 생성

```javascript
function getEfficiencyMessage(efficiency) {
    if (efficiency >= 0.99) {
        return {
            text: '가장 효율적인 배분입니다',
            color: 'green'
        };
    }
    
    const multiplier = (1 / efficiency).toFixed(2);
    const additional = ((1 / efficiency - 1) * 100).toFixed(0);
    
    return {
        text: `50:50 대비 ${multiplier}배 샘플 필요 (+${additional}%)`,
        color: 'orange'
    };
}
```

### 4.5 실무 의사결정

**질문:** "80:20으로 해야 할까?"

**트레이드오프:**
```
리스크 감소 (대조군 80%)
vs
효율성 저하 (56% 더 많은 샘플)

→ 실험 기간이 1.56배 늘어남
   또는 방문수가 1.56배 필요
```

**권장:**
- **일반적 실험:** 50:50 (최고 효율)
- **리스크 민감:** 80:20 (안전 우선)
- **중간 지점:** 70:30 (균형)

---

## 5. 검증 및 테스트

### 5.1 단위 테스트

**테스트 케이스 1: 샘플 크기 계산**
```javascript
// 입력
baseline = 3%
mde = 10%
allocation = '50:50'
alpha = 0.05
power = 0.80

// 예상 결과
n1 ≈ 53,138명
n2 ≈ 53,138명
total ≈ 106,276명
```

**테스트 케이스 2: 계수 보간**
```javascript
// 입력
duration = 10

// 예상 결과
coefficient ≈ 0.557
(7일 0.60과 14일 0.50 사이)
```

**테스트 케이스 3: 슬롯 계산**
```javascript
// 입력
dailyVisitors = 100,000
duration = 7
coefficient = 0.60
totalSamples = 10,000
allocation = '50:50'

// 예상 결과
uniqueUsers = 420,000
usersPerSlot = 42
requiredSlots = 239
controlRange = [1, 120]
treatmentRange = [121, 239]
```

### 5.2 통합 테스트

**시나리오 1: 기본 설정**
```javascript
입력: {
    baseline: 3%,
    mde: 10%,
    dailyVisitors: 100000,
    duration: 7,
    allocation: '50:50',
    alpha: 0.05,
    power: 0.80
}

예상: {
    samples: ~106,276명,
    slots: ~239개,
    efficiency: 100%,
    warning: null
}
```

**시나리오 2: 고급 설정 변경**
```javascript
입력: {
    baseline: 3%,
    mde: 10%,
    dailyVisitors: 100000,
    duration: 7,
    allocation: '80:20',
    alpha: 0.01,
    power: 0.90,
    customCoef: 0.75
}

예상: {
    samples: ~160,000명 (증가),
    slots: ~214개 (감소, 계수 증가로),
    efficiency: 64%,
    warning: null
}
```

**시나리오 3: 슬롯 부족**
```javascript
입력: {
    baseline: 1%,
    mde: 5%,
    dailyVisitors: 10000,  // 낮은 방문
    duration: 3,           // 짧은 기간
    allocation: '50:50'
}

예상: {
    samples: ~500,000명,
    slots: >10,000개,
    warning: 'error' (슬롯 초과)
}
```

### 5.3 검증 체크리스트

**계산 정확성:**
- [ ] Z-score 변환 정확
- [ ] 샘플 크기 공식 정확
- [ ] 계수 보간 정확
- [ ] 슬롯 할당 정확
- [ ] 효율성 계산 정확

**경계 조건:**
- [ ] duration = 1일 처리
- [ ] duration > 60일 처리
- [ ] 커스텀 계수 우선 처리
- [ ] 슬롯 초과 경고
- [ ] 0% 전환율 처리

**사용자 입력:**
- [ ] 음수 입력 차단
- [ ] 범위 초과 차단
- [ ] 빈 입력 처리
- [ ] 실시간 피드백

---

## 6. 수식 요약

### 6.1 핵심 공식

```javascript
// 1. 샘플 크기
n₁ = (Z_α + Z_β)² × [p₁(1-p₁) + p₂(1-p₂)/κ] / (p₂-p₁)²
n₂ = n₁ × κ

// 2. 고유 유저
uniqueUsers = dailyVisitors × duration × coefficient

// 3. 슬롯 할당
usersPerSlot = uniqueUsers / 10,000
requiredSlots = ceil(totalSamples / usersPerSlot)

// 4. 배분 효율성
efficiency = 4 × p × (1-p)
multiplier = 1 / efficiency
```

### 6.2 파라미터 기본값

```javascript
const DEFAULTS = {
    alpha: 0.05,        // Z_α = 1.96
    power: 0.80,        // Z_β = 0.84
    duration: 7,        // coefficient = 0.60
    allocation: '50:50', // κ = 1.0, efficiency = 100%
    totalSlots: 10000
};
```

---

## 7. 참고 문헌

1. **통계 이론:**
   - Chow, S. C., Shao, J., & Wang, H. (2008). Sample Size Calculations in Clinical Research
   - Julious, S. A. (2010). Sample sizes for clinical trials

2. **A/B 테스팅:**
   - Kohavi, R., Tang, D., & Xu, Y. (2020). Trustworthy Online Controlled Experiments
   - VWO: Sample Size Calculator Documentation

3. **실험 플랫폼:**
   - Optimizely: Stats Engine Technical Paper
   - Google Optimize: Experiment Calculator Methodology

---

이 문서는 v2 계산기의 모든 통계 및 로직을 완전히 문서화합니다.
