# 배포 가이드

## 배포 구조

- **랜딩**: `index.html` → 버전 선택 페이지
- **버전별**: `versions/v1/` ~ `versions/v6/` 각각 `index.html` 포함

---

## 새 버전 배포 절차

### Step 1: 해당 버전 폴더에 파일 배치

```bash
cd /path/to/ab-test-calculator

# 예: v6 업데이트 시
# versions/v6/index.html 를 수정하거나 새로 만든 index.html 로 교체
cp /path/to/new-index.html versions/v6/index.html
```

### Step 2: Git 상태 확인

```bash
git status
```

### Step 3: 커밋 & 푸시

```bash
git add versions/v6/index.html   # 변경된 파일
git add README.md CHANGELOG.md   # 문서 업데이트 시
git commit -m "Release v6: 요약 메시지"
git push origin main
```

### Step 4: GitHub Pages 확인

푸시 후 약 **1~2분** 뒤 확인:

- 메인: https://jabezpark.github.io/ab-test-calculator/
- v1~v6: `.../versions/v1/` ~ `.../versions/v6/`

---

## 커밋 vs 푸시

| 작업 | 설명 | 명령어 |
|------|------|--------|
| **커밋(Commit)** | 로컬에 변경사항 저장 | `git commit -m "메시지"` |
| **푸시(Push)** | 로컬 커밋을 GitHub에 업로드 | `git push origin main` |

---

## 문제 해결

### 푸시가 거부되는 경우

```bash
git pull origin main
# 충돌 해결 후
git push origin main
```

### 랜딩 페이지만 수정한 경우

```bash
git add index.html
git commit -m "Update: 랜딩 링크 정리"
git push origin main
```

---

문의: [GitHub Issues](https://github.com/jabezpark/ab-test-calculator/issues)
