# WebSocket 연결 문제 해결 가이드

## 문제 상황
- Cursor + Next.js + PM2 환경에서 채팅 연결이 자꾸 끊어지는 현상
- kathario-saas 프로젝트에서 WebSocket 연결 불안정

## 원인 분석
1. **Next.js 15 프로덕션 빌드 이슈**: BUILD_ID 파일 생성 문제
2. **포트 불일치**: Nginx는 3003 포트로 프록시하는데 앱이 3000에서 실행
3. **PM2 프로세스 에러**: 프로덕션 모드 실행 실패

## 해결 방법

### 1. Nginx WebSocket 프록시 설정 확인
```nginx
# /etc/nginx/sites-available/kathario-saas
server {
    listen 80;
    listen [::]:80;
    server_name 91.99.75.135;
    
    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        
        # WebSocket 업그레이드 헤더 (Cursor 실시간 통신용)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
        
        # 기본 프록시 헤더
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # 버퍼링 비활성화 (실시간 통신용)
        proxy_buffering off;
        
        # 타임아웃 설정 (WebSocket 연결 유지)
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

### 2. PM2 설정 수정
```bash
# 기존 프로세스 삭제
pm2 delete kathario-saas

# 개발 모드로 포트 3003에서 실행
PORT=3003 pm2 start npm --name "kathario-saas" -- run dev

# PM2 설정 저장
pm2 save
```

### 3. Next.js 15 프로덕션 빌드 이슈 해결
- Next.js 15에서 BUILD_ID 파일 생성 방식이 변경됨
- 임시 해결책: 개발 모드로 실행
- 향후 Next.js 15 안정화 후 프로덕션 모드 재시도 권장

## 검증 방법

### 1. 로컬 서비스 확인
```bash
curl -I http://127.0.0.1:3003
# 응답: HTTP/1.1 200 OK
```

### 2. Nginx 프록시 확인
```bash
curl -I http://91.99.75.135
# 응답: HTTP/1.1 200 OK
# Server: nginx/1.18.0 (Ubuntu)
```

### 3. PM2 상태 확인
```bash
pm2 status
# kathario-saas: online 상태 확인
```

## 주요 설정 파일 위치
- Nginx 설정: `/etc/nginx/sites-available/kathario-saas`
- PM2 프로세스: `pm2 list`로 확인
- 프로젝트 경로: `/root/kathario-saas`

## 문제 해결 체크리스트
- [ ] Nginx WebSocket 업그레이드 헤더 설정 확인
- [ ] PM2 프로세스가 올바른 포트(3003)에서 실행 중인지 확인
- [ ] Next.js 앱이 정상적으로 컴파일되었는지 확인
- [ ] 포트 충돌이 없는지 확인 (`netstat -tulpn | grep 3003`)
- [ ] Nginx 설정 문법 오류 확인 (`nginx -t`)

## 추가 참고사항
- Next.js 15는 아직 새로운 버전이므로 프로덕션 환경에서는 개발 모드 사용 권장
- WebSocket 연결 문제는 대부분 프록시 설정 또는 포트 불일치가 원인
- PM2 로그 모니터링: `pm2 logs kathario-saas`

---
*최종 업데이트: 2025-09-05*
*작업자: AI Assistant*

