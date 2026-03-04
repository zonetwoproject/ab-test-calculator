# A/B 테스트 계산기

전환율 실험 설계를 위한 **샘플 수 · MDE · 슬롯 배분** 계산기입니다.

**→ [Live Demo](https://ab-test-calculator-one.vercel.app)** (현재 운영 버전: **v11**)

**버전**: [v1](https://zonetwoproject.github.io/ab-test-calculator/versions/v1/) · [v2](https://zonetwoproject.github.io/ab-test-calculator/versions/v2/) · [v3](https://zonetwoproject.github.io/ab-test-calculator/versions/v3/) · [v4](https://zonetwoproject.github.io/ab-test-calculator/versions/v4/) · [v5](https://zonetwoproject.github.io/ab-test-calculator/versions/v5/) · [v6](https://zonetwoproject.github.io/ab-test-calculator/versions/v6/) · [v7](https://zonetwoproject.github.io/ab-test-calculator/versions/v7/) · [v8](https://zonetwoproject.github.io/ab-test-calculator/versions/v8/) · [v9](https://zonetwoproject.github.io/ab-test-calculator/versions/v9/) · [**v11**](https://zonetwoproject.github.io/ab-test-calculator/versions/v11/) ← 최신(권장)

**명칭**: v4→Mark3, v5→Mark4, v6→Mark5, v7→Mark7, v8→Mark8, v9→Mark9, v11→Mark11

---

## 주요 기능 (v11)

- **검증 피드백 단순화**: `검증 가능`/`검증 어려움` 2단계로 즉시 판정
- **목표 지표값 동시 안내**: 상대/절대 개선 입력 시 현재 지표 대비 목표 지표값 함께 표시
- **결과 흐름 개편**: `총 필요 샘플 → 필요 슬롯 환산` 순서로 계산 변수와 함께 안내
- **슬롯 안내 문구 개선**: `10,000개 중 n개 필요` 문구 제거, 슬롯 사용률(%) 중심 표시
- **입력 UX 개선**: 단위(일, 명/일, %)를 인풋 박스 우측 내부로 이동
- **CTA 명칭 통일**: `슬롯 계산하기` → `계산하기`
- **반응형 정보 구조**:
  - 모바일/태블릿: `계산기 | 사용 가이드` 탭
  - 데스크톱: 계산기:가이드 = `7:3` 2열 레이아웃

---

## v11 변경 요약

- 검증 피드백을 `검증 가능`/`검증 어려움`으로 단순화
- 상대/절대 개선 입력 시 목표 지표값(`기준 → 목표`) 동시 노출
- 결과 출력 순서를 `총 필요 샘플 → 슬롯 환산`으로 변경하고 계산 변수 추가
- 슬롯 안내에서 `10,000개 중 n개 필요` 문구 제거
- 단위 텍스트를 입력 필드 내부 우측으로 이동
- 계산 CTA를 `계산하기`로 변경

---

## 사용 방법 (v11 기준)

1. 실험 기간, 하루 방문수, 실험 사용 비율(%) 입력
2. 실험 그룹 수와 배분 비율(합계 100) 설정
3. 현재 지표(baseline) 입력 후 목표 개선값(상대/절대) 입력
4. 필요 시 고급 설정(신뢰도/검정력) 조정
5. `계산하기` 실행
6. 결과 카드와 `계산 결과 보고서` 확인, 필요 시 `결과 복사`

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| Frontend | Vanilla JavaScript, HTML5, CSS3 |
| 통계 | jStat(CDN), Two-proportion Z-test |
| 배포 | Vercel |
| 슬롯 해싱 | `FARM_FINGERPRINT(user_id) MOD 10000` |

---

## 프로젝트 구조

```text
ab-test-calculator/
├── index.html             # 루트 → versions/v11/ 리다이렉트
├── versions/              # 웹 계산기 버전 이력 (v1~v11)
│   └── v11/
│       ├── index.html
│       └── assets/
│           ├── favicon-ab.svg
│           └── mark8-core.js
├── mobile-app/            # iOS/Android 앱 (React Native)
├── web-app/               # 웹앱 빌드/프리뷰 워크스페이스
├── calculator-spec.md     # v7 기준 레거시 스펙 문서
├── CHANGELOG.md           # 버전별 변경 이력
└── README.md              # 이 문서
```

---

## 로컬 실행

웹:
- `npm run web:start`
- `npm run web:start:open`

모바일:
- `npm run mobile:start` (Metro)
- `npm run mobile:ios`
- `npm run mobile:android`
- `npm run mobile:pods`

웹앱(별도 워크스페이스):
- `npm run webapp:install`
- `npm run webapp:build`
- `npm run webapp:preview`

기본 웹 주소: `http://localhost:3000`

---

## 권장 기본값

- 기간: 14일
- 트래픽 사용 비율: 100% (필요 시 제한)
- 그룹 비중: 균등 분배(특별한 사유 없으면)
- 신뢰도: 95%
- 검정력: 80%

---

## 문서 · 이력

- [CHANGELOG.md](CHANGELOG.md) — 버전별 변경사항
- [calculator-spec.md](calculator-spec.md) — v7 기준 레거시 스펙
- [docs/v7-change-report.md](docs/v7-change-report.md) — v6 대비 v7 변경 보고서

---

MIT License · **Built by [zonetwo.project](mailto:zonetwo.project@gmail.com)** · [GitHub](https://github.com/zonetwoproject/ab-test-calculator)
