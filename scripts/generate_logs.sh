#!/usr/bin/env bash
# 테스트용 로그 파일 생성기
# 사용법: ./scripts/generate_logs.sh [로그파일경로] [간격(초)]

LOG_FILE="${1:-/tmp/tail-test.log}"
INTERVAL="${2:-1}"

SERVICES=("AuthService" "UserService" "PaymentService" "NotificationService" "ApiGateway")
USERS=("user_1042" "user_2837" "user_9901" "user_4412" "user_7756")
ENDPOINTS=("/api/v1/login" "/api/v1/users" "/api/v1/orders" "/api/v1/payment" "/api/v1/logout")

log() {
  local level="$1"
  local msg="$2"
  local ts
  ts=$(date '+%Y-%m-%d %H:%M:%S')
  echo "${ts} [${level}] ${msg}" >> "$LOG_FILE"
}

echo "로그 파일: $LOG_FILE"
echo "간격: ${INTERVAL}초  (Ctrl+C 로 중지)"
echo ""

# 초기 로그 10줄 추가
for i in $(seq 1 10); do
  svc="${SERVICES[$((RANDOM % ${#SERVICES[@]}))]}"
  log "INFO"  "[$svc] Application started (pid=$$, instance=$i)"
done
log "INFO" "[ApiGateway] Listening on port 8080"

# 주기적으로 로그 추가
while true; do
  R=$((RANDOM % 100))
  svc="${SERVICES[$((RANDOM % ${#SERVICES[@]}))]}"
  usr="${USERS[$((RANDOM % ${#USERS[@]}))]}"
  ep="${ENDPOINTS[$((RANDOM % ${#ENDPOINTS[@]}))]}"
  ms=$((RANDOM % 900 + 10))

  if   [ $R -lt 5 ];  then
    log "ERROR" "[$svc] Database connection timeout after ${ms}ms — retrying (attempt $((RANDOM%3+1))/3)"
  elif [ $R -lt 10 ]; then
    log "ERROR" "[$svc] Unhandled exception: NullPointerException at line $((RANDOM%500+1))"
  elif [ $R -lt 20 ]; then
    log "WARN"  "[$svc] Slow query detected: ${ms}ms for SELECT * FROM orders WHERE user_id='$usr'"
  elif [ $R -lt 30 ]; then
    log "WARN"  "[$svc] Rate limit approaching for $usr (${ms}/1000 req/min)"
  elif [ $R -lt 60 ]; then
    log "INFO"  "[$svc] $usr GET $ep ${ms}ms 200 OK"
  elif [ $R -lt 75 ]; then
    log "INFO"  "[$svc] $usr POST $ep $((RANDOM%300+50))ms 201 Created"
  else
    log "DEBUG" "[$svc] Cache hit for key='session:${usr}' ttl=$((RANDOM%3600))s"
  fi

  sleep "$INTERVAL"
done
