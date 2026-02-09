#!/bin/bash
cd "$(dirname "$0")"
echo "A/B 테스트 계산기 서버를 띄우는 중..."
echo "브라우저가 곧 열립니다. (안 열리면 http://localhost:3000 을 직접 여세요)"
npm run start:open
