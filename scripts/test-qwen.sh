#!/bin/bash
# Test QwenCloud API depuis le conteneur app
# Usage : TEST_MODEL=qwen-flash bash test-qwen.sh (defaut: $QWEN_MODEL du conteneur)
MODEL_OVERRIDE="${TEST_MODEL:-}"
sudo docker exec -e MODEL_OVERRIDE="$MODEL_OVERRIDE" itvision-app sh -c '
MODEL="${MODEL_OVERRIDE:-$QWEN_MODEL}"
echo "Test modele: $MODEL"
curl -s -m 20 -X POST "$QWEN_CLOUD_BASE_URL/chat/completions" \
  -H "Authorization: Bearer $QWEN_CLOUD_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}],\"max_tokens\":10}" \
  | head -c 600
'
echo ""
