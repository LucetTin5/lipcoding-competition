import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8080/api';

console.log('🧪 Testing Mentors API...\n');

const menteeCredentials = {
  email: 'mentee@test.com',
  password: 'TestPass456!',
};

async function getAuthToken() {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(menteeCredentials),
  });
  const data = await response.json();
  return response.status === 200 ? data.token : null;
}

async function testMentorList(token, params = {}) {
  const url = new URL(`${BASE_URL}/mentors`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (response.status === 200 && Array.isArray(data)) {
    console.log(`✅ Mentor list fetched (${data.length} mentors)`);
    if (data.length > 0) {
      console.log('   Sample:', data[0]);
    }
  } else {
    console.log('❌ Mentor list fetch failed:', data);
  }
}

async function testMentorListWithSkill(token) {
  await testMentorList(token, { skill: 'React' });
}

async function testMentorListWithOrder(token) {
  await testMentorList(token, { orderBy: 'name' });
  await testMentorList(token, { orderBy: 'skill' });
}

async function testMentorListInvalidParams(token) {
  const url = new URL(`${BASE_URL}/mentors`);
  url.searchParams.append('skill', '');
  url.searchParams.append('orderBy', 'invalid');
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (response.status === 400) {
    console.log('✅ Invalid query params correctly rejected');
  } else {
    console.log('❌ Invalid query params not rejected:', data);
  }
}

async function runMentorTests() {
  const token = await getAuthToken();
  if (!token) {
    console.log('❌ Failed to get mentee token');
    return;
  }
  await testMentorList(token);
  await testMentorListWithSkill(token);
  await testMentorListWithOrder(token);
  await testMentorListInvalidParams(token);
  console.log('\n🎉 Mentors API testing completed!');
}

runMentorTests();
