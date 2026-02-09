# GitHub에서 HTML이 열리게 하기 — 요약

## 1. "열린다"가 의미하는 두 가지

| 위치 | 주소 | HTML이 어떻게 보이나 |
|------|------|----------------------|
| **GitHub 저장소** | https://github.com/zonetwoproject/ab-test-calculator | 파일 클릭 시 **소스 코드**만 보임. 웹페이지처럼 실행되지 않음 (GitHub 동작 방식) |
| **GitHub Pages** | https://zonetwoproject.github.io/ab-test-calculator/ | **실제 웹사이트**처럼 열림. 여기서만 계산기 페이지가 동작함 |

→ **계산기가 "열린다" = Pages 주소로 들어갔을 때**를 말하는 것입니다.

---

## 2. 지금 상태 (확인한 내용)

- **zonetwoproject.github.io/ab-test-calculator** 접속 시 → **Content not found (404)**  
  → **GitHub Pages가 켜져 있지 않거나, 배포가 한 번도 안 된 상태**입니다.
- jabezpark → zonetwoproject 로 옮기면서 **Pages 설정/배포가 새 저장소에 안 되어 있는 것**과 직접 관련 있습니다.

---

## 3. 해결 방법 (zonetwoproject 레포에서 Pages 켜기)

### 방법 A: Deploy from a branch (가장 간단)

1. https://github.com/zonetwoproject/ab-test-calculator **Settings** 이동
2. 왼쪽 메뉴 **Pages**
3. **Build and deployment** → **Source** → **Deploy from a branch**
4. **Branch**: `main`  
   **Folder**: **`/ (root)`**
5. **Save** 후 1~2분 기다린 뒤  
   https://zonetwoproject.github.io/ab-test-calculator/ 다시 접속

이렇게 하면 지금 레포에 있는 **index.html**(v6로 리다이렉트)과 **versions/v1~v6/** 가 그대로 배포됩니다.

### 방법 B: GitHub Actions로 배포 (이 프로젝트 로컬에 워크플로 있음)

- 로컬에 만든 **`.github/workflows/deploy-pages.yml`**, **`.nojekyll`** 등을 zonetwoproject 레포에 푸시한 뒤:
1. 같은 레포 **Settings** → **Pages**
2. **Source** → **GitHub Actions** 선택
3. `main`에 푸시할 때마다 자동 배포됨

---

## 4. 정리

| 질문 | 답 |
|------|----|
| jabezpark → zonetwoproject 와 관련 있나? | **예.** 저장소가 바뀌면 Pages 주소도 **zonetwoproject.github.io/ab-test-calculator** 로 바뀌고, **새 저장소에서 Pages를 한 번 설정해 줘야** 열립니다. |
| GitHub에서 "파일이 안 열린다"는? | **Pages 주소**가 404라서 그런 것. 위처럼 Settings → Pages 에서 Source만 설정하면 됩니다. |
| GitHub.com에서 index.html 클릭하면? | 코드만 보이는 건 **정상**. 실제 사이트는 **zonetwoproject.github.io/ab-test-calculator** 에서만 열립니다. |
