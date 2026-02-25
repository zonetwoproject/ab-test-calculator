# A/B 테스트 계산기

전환율 실험 설계를 위한 **샘플 수 · MDE · 슬롯 배분** 계산기입니다.

**→ [Live Demo](https://ab-test-calculator-one.vercel.app)** (현재 운영 버전: **v9**)

**버전**: [v1](https://zonetwoproject.github.io/ab-test-calculator/versions/v1/) · [v2](https://zonetwoproject.github.io/ab-test-calculator/versions/v2/) · [v3](https://zonetwoproject.github.io/ab-test-calculator/versions/v3/) · [v4](https://zonetwoproject.github.io/ab-test-calculator/versions/v4/) · [v5](https://zonetwoproject.github.io/ab-test-calculator/versions/v5/) · [v6](https://zonetwoproject.github.io/ab-test-calculator/versions/v6/) · [v7](https://zonetwoproject.github.io/ab-test-calculator/versions/v7/) · [v8](https://zonetwoproject.github.io/ab-test-calculator/versions/v8/) · [**v9**](https://zonetwoproject.github.io/ab-test-calculator/versions/v9/) ← 최신(권장)

**명칭**: v4→Mark3, v5→Mark4, v6→Mark5, v7→Mark7, v8→Mark8, v9→Mark9

---

## 주요 기능 (v9)

- **K값 고정(1) 기반 고유 유저 계산**: 방문 빈도 입력 필드 제거
- **실험 사용 비율 제한**: 전체 트래픽 중 실험 반영 비율(%) 입력
- **다중 그룹 계산**: 그룹 수(2~5) + 그룹 비중(합계 100) 검증
- **MDE 프리뷰 선노출**: 현재 지표(baseline) 입력만으로 검증 가능한 최소 효과 즉시 확인
- **개선 목표 직접 입력/선택**: 상대 개선율(%) / 절대 개선폭(%p), 기본값 미지정
- **텍스트 보고서 결과 제공**: 계산 결과를 보고서 형태로 출력 + 원클릭 복사
- **반응형 정보 구조**:
  - 모바일/태블릿: `계산기 | 사용 가이드` 탭
  - 데스크톱: 계산기:가이드 = `7:3` 2열 레이아웃

---

## v8 → v9 변경 요약

- 입력 섹션 간 소제목 추가 및 구획 강화(시각적 구분)
- 방문 빈도 필드 제거, `K=1` 고정
- 현재 지표 입력 가이드 문구 추가(일평균 값 입력 유도)
- 개선율 기본 선택값 제거(사용자 직접 입력/선택)
- 결과 영역을 텍스트 기반 보고서 형태로 전환/정리
- 사용 가이드 영역을 별도 패널로 제공(반응형)

---

## 사용 방법 (v9 기준)

1. 실험 기간, 하루 방문수, 실험 사용 비율(%) 입력
2. 실험 그룹 수와 배분 비율(합계 100) 설정
3. 현재 지표(baseline) 입력 후 목표 개선값(상대/절대) 입력
4. 필요 시 고급 설정(신뢰도/검정력) 조정
5. `슬롯 계산하기` 실행
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
├── index.html             # 루트 → versions/v9/ 리다이렉트
├── versions/              # 웹 계산기 버전 이력 (v1~v9)
│   └── v9/
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
