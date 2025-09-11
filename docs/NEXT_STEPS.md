# 내일 할 일 (Kathario SaaS)

- ESLint 무시 해제하고 any 타입 전부 제거 및 경고 정리
- 직원 체크리스트 상세 페이지 구현 및 진행/제출 연동
- 자동 생성 스케줄러 구현 (autoGenerateEnabled, recurrenceDays, generationTime)
- 수동 입력 페이지: 오늘 생성된 체크리스트 목록 UI 개선 및 토스트 추가
- RBAC 최종 점검: 모든 `/dashboard`, `/employee` 경로 보호 재확인
- PM2를 dev → start로 전환, ecosystem 설정 정리(빌드 산출물 사용)
- 핵심 플로우 E2E/통합 테스트 추가 (생성 → 조회 → 제출)

## 빠른 확인 체크리스트
- 관리자 수동 입력에서 생성 후 하단 "오늘 생성된 체크리스트"에 즉시 표시되는지
- 직원 페이지 `/employee/checklist`에서 오늘 인스턴스 목록/진행률 로딩되는지
