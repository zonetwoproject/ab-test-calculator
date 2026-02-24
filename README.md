# A/B 테스트 계산기

전환율 실험 설계를 위한 **샘플 수 · MDE · 슬롯 배분** 계산기입니다.

**→ [Live Demo](https://ab-test-calculator-one.vercel.app)** (현재 운영 버전 v8)

**버전**: [v1](https://zonetwoproject.github.io/ab-test-calculator/versions/v1/) · [v2](https://zonetwoproject.github.io/ab-test-calculator/versions/v2/) · [v3](https://zonetwoproject.github.io/ab-test-calculator/versions/v3/) · [v4](https://zonetwoproject.github.io/ab-test-calculator/versions/v4/) · [v5](https://zonetwoproject.github.io/ab-test-calculator/versions/v5/) · [v6](https://zonetwoproject.github.io/ab-test-calculator/versions/v6/) · [v7](https://zonetwoproject.github.io/ab-test-calculator/versions/v7/) · [**v8**](https://zonetwoproject.github.io/ab-test-calculator/versions/v8/) ← 최신(권장)

**명칭**: v4→Mark3, v5→Mark4, v6→Mark5, v7→Mark7, v8→Mark8

---

## 주요 기능 (v8)

- **전체 트래픽 사용 비율 제한**: 예) 대상 트래픽의 70%만 실험 반영
- **개선 목표 입력 방식 선택**: 상대 개선율(%) / 절대 개선폭(%p)
- **다중 그룹 모수 계산**: 그룹 수(2~5) + 그룹 비중(합계 100) 기반 샘플 계산
- **K값 직접 입력**: preset(4.2/3.0/2.0/1.2) 또는 custom K
- **신뢰도/검정력 직접 입력**: 연속값(%) 기반 Z-score 계산
- **MDE 프리뷰 + 목표 달성 가능성 판정**: OK / MARGINAL / INFEASIBLE

---

## 사용 방법 (v8 기준)

1. 실험 기간, K값, 하루 방문수 입력
2. 전체 트래픽 중 실험 사용 비율(%) 입력
3. 그룹 수와 그룹 비중(합계 100) 설정
4. baseline 입력 후 목표 개선값을 상대(%) 또는 절대(%p)로 입력
5. 신뢰도/검정력 필요 시 직접 조정
6. 계산하기 클릭 → 총 필요 샘플, 그룹별 샘플, 슬롯 배분 확인

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| Frontend | Vanilla JavaScript, HTML5, CSS3 |
| 통계 | jStat(CDN), Two-proportion Z-test |
| 배포 | GitHub Pages |
| 슬롯 해싱 | `FARM_FINGERPRINT(user_id) MOD 10000` |

---

## 프로젝트 구조

```text
ab-test-calculator/
├── index.html             # 루트 → versions/v8/ 리다이렉트
├── versions/              # 웹 계산기 버전 이력 (v1~v8)
├── mobile-app/            # iOS/Android 앱 (React Native)
│   ├── ios/
│   ├── screens/
│   ├── components/
│   └── package.json
├── calculator-spec.md     # v7 기준 제품/기술 스펙 문서
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

- [calculator-spec.md](calculator-spec.md) — v7 기준 입력 정책, 계산 로직, 출력 형식
- [docs/v7-change-report.md](docs/v7-change-report.md) — v6 대비 v7 변경 보고서
- [CHANGELOG.md](CHANGELOG.md) — 버전별 변경사항

---

MIT License · **Built by [zonetwo.project](mailto:zonetwo.project@gmail.com)** · [GitHub](https://github.com/zonetwoproject/ab-test-calculator)
