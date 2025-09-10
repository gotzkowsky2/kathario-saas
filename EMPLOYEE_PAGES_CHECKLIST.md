# 📋 카타리오 SaaS 직원 페이지 구축 체크리스트

> **기준**: 바삭치킨 직원 페이지와 동일한 기능 구현  
> **원칙**: 한 번에 하나씩, 차근차근 진행  
> **현재 문제**: 직원 메뉴가 모두 관리자 페이지(`/dashboard/`)로 잘못 연결됨

---

## 🎯 **1단계: 기본 인프라 구축** 

### ✅ A. 직원 레이아웃 및 네비게이션
- [x] **직원 전용 레이아웃** (`src/app/employee/layout.tsx`)
  - [x] 직원 전용 헤더 (홈 아이콘, 메뉴 드롭다운, 사용자 정보, 로그아웃)
  - [x] 관리자와 구분되는 디자인 (초록색 테마)
  - [x] 반응형 메뉴 시스템
  - [x] 메뉴 항목들:
    - [x] 오늘의 체크리스트 (`/employee/checklist`)
    - [x] 내 제출 내역 (`/employee/submissions`)
    - [x] 주의사항 (`/employee/notices`)
    - [x] 재고/구매관리 (`/employee/inventory`)
    - [x] 재고(업데이트 필요) (`/employee/inventory/stale`)
    - [x] 메뉴얼 (`/employee/manual`)
    - [x] 즐겨찾기 (`/employee/favorites`)

### ✅ B. 직원 인증 시스템
- [x] **직원 로그인 페이지** (`src/app/employee/login/page.tsx`)
- [x] **직원 로그인 레이아웃** (`src/app/employee/login/layout.tsx`)
- [ ] **직원 인증 API** (`src/app/api/employee/auth-check/route.ts`)
- [x] **직원 정보 조회 API** (`src/app/api/employee/me/route.ts`)
- [x] **직원 로그인 API** (`src/app/api/employee/login/route.ts`)
- [x] **로그아웃 API** (`src/app/api/employee/logout/route.ts`)

---

## 🎯 **2단계: 메인 대시보드**

### ✅ C. 직원 메인 페이지
- [x] **메인 대시보드** (`src/app/employee/page.tsx`)
  - [x] 최신 업데이트 피드 (공지사항, 메뉴얼, 주의사항)
  - [x] 재고 업데이트 필요 항목 (`EmployeeStaleInventory` 컴포넌트)
  - [x] 빠른 접근 카드 (7개 메뉴)
  - [x] 상세 모달 (공지사항, 메뉴얼, 주의사항, 재고)
- [x] **피드 API** (`src/app/api/employee/feed/route.ts`)
- [x] **재고 업데이트 필요 컴포넌트** (`src/app/employee/EmployeeStaleInventory.tsx`)

---

## 🎯 **3단계: 핵심 기능 페이지들**

### ✅ D. 체크리스트 시스템
- [ ] **오늘의 체크리스트** (`src/app/employee/checklist/page.tsx`)
  - [ ] 할당된 체크리스트 목록
  - [ ] 시간대별/위치별 필터링
  - [ ] 진행률 표시
- [ ] **체크리스트 실행** (`src/app/employee/checklist/[id]/page.tsx`)
  - [ ] 개별 체크리스트 작업 화면
  - [ ] 항목별 체크/메모 기능
  - [ ] 연결된 재고/메뉴얼/주의사항 표시
- [ ] **체크리스트 관련 API들**
  - [ ] `/api/employee/checklists/route.ts` (목록 조회)
  - [ ] `/api/employee/checklist-progress/route.ts` (진행상황)
  - [ ] `/api/employee/checklist-submit/route.ts` (제출)
  - [ ] `/api/employee/submit-checklist/route.ts` (제출 처리)

### ✅ E. 제출 내역
- [ ] **내 제출 내역** (`src/app/employee/submissions/page.tsx`)
  - [ ] 개인 제출 기록 조회
  - [ ] 날짜별/상태별 필터링
  - [ ] 상세 내용 보기

