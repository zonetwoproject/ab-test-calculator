# A/B 테스트 계산기 — 제품/기술 스펙 (v7 Mark7, Legacy)

> 버전: v7 (UI 표기: Mark7)
> 최종 수정: 2026-02-20
> 상태: 레거시(참고용)
> 운영 URL: https://ab-test-calculator-one.vercel.app
> 기준 구현: `versions/v7/index.html`
>
> 참고: 현재 운영 버전은 **v9**이며, 최신 변경사항은 `README.md`와 `CHANGELOG.md`를 기준으로 확인하세요.

---

## 1. 목적

실험 설계 시 필요한 값을 한 번에 산출한다.

- 총 필요 샘플 수
- 그룹별 필요 샘플
- 슬롯 사용량/슬롯 범위
- 현재 트래픽 조건에서 검증 가능한 최소 MDE

핵심 설계 목표는 "현실 트래픽 제약(사용률 제한), 다중 그룹 비중, 통계 파라미터(신뢰도/검정력)"를 동일 계산 체계로 반영하는 것이다.

---

## 2. 입력 모델

| 순서 | 항목 | 필드 ID | 타입 | 기본값 |
|---|---|---|---|---|
| 1 | 실험 기간(일) | `prop-duration` | number | 14 |
| 2 | 방문 빈도(K) | `visit-frequency` | select | 4.2 |
| 2-1 | 방문 빈도 직접입력 | `custom-k` | number | 빈값 |
| 3 | 하루 방문수(명/일) | `prop-daily-visitors` | number | 빈값 |
| 4 | 전체 트래픽 중 실험 사용 비율(%) | `traffic-usage` | number | 100 |
| 5 | 실험 그룹 수(대조군 포함) | `group-count` | select(2~5) | 2 |
| 6 | 그룹 비중(합계 100) | `group-ratios` | text | 50,50 |
| 7 | 현재 지표 baseline(%) | `prop-baseline` | number | 빈값 |
| 8 | 목표 개선 입력 방식 | `mde-mode` | select | relative |
| 8-1 | 목표 개선값 | `prop-mde` | number | relative=5, absolute=0.1 |
| 고급 | 신뢰도(%) | `confidence-level` | number | 95 |
| 고급 | 검정력(%) | `power-level` | number | 80 |

### 2.1 K값 preset

| 값 | 의미 |
|---|---|
| 4.2 | 평균 4회 이상 (메인홈/검색홈) |
| 3.0 | 평균 3회 (목록/상세/검색결과) |
| 2.0 | 평균 1~2회 (주문내역/주소설정) |
| 1.2 | 평균 1회 (주문완료/결제성공) |
| custom | 사용자가 직접 입력 |

### 2.2 MDE preset

- 상대 개선율 모드(`relative`): `+5`, `+10`, `+15`, `+20`
- 절대 개선폭 모드(`absolute`): `+0.1%p`, `+0.2%p`, `+0.5%p`, `+1.0%p`

---

## 3. 기본 동작 정책

### 3.1 초기화/기본 상태

페이지 로드 시 다음이 실행된다.

- `updateMdeModeUI()`
- `applyEvenRatios()`
- `syncCustomKField()`
- `updateDurationFeedback()`
- `updateVisitorsFeedback()`
- `updateUniqueUsersPreview()`

### 3.2 그룹 비중 자동입력

- 그룹 수 변경 시 균등 비중으로 자동 재계산해 `group-ratios`를 갱신한다.
- 정수 합계 100을 보장한다.

예시:

- 3그룹 → `34,33,33`
- 5그룹 → `20,20,20,20,20`

### 3.3 목표 개선 기본값

- 상대 모드 선택 시 `prop-mde = 5`
- 절대 모드 선택 시 `prop-mde = 0.1`
- 현재 값과 일치하는 preset 버튼에 `active` 스타일을 준다.

---

## 4. 유효성 검사

제출 시(`submit`) 아래를 검사한다.

| 항목 | 규칙 |
|---|---|
| 기간 | `duration >= 1` |
| 하루 방문수 | `dailyVisitors >= 1` |
| 실험 사용 비율 | `0 < trafficUsagePct <= 100` |
| baseline | `0 < baselinePct < 100` |
| 개선 목표 | `mdeInput > 0` |
| 절대 개선폭 모드 | `baselinePct + mdeInput < 100` |
| 신뢰도 | `50 < confidencePct < 100` |
| 검정력 | `50 < powerPct < 100` |
| 그룹 비중 개수 | 그룹 수와 동일 |
| 그룹 비중 합계 | `100 ± 0.01` 허용 |
| 그룹 비중 값 | 모두 `> 0` |

오류는 `alert` 메시지로 안내한다.

---

## 5. 계산 스펙

### 5.1 용어

- `TOTAL_SLOTS = 10000`
- `p1 = baselinePct / 100`
- 상대 개선율 `relativeEffect`

`relativeEffect` 계산:

- 상대 모드: `mdeInput / 100`
- 절대 모드: `mdeInput / baselinePct`

### 5.2 Z-score

