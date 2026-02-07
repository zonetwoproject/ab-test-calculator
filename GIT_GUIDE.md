# Git · 배포 가이드

## 1. 저장소 구조

```
📁 ab-test-calculator/
├── index.html          # 랜딩 (버전 선택)
├── versions/v1/ ~ v6/  # 각 버전 index.html
├── README.md           # 통합 문서
├── CHANGELOG.md        # 변경 이력
├── DEPLOY.md           # 배포 절차
└── GIT_GUIDE.md        # 이 문서
```

---

## 2. 커밋 & 푸시

```bash
cd /path/to/ab-test-calculator

# 변경 파일 스테이징
git add .

# 커밋
git commit -m "메시지"

# 푸시
git push origin main
```

---

## 3. GitHub Pages URL

- 메인: https://jabezpark.github.io/ab-test-calculator/
- v1: .../versions/v1/
- v2: .../versions/v2/
- v3: .../versions/v3/
- v4: .../versions/v4/
- v5: .../versions/v5/
- v6: .../versions/v6/

---

## 4. 커밋 vs 푸시

| 작업 | 설명 | 명령어 |
|------|------|--------|
| **커밋(Commit)** | 로컬에 변경사항 저장 | `git commit -m "메시지"` |
| **푸시(Push)** | 로컬 커밋을 GitHub에 업로드 | `git push origin main` |

---

## 5. 자주 하는 실수

### ❌ add 없이 commit
```bash
git add 변경된파일
git commit -m "메시지"
```

### ❌ commit 없이 push
```bash
git add .
git commit -m "메시지"
git push origin main
```

---

## 6. 상태 확인

```bash
git status
git diff
git log --oneline
git remote -v
```

---

## 7. 되돌리기 (비상용)

- 커밋 메시지 수정: `git commit --amend -m "새 메시지"`
- 마지막 커밋 취소(파일 유지): `git reset --soft HEAD~1`

---

## 8. 문제 해결

### "rejected (non-fast-forward)"
```bash
git pull origin main
git push origin main
```

### "Permission denied"
- SSH 키 설정 및 GitHub 등록 필요

---

궁금한 점은 [GitHub Issues](https://github.com/jabezpark/ab-test-calculator/issues)에 남겨주세요.
