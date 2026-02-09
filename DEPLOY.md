# 배포 가이드

## GitHub에서 HTML이 잘 열리게 하기

폴더 구조를 바꾼 뒤 GitHub Pages에서 HTML이 안 열리면, 아래를 순서대로 확인하세요.

### 1. GitHub Pages 출처(Source) 설정

**방법 A – GitHub Actions (권장)**  
- 저장소 **Settings** → **Pages**
- **Build and deployment** → **Source**: **`GitHub Actions`** 선택
- `main` 브랜치에 푸시하면 자동으로 배포됨 (`.github/workflows/deploy-pages.yml` 사용)
- 1~2분 뒤 `https://<owner>.github.io/ab-test-calculator/` 에서 확인

**방법 B – Deploy from a branch**  
- **Source**: `Deploy from a branch`
- **Branch**: `main` (또는 사용 중인 기본 브랜치)
- **Folder**: **`/ (root)`** ← 반드시 루트
- Save 후 1~2분 뒤 `https://<owner>.github.io/ab-test-calculator/` 에서 확인

**주의**: Folder를 `/docs`로 두면 루트의 `index.html`은 배포되지 않습니다. HTML을 그대로 쓰려면 **루트** 또는 **GitHub Actions**를 쓰세요.

### 2. 필수 폴더 구조

GitHub Pages가 루트를 사용할 때, 다음 구조여야 메인·버전 페이지가 모두 열립니다.

```
ab-test-calculator/          ← 저장소 루트 = 사이트 루트
├── index.html               ← 메인(랜딩) → https://.../ab-test-calculator/
└── versions/
    ├── v1/
    │   └── index.html       ← https://.../ab-test-calculator/versions/v1/
    ├── v2/
    │   └── index.html
    ├── ...
    └── v6/
        └── index.html
```

- **랜딩**: 반드시 **저장소 루트**에 `index.html` 한 개
- **버전**: `versions/v1/` ~ `versions/v6/` 각 폴더 안에 `index.html` 한 개씩

### 3. 링크 규칙 (폴더 구조 바꿀 때 주의)

- **상대 경로만 사용**: `versions/v6/index.html` (O), `/versions/v6/` (X)
- 루트 `index.html`에서 버전으로 갈 때: `versions/v6/index.html` 또는 `versions/v6/`
  - `versions/v6/` 는 GitHub Pages·로컬 서버에서만 동작하고, `file://`에서는 `versions/v6/index.html` 사용 권장
- 버전 페이지에서 루트로 돌아갈 때: `../../index.html` (상위 두 단계)

### 4. 폴더 구조를 이미 바꾼 경우

| 변경 내용 | 조치 |
|-----------|------|
| 루트 대신 `docs/` 에만 HTML을 넣은 경우 | Pages 설정에서 Folder를 **`/docs`** 로 두고, 링크는 모두 `docs/` 기준 상대 경로로 수정 |
| 그대로 루트에 두고 싶은 경우 | `index.html`과 `versions/` 를 다시 **저장소 루트**로 옮기고, Pages Source는 **`/ (root)`** 로 설정 |

---

## 배포 구조 (요약)

- **랜딩**: `index.html` → 버전 선택 페이지 (저장소 루트)
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

- 메인: https://zonetwoproject.github.io/ab-test-calculator/
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

문의: [GitHub Issues](https://github.com/zonetwoproject/ab-test-calculator/issues)