- `alpha = 1 - confidencePct/100`
- `power = powerPct/100`
- `zAlpha = jStat.normal.inv(1 - alpha/2, 0, 1)`
- `zBeta = jStat.normal.inv(power, 0, 1)`

### 5.3 고유 유저/실험 사용 유저

- `totalUniqueUsers = round((dailyVisitors * duration) / K)`
- `availableUsers = round(totalUniqueUsers * trafficUsagePct/100)`

### 5.4 총 필요 샘플(다중 그룹)

대조군 비중을 `controlRatio`, 각 실험군 비중을 `treatmentRatio_i`로 둔다.

- `p2 = p1 * (1 + relativeEffect)`
- `kappa_i = treatmentRatio_i / controlRatio`
- `nControl_i = (zAlpha + zBeta)^2 * ( p1(1-p1) + p2(1-p2)/kappa_i ) / (p2 - p1)^2`
- `totalForPair_i = nControl_i / controlRatio`
- `requiredTotalRaw = max(totalForPair_i)`
- `requiredTotal = ceil(requiredTotalRaw)`

즉, 다중 실험군 중 가장 불리한 pair 기준으로 전체 필요 샘플을 잡는다.

### 5.5 그룹별 샘플 분배

`requiredTotal`을 비중에 따라 정수 분배한다.

- `raw_i = ratio_i * requiredTotal`
- floor 후 남은 수량은 소수점 큰 순서로 1씩 배분

### 5.6 슬롯 계산

- `usersPerSlot = availableUsers / 10000`
- `requiredSlots = ceil(requiredTotal / usersPerSlot)`
- `slotUsagePct = requiredSlots / 10000 * 100`

결과 화면에서는 총 필요 슬롯/사용률만 표시한다.

### 5.7 MDE 역산

현재 트래픽/비중/통계 파라미터에서 검증 가능한 최소 개선을 이진 탐색으로 구한다.

- low=`0.0001`, high=`min(3, ((1-p1)/p1)*0.999)`
- 반복 최대 60회
- 각 mid에 대해 `requiredTotalUsers(mid) <= availableUsers` 여부로 경계 조정
- 산출:
  - `relativePct = best * 100`
  - `absolutePctPoint = p1 * best * 100`

---

## 6. 실시간 피드백 정책

| 피드백 | 트리거 | 조건/동작 |
|---|---|---|
| 기간 피드백 | `prop-duration` input | 1 미만 오류, 7 미만 주의, 14 미만 권장, 14 이상 충분 |
| 방문수 피드백 | `prop-daily-visitors` input | 1 미만 오류, 1000 미만 주의 |
| 고유유저 프리뷰 | 기간/방문수/K/사용비율 변경 | 총 고유 유저 + 실험 사용 유저 동시 표시 |
| 비중 피드백 | `group-ratios` input | 비중 합/개수 검증 결과 표시 |
| MDE 프리뷰 | baseline/트래픽/비중/고급값 변경 | 현재 조건 최소 감지 가능 효과 표시 |
| 목표 vs 가능성 | 목표값 변경 포함 | success / warning / error 상태 표시, 불가 시 기간 제안 |

---

## 7. 결과 화면 스펙

### 7.1 섹션 구성

1. 필요한 슬롯(요약)
2. 핵심 지표 3카드: 총 필요 샘플 / 실험 기간 / 배분
3. 그룹별 필요 샘플 테이블
4. 결과 복사 버튼

### 7.2 복사 기능

- 버튼: `#copy-result-btn`
- 계산 후 요약 문자열을 `navigator.clipboard.writeText`로 복사
- 미계산 상태에서 클릭 시 안내 알림

## 8. 반응형/UI 스펙

브레이크포인트 3단계:

- 모바일: `<768px`
- 태블릿: `768~1199px`
- PC: `>=1200px`

정책:

- 모바일은 1열 스택
- 태블릿/PC는 2열 중심 배치 + 섹션별 비율 그리드
- spacing/타이포/컨트롤 높이는 CSS 변수(`--fs-*`, `--space-*`, `--control-h`)로 통일
- 배경은 화이트 기준 (`--bg-page`, `--bg-panel`)
- 헤더 타이틀 우측에 `Mark7` 표기

---

## 9. 배포/운영

- 루트 진입: `index.html`이 `versions/v7/index.html`로 리다이렉트
- 운영 배포: Vercel
- 정적 파일 배포 최적화: `.vercelignore` 사용

---

## 10. v6 대비 정책 차이 요약

| 항목 | v6 | v7 |
|---|---|---|
| 그룹 구조 | 2그룹(A/B) 중심 | 2~5그룹 다중 실험 지원 |
| 배분 입력 | select + custom(2값) | 텍스트 비중(그룹 수와 동기화) |
| 트래픽 제한 | 없음 | 사용 비율(%) 직접 입력 |
| 목표 입력 | 상대 개선율(%)만 | 상대(%) / 절대(%p) 모드 |
| K값 입력 | preset만 | preset + custom |
| 고급 설정 | alpha/power select | 신뢰도/검정력 숫자 입력 |
| 결과 복사 | 없음 | 있음 |
| SQL 출력 | 있음 | 없음 |
| 배포 기준 | GitHub Pages 중심 | Vercel 운영 |
