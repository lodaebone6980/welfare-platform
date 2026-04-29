#!/bin/bash
# OpenAI 백그라운드 자동 반복 wrapper
# 사용: nohup bash scripts/run-until-complete.sh > tmp/loop-master.log 2>&1 &
# 미완성이 < 50건이거나 최대 5라운드까지 반복

set -u
cd "$(dirname "$0")/.."

MAX_ROUNDS="${MAX_ROUNDS:-5}"
MIN_REMAINING="${MIN_REMAINING:-50}"

for round in $(seq 1 "$MAX_ROUNDS"); do
  echo "===== ROUND $round / $MAX_ROUNDS ====="
  date

  # 이전 batch 끝나길 기다림 (혹시 살아있다면)
  while pgrep -f generate-policy-content > /dev/null; do
    echo "[wait] 다른 batch 작동 중... 60초 후 재확인"
    sleep 60
  done

  log_file="tmp/batch-round-$round.log"
  echo "[round $round] 시작 → 로그: $log_file"

  CONCURRENCY=2 STATUS=ALL LIMIT=2000 ORDER_BY=UNPOPULAR \
    node --env-file=.env.local --env-file=.env --import=tsx \
    scripts/generate-policy-content.ts > "$log_file" 2>&1

  saved=$(grep -c "✅ saved" "$log_file" || echo 0)
  failed=$(grep -c "❌\|invalid JSON" "$log_file" || echo 0)
  echo "[round $round 완료] saved=$saved failed=$failed"

  # 남은 미완성 확인
  remaining=$(node --env-file=.env.local --env-file=.env --import=tsx \
    scripts/content-status.ts 2>&1 | grep "본문 미완성" | grep -oE "[0-9]+" | head -1)
  echo "[round $round] PUBLISHED 중 남은 미완성: $remaining"

  if [ "${remaining:-9999}" -lt "$MIN_REMAINING" ]; then
    echo "[done] 미완성 $remaining < $MIN_REMAINING → 중단"
    break
  fi
done

echo "===== ALL ROUNDS COMPLETE ====="
date