### ✅ F. 주의사항
- [ ] **주의사항 목록** (`src/app/employee/notices/page.tsx`)
  - [ ] 활성 주의사항 조회
  - [ ] 우선순위별 표시
  - [ ] 즐겨찾기 기능
- [ ] **주의사항 API** (`src/app/api/employee/precautions/route.ts`)

---

## 🎯 **4단계: 재고 관리**

### ✅ G. 재고 관리 시스템
- [ ] **재고/구매관리** (`src/app/employee/inventory/page.tsx`)
  - [ ] 재고 현황 조회
  - [ ] 구매 요청 등록
  - [ ] 재고 업데이트
- [ ] **재고 업데이트 필요** (`src/app/employee/inventory/stale/page.tsx`)
  - [ ] 오래된 재고 목록
  - [ ] 업데이트 필요 항목
- [ ] **재고 관련 API들**
  - [ ] `/api/employee/inventory/route.ts` (재고 조회/업데이트)
  - [ ] `/api/employee/inventory/stale/route.ts` (업데이트 필요 재고)
  - [ ] `/api/employee/purchase-requests/route.ts` (구매 요청)

---

## 🎯 **5단계: 부가 기능**

### ✅ H. 메뉴얼 시스템
- [ ] **메뉴얼 페이지** (`src/app/employee/manual/page.tsx`)
  - [ ] 메뉴얼 목록 및 검색
  - [ ] 카테고리별 분류
  - [ ] 즐겨찾기 기능
- [ ] **메뉴얼 클라이언트** (`src/app/employee/manual/ManualClient.tsx`)
- [ ] **메뉴얼 API** (`src/app/api/employee/manuals/route.ts`)

### ✅ I. 즐겨찾기
- [ ] **즐겨찾기 페이지** (`src/app/employee/favorites/page.tsx`)
  - [ ] 즐겨찾기한 메뉴얼/주의사항
  - [ ] 카테고리별 정리
- [ ] **즐겨찾기 API** (`src/app/api/employee/favorites/route.ts`)

### ✅ J. 계정 관리
- [ ] **비밀번호 변경** (`src/app/employee/change-password/page.tsx`)
- [ ] **비밀번호 찾기** (`src/app/employee/forgot-password/page.tsx`)
- [ ] **관련 API들**
  - [ ] `/api/employee/change-password/route.ts`
  - [ ] `/api/employee/forgot-password/route.ts`

---

## 🎯 **6단계: 고급 기능**

### ✅ K. 연결된 항목 시스템
- [ ] **연결된 항목 API** (`src/app/api/employee/connected-items/route.ts`)
- [ ] **시간대 상태 API** (`src/app/api/employee/timeslot-status/route.ts`)

---

## 📊 **진행 상황 요약**

### 🚀 **현재 작업 중**
- **3단계 D. 체크리스트 시스템** 준비 중

### ✅ **완료된 작업**
- **1단계 A. 직원 레이아웃 및 네비게이션** ✅
- **1단계 B. 직원 인증 시스템** ✅ (auth-check API 제외)
- **2단계 C. 직원 메인 페이지** ✅

### ⏳ **다음 작업**
- **3단계 D. 체크리스트 시스템** 구현

---

## 📝 **작업 노트**

### 현재 문제점
1. **잘못된 라우팅**: 현재 직원 메뉴가 모두 관리자 페이지(`/dashboard/`)로 연결됨
2. **누락된 페이지**: 직원 전용 페이지들이 구현되지 않음  
3. **인증 시스템**: 직원 전용 인증 로직 부재

### 작업 원칙
- **바삭치킨 참조**: 각 페이지마다 바삭치킨의 해당 페이지를 참조하여 동일한 기능 구현
- **단계별 진행**: 너무 한번에 하지 말고 하나씩 차근차근
- **체크리스트 업데이트**: 작업 완료 시마다 이 파일을 업데이트하여 진행 상황 추적

---

**📅 마지막 업데이트**: 2025-09-10  
**👤 작업자**: Assistant  
**📍 현재 단계**: 1단계 A 시작 준비
