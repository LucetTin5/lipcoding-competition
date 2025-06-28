import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8080/api';

console.log('🧪 Testing Match Requests API...\n');

const mentorCredentials = {
  email: 'mentor@test.com',
  password: 'TestPass123!',
};
const menteeCredentials = {
  email: 'mentee@test.com',
  password: 'TestPass456!',
};

async function getAuthToken(credentials) {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  const data = await response.json();
  return response.status === 200 ? data.token : null;
}

async function testCreateMatchRequest(menteeToken) {
  console.log('📋 Testing create match request...');

  const requestBody = {
    mentorId: 1, // ID of the mentor
    menteeId: 2, // ID of the mentee
    message: '멘토링 받고 싶어요!',
  };

  const response = await fetch(`${BASE_URL}/match-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${menteeToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();

  if (response.status === 200) {
    console.log('✅ Match request created successfully:', data);
    return data.id;
  } else {
    console.log('❌ Match request creation failed:', response.status, data);
    return null;
  }
}

async function testCreateInvalidMatchRequest(menteeToken) {
  console.log('📋 Testing create match request with invalid data...');

  const requestBody = {
    mentorId: 999, // Non-existent mentor
    menteeId: 2,
    message: '멘토링 받고 싶어요!',
  };

  const response = await fetch(`${BASE_URL}/match-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${menteeToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();

  if (response.status === 400) {
    console.log('✅ Invalid match request correctly rejected');
  } else {
    console.log(
      '❌ Invalid match request not rejected:',
      response.status,
      data
    );
  }
}

async function testGetIncomingRequests(mentorToken) {
  console.log('📋 Testing get incoming match requests...');

  const response = await fetch(`${BASE_URL}/match-requests/incoming`, {
    headers: { Authorization: `Bearer ${mentorToken}` },
  });

  const data = await response.json();

  if (response.status === 200 && Array.isArray(data)) {
    console.log(`✅ Incoming requests fetched (${data.length} requests)`);
    if (data.length > 0) {
      console.log('   Sample:', data[0]);
    }
  } else {
    console.log('❌ Incoming requests fetch failed:', response.status, data);
  }
}

async function testGetOutgoingRequests(menteeToken) {
  console.log('📋 Testing get outgoing match requests...');

  const response = await fetch(`${BASE_URL}/match-requests/outgoing`, {
    headers: { Authorization: `Bearer ${menteeToken}` },
  });

  const data = await response.json();

  if (response.status === 200 && Array.isArray(data)) {
    console.log(`✅ Outgoing requests fetched (${data.length} requests)`);
    if (data.length > 0) {
      console.log('   Sample:', data[0]);
    }
  } else {
    console.log('❌ Outgoing requests fetch failed:', response.status, data);
  }
}

async function testAcceptMatchRequest(mentorToken, matchId) {
  if (!matchId) {
    console.log('⏭️ Skipping accept test - no match ID');
    return;
  }

  console.log('📋 Testing accept match request...');

  const response = await fetch(`${BASE_URL}/match-requests/${matchId}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${mentorToken}` },
  });

  const data = await response.json();

  if (response.status === 200) {
    console.log('✅ Match request accepted successfully:', data);
  } else {
    console.log('❌ Match request acceptance failed:', response.status, data);
  }
}

async function testRejectMatchRequest(mentorToken, matchId) {
  if (!matchId) {
    console.log('⏭️ Skipping reject test - no match ID');
    return;
  }

  console.log('📋 Testing reject match request...');

  const response = await fetch(`${BASE_URL}/match-requests/${matchId}/reject`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${mentorToken}` },
  });

  const data = await response.json();

  if (response.status === 200) {
    console.log('✅ Match request rejected successfully:', data);
  } else {
    console.log('❌ Match request rejection failed:', response.status, data);
  }
}

async function testCancelMatchRequest(menteeToken, matchId) {
  if (!matchId) {
    console.log('⏭️ Skipping cancel test - no match ID');
    return;
  }

  console.log('📋 Testing cancel match request...');

  const response = await fetch(`${BASE_URL}/match-requests/${matchId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${menteeToken}` },
  });

  const data = await response.json();

  if (response.status === 200) {
    console.log('✅ Match request cancelled successfully:', data);
  } else {
    console.log('❌ Match request cancellation failed:', response.status, data);
  }
}

async function runMatchTests() {
  const mentorToken = await getAuthToken(mentorCredentials);
  const menteeToken = await getAuthToken(menteeCredentials);

  if (!mentorToken) {
    console.log('❌ Failed to get mentor token');
    return;
  }

  if (!menteeToken) {
    console.log('❌ Failed to get mentee token');
    return;
  }

  // Test creating match request
  const matchId = await testCreateMatchRequest(menteeToken);

  // Test invalid match request
  await testCreateInvalidMatchRequest(menteeToken);

  // Test getting requests
  await testGetIncomingRequests(mentorToken);
  await testGetOutgoingRequests(menteeToken);

  // Test accepting/rejecting/cancelling requests
  // Note: In a real scenario, you'd test these with different match requests
  // to avoid conflicts

  console.log('\n🎉 Match Requests API testing completed!');
}

runMatchTests();
