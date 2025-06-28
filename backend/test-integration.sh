#!/bin/bash

echo "🧪 Mentor-Mentee API 통합 테스트"
echo "================================="
echo

BASE_URL="http://localhost:8080/api"

echo "1. 서버 상태 확인"
curl -s http://localhost:8080/ | python3 -c "import sys, json; print('✅ 서버 정상:', json.load(sys.stdin)['status'])"
echo

echo "2. 회원가입 테스트 (멘티)"
SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testmentee@example.com",
    "password": "password123",
    "name": "Test Mentee",
    "role": "mentee"
  }')

if echo "$SIGNUP_RESPONSE" | grep -q "successfully\|created"; then
  echo "✅ 회원가입 성공"
else
  echo "⚠️  회원가입 결과: $SIGNUP_RESPONSE"
fi
echo

echo "3. 로그인 테스트 (멘티)"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testmentee@example.com",
    "password": "password123"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('token', ''))" 2>/dev/null)

if [ -n "$TOKEN" ]; then
  echo "✅ 로그인 성공"
else
  echo "⚠️  로그인 결과: $LOGIN_RESPONSE"
fi
echo

echo "4. 프로필 조회 테스트"
if [ -n "$TOKEN" ]; then
  PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/users/me" \
    -H "Authorization: Bearer $TOKEN")
  
  if echo "$PROFILE_RESPONSE" | grep -q "mentor\|profile"; then
    echo "✅ 프로필 조회 성공"
  else
    echo "⚠️  프로필 조회 결과: $PROFILE_RESPONSE"
  fi
else
  echo "❌ 토큰이 없어 프로필 조회 건너뜀"
fi
echo

echo "5. 멘토 목록 조회 테스트 (멘티로)"
if [ -n "$TOKEN" ]; then
  MENTORS_RESPONSE=$(curl -s -X GET "$BASE_URL/mentors" \
    -H "Authorization: Bearer $TOKEN")
else
  MENTORS_RESPONSE=$(curl -s -X GET "$BASE_URL/mentors")
fi
if echo "$MENTORS_RESPONSE" | grep -q "\[\]" || echo "$MENTORS_RESPONSE" | grep -q "mentor"; then
  echo "✅ 멘토 목록 조회 성공"
else
  echo "⚠️  멘토 목록 결과: $MENTORS_RESPONSE"
fi
echo

echo "6. OpenAPI 스펙 확인"
OPENAPI_RESPONSE=$(curl -s http://localhost:8080/openapi.json)
if echo "$OPENAPI_RESPONSE" | grep -q '"openapi":"3.0.1"'; then
  echo "✅ OpenAPI 스펙 정상"
else
  echo "❌ OpenAPI 스펙 오류"
fi
echo

echo "7. Swagger UI 확인"
SWAGGER_RESPONSE=$(curl -s http://localhost:8080/swagger-ui)
if echo "$SWAGGER_RESPONSE" | grep -q "swagger-ui"; then
  echo "✅ Swagger UI 정상"
else
  echo "❌ Swagger UI 오류"
fi
echo

echo "🎉 테스트 완료!"
echo "📚 Swagger UI: http://localhost:8080/swagger-ui"
echo "📋 OpenAPI JSON: http://localhost:8080/openapi.json"
