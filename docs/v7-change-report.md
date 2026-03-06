# A/B 테스트 계산기 변경 보고서 (v6 → v7/Mark7)

- 대상: `versions/v6/index.html` (기준) vs `versions/v7/index.html` (최신)
- 작성일: 2026-02-20
- 목적: 기능/계산/UI/배포 변화와 요구사항 반영 여부를 정리

## 1) 요약

v7은 기존 2그룹 A/B 중심 계산기(v6)를 다중 그룹 실험 설계 도구로 확장한 버전입니다.
핵심은 다음 5가지 요구사항의 코드 반영입니다.

1. 전체 트래픽 사용 비율 제한
2. 개선 목표 절대치 입력
3. 실험 그룹 수·비중 기반 모수 계산
4. 방문 빈도(K값) 직접 입력
5. 신뢰도/검정력 직접 입력

## 2) 요구사항 반영 검증

| 요청사항 | 반영 여부 | 코드 근거 |
|---|---|---|
| 1/ 전체 트래픽 사용 비율 제한 | 반영 완료 | `#traffic-usage` 입력 추가, `availableUsers = totalUniqueUsers * (trafficUsagePct/100)` 계산 적용 (`versions/v7/index.html`) |
| 2/ 개선 목표 절대치 입력 | 반영 완료 | `#mde-mode`(상대 %/절대 %p) + `relativeEffect` 분기 계산 (`versions/v7/index.html`) |
| 3/ 그룹 수/비중 기반 모수 계산 | 반영 완료 | `#group-count`, `#group-ratios`, `parseGroupRatios`, `calculateRequiredTotalUsers`에서 treatment별 worst-case total 채택 (`versions/v7/index.html`) |
| 4/ 방문 빈도(K) 직접 입력 | 반영 완료 | `visit-frequency=custom` + `#custom-k`, `getKValueOrThrow`에서 custom K 검증/사용 (`versions/v7/index.html`) |
| 5/ 신뢰도/검정력 직접 입력 | 반영 완료 | `#confidence-level`, `#power-level` 숫자 입력 + `jStat.normal.inv`로 Z-score 동적 계산 (`versions/v7/index.html`) |

## 3) 기능 비교

### 입력 모델

- v6
  - 실험 기간, 방문 빈도(K preset), 하루 방문수, A/B 배분(select/custom 2개), baseline, 목표 개선(상대%), alpha/power(select)
- v7
  - 실험 기간, 방문 빈도(K preset + custom), 하루 방문수, **트래픽 사용률(%)**, **그룹 수(2~5)**, **그룹 비중 텍스트(합계 100)**,
    baseline, 목표 개선(상대%/절대%p), **신뢰도/검정력 숫자 입력**

### 계산 로직

- v6: 2그룹 기준 n1/n2 계산 중심
- v7:
  - 다중 그룹 treatment 각각에 대해 필요한 total을 계산하고 최대값을 선택해 전체 실험 최소 표본 보장
  - 그룹 비중에 맞춰 표본 수/슬롯 수를 비례 배분(정수 분배)
  - 트래픽 사용률 제한으로 실제 사용 가능 유저를 분리 계산
  - MDE 역산도 동일 조건(트래픽·그룹비중·신뢰도·검정력)을 반영

### 결과 출력

- v6: 대조군/실험군 표본 중심 카드
- v7:
  - 필요 슬롯, 총 필요 샘플, 실험 기간, 배분
  - 그룹별 필요 샘플 표
  - 결과 텍스트 복사 버튼

## 4) UI/UX 변화

- Mark7 라벨 적용, 헤더 구조 단순화
- 반응형 레이아웃 강화 (모바일/태블릿/PC 3구간)
- 간격/타이포/컨트롤 높이 토큰화로 폼 정렬 일관성 개선
- 레퍼런스 가이드 반영: 화이트 배경, 복사 아이콘 스타일 조정
- 파비콘 추가: `🆎`

## 5) 기술/배포 변화

- 루트 진입점: `index.html` → `versions/v7/index.html` 리다이렉트
- 배포 채널: 현재 운영 URL은 Vercel
  - Production Alias: `https://ab-test-calculator-one.vercel.app`
- Vercel 업로드 최적화: `.vercelignore` 추가

## 6) 리스크 및 확인 포인트

- 그룹 비중 입력은 텍스트 기반이므로 운영 사용 시 입력 실수 가능성이 상대적으로 높음
- 절대 개선(%p) 모드에서 baseline 근처 상한값(100% 미만) 검증은 적용되어 있음

## 7) 결론

요청된 5개 수정사항은 코드 레벨에서 모두 반영되었고,
v7은 기존 v6 대비 실험 설계 유연성과 현실 반영성(트래픽 제한, 다중 그룹, 사용자 지정 통계 파라미터)이 유의미하게 개선되었습니다.
