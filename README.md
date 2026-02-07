# A/B 테스트 계산기

전환율 개선을 위한 **샘플 수 · MDE · 슬롯 배분**을 한 번에 계산하는 웹 도구입니다. PM이 실험 설계 시 필요한 수치를 빠르게 확인할 수 있습니다.

**→ [Live Demo](https://zonetwoproject.github.io/ab-test-calculator/)** (현재 버전 v6)

---

## 주요 기능

- **필요 샘플 수** — Two-proportion Z-test 기반 대조군/실험군 샘플 계산
- **MDE 자동 계산** — 주어진 조건에서 검증 가능한 최소 개선율 자동 산출
- **슬롯 할당** — 10,000 슬롯 기준 대조군/실험군 범위 + 슬롯 사용률
- **고유 유저 추정** — K값(평균 방문 횟수) 기반 추정 (v6)
- **실시간 피드백** — 입력 중 고유 유저 예상, MDE 프리뷰, 목표 vs MDE 비교
- **BigQuery용 SQL** — 슬롯 추출 쿼리 자동 생성

---

## 빠른 시작

| 용도 | 링크 |
|------|------|
| **최신 버전 (권장)** | [v6 (Mark5)](https://zonetwoproject.github.io/ab-test-calculator/versions/v6/) — K값 기반 고유 유저 |
| v5 (Mark4) | [versions/v5/](https://zonetwoproject.github.io/ab-test-calculator/versions/v5/) — 지면별 재방문 계수 |
| v4 (Mark3) | [versions/v4/](https://zonetwoproject.github.io/ab-test-calculator/versions/v4/) — MDE 자동 계산, 실시간 피드백 |
| v3 · v2 · v1 | [v3](https://zonetwoproject.github.io/ab-test-calculator/versions/v3/) · [v2](https://zonetwoproject.github.io/ab-test-calculator/versions/v2/) · [v1](https://zonetwoproject.github.io/ab-test-calculator/versions/v1/) |

**명칭**: URL은 v1~v6, 계산기 화면에는 v4→Mark3, v5→Mark4, v6→Mark5로 표시됩니다.

---

## 사용 방법 (v6 기준)

1. **실험 기간** → **방문 빈도(K값)** → **하루 방문수** → **배분 비율** 순으로 입력
2. **현재 지표**(전환율 등)와 **목표 개선율** 입력
3. **[계산하기]** 클릭 → 필요 샘플, 슬롯 배분, 고유 유저, SQL 쿼리 확인

고급 설정(유의수준 Alpha, 검정력 Power)은 접이식 메뉴에서 변경할 수 있습니다.

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| Frontend | Vanilla JavaScript, HTML5, CSS3 |
| 통계 | jStat(CDN), Two-proportion Z-test |
| 배포 | GitHub Pages |
| 슬롯 해싱 | `FARM_FINGERPRINT(user_id) MOD 10000` |

---

## 버전 비교

| 기능 | v1 | v2 | v3 | v4 | v5 | v6 |
|------|:--:|:--:|:--:|:--:|:--:|:--:|
| 샘플 크기 계산 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 슬롯 자동 할당 | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 고유 유저 추정 | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ (K값) |
| MDE 자동 계산/제안 | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| 목표 vs MDE 비교·기간 제안 | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| 지면별 K값/재방문 계수 | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ (K값) |

**추천**: 대부분의 실험은 **v6** 사용. 상세 정책·계산 로직은 [calculator-spec.md](calculator-spec.md) 참고.

---

## 프로젝트 구조

```
ab-test-calculator/
├── index.html          # 루트 → versions/v6/ 로 리다이렉트
├── calculator-spec.md   # 제품 정책·계산 로직 명세 (PM/개발 참고)
├── CHANGELOG.md        # 버전별 변경 이력
├── README.md           # 이 문서
└── versions/
    ├── v6/             # 최신 (Mark5, K값 기반) ← 권장
    ├── v5/ · v4/ · v3/ · v2/ · v1/
```

---

## 권장 설정

- **기간**: 14일 (요일 효과 제거)
- **배분**: 50:50 (통계 효율 최대)
- **유의수준**: 0.05 / **검정력**: 0.80

---

## 문서 · 이력

- [calculator-spec.md](calculator-spec.md) — 입력 정책, 유효성 검사, 계산 로직, 출력 형식
- [CHANGELOG.md](CHANGELOG.md) — 버전별 상세 변경사항

---

## 라이선스 · 제작자

MIT License · **Built by [zonetwo.project](mailto:zonetwo.project@gmail.com)** · [GitHub](https://github.com/zonetwoproject/ab-test-calculator)
