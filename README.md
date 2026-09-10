# 공급가 관리

업체별·상품별 공급가를 관리하는 웹 앱입니다.

## 구성

- Frontend: Vite + React (`src/`)
- API: Express (`backend/`)
- DB: PostgreSQL 16 (Docker)

## 실행 방법

1. DB 시작

```bash
docker compose up -d
```

2. API 설치/실행

```bash
cd backend
npm install
npm run dev
```

3. 프론트 실행 (다른 터미널)

```bash
npm install
npm run dev
```

- 프론트: http://127.0.0.1:5173
- API: http://127.0.0.1:4000
- DB: localhost:5433 (`product` / `product_dev`)

## 유용한 명령

```bash
npm run db:up      # DB 컨테이너 시작
npm run db:down    # DB 컨테이너 중지
npm run db:reset   # DB 볼륨 포함 초기화 후 재시작
```

최초 DB 생성 시 샘플 업체/상품/공급가가 자동 입력됩니다.
