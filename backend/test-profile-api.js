import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8080/api';

console.log('🧪 Testing User Profile Management API...\n');

// Test credentials
const testCredentials = {
  mentor: { email: 'mentor@test.com', password: 'TestPass123!' },
  mentee: { email: 'mentee@test.com', password: 'TestPass456!' },
};

async function getAuthToken(role) {
  try {
    const response = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCredentials[role]),
    });

    const data = await response.json();
    return response.status === 200 ? data.token : null;
  } catch (error) {
    console.error(`Failed to get ${role} token:`, error.message);
    return null;
  }
}

async function testGetProfile(token, role) {
  console.log(`👤 Testing ${role} profile retrieval...`);

  try {
    const response = await fetch(`${BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    if (response.status === 200) {
      console.log(`✅ ${role} profile retrieved successfully`);
      console.log(`   Name: ${data.profile.name}`);
      console.log(`   Role: ${data.role}`);
      console.log(`   Image URL: ${data.profile.imageUrl}`);
      if (data.profile.skills) {
        console.log(`   Skills: ${data.profile.skills.join(', ')}`);
      }
      return data;
    } else {
      console.log(`❌ ${role} profile retrieval failed:`, data);
      return null;
    }
  } catch (error) {
    console.log(`❌ ${role} profile retrieval error:`, error.message);
    return null;
  }
}

async function testUpdateProfile(token, role, userId) {
  console.log(`✏️  Testing ${role} profile update...`);

  const updateData =
    role === 'mentor'
      ? {
          id: userId,
          name: `Updated ${role} Name`,
          role: role,
          bio: `Updated bio for ${role}. This is a comprehensive bio that describes the person's experience and interests.`,
          skills: ['React', 'Node.js', 'TypeScript', 'MongoDB'],
        }
      : {
          id: userId,
          name: `Updated ${role} Name`,
          role: role,
          bio: `Updated bio for ${role}. This is a comprehensive bio that describes the person's background and goals.`,
        };

  try {
    const response = await fetch(`${BASE_URL}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updateData),
    });

    const data = await response.json();

    if (response.status === 200) {
      console.log(`✅ ${role} profile updated successfully`);
      console.log(`   Updated name: ${data.profile.name}`);
      console.log(`   Updated bio: ${data.profile.bio.substring(0, 50)}...`);
      if (data.profile.skills) {
        console.log(`   Updated skills: ${data.profile.skills.join(', ')}`);
      }
      return true;
    } else {
      console.log(`❌ ${role} profile update failed:`, data);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${role} profile update error:`, error.message);
    return false;
  }
}

async function testLegacyUpdateProfile(token, role) {
  console.log(`🔄 Testing ${role} legacy profile update (/me)...`);

  const updateData = {
    name: `Legacy Updated ${role}`,
    bio: `Legacy update bio for ${role}`,
    techStack:
      role === 'mentor' ? ['JavaScript', 'Python', 'React'] : undefined,
  };

  try {
    const response = await fetch(`${BASE_URL}/users/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updateData),
    });

    const data = await response.json();

    if (response.status === 200) {
      console.log(`✅ ${role} legacy profile update successful`);
      console.log(`   Name: ${data.name}`);
      console.log(`   Bio: ${data.bio}`);
      if (data.techStack && data.techStack.length > 0) {
        console.log(`   Tech Stack: ${data.techStack.join(', ')}`);
      }
      return true;
    } else {
      console.log(`❌ ${role} legacy profile update failed:`, data);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${role} legacy profile update error:`, error.message);
    return false;
  }
}

async function testProfileImage(role, userId) {
  console.log(`🖼️  Testing ${role} profile image retrieval...`);

  try {
    const response = await fetch(`${BASE_URL}/users/images/${role}/${userId}`);

    if (response.status === 200) {
      const contentType = response.headers.get('content-type');
      console.log(`✅ ${role} profile image retrieved successfully`);
      console.log(`   Content-Type: ${contentType}`);
      console.log(
        `   Content-Length: ${
          response.headers.get('content-length') || 'unknown'
        }`
      );
      return true;
    } else {
      const data = await response.json();
      console.log(`❌ ${role} profile image retrieval failed:`, data);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${role} profile image retrieval error:`, error.message);
    return false;
  }
}

async function testInvalidProfileUpdates(token, role, userId) {
  console.log(`🚫 Testing ${role} invalid profile updates...`);

  const invalidCases = [
    {
      name: 'Wrong user ID',
      data: { id: 99999, name: 'Test', role: role },
      expectedStatus: 403,
    },
    {
      name: 'Invalid role',
      data: { id: userId, name: 'Test', role: 'admin' },
      expectedStatus: 400,
    },
    {
      name: 'Name too long',
      data: { id: userId, name: 'A'.repeat(101), role: role },
      expectedStatus: 400,
    },
    {
      name: 'Bio too long',
      data: { id: userId, name: 'Test', role: role, bio: 'A'.repeat(1001) },
      expectedStatus: 400,
    },
  ];

  if (role === 'mentor') {
    invalidCases.push({
      name: 'Too many skills',
      data: {
        id: userId,
        name: 'Test',
        role: role,
        skills: Array(25).fill('skill'),
      },
      expectedStatus: 400,
    });
  }

  for (const testCase of invalidCases) {
    try {
      const response = await fetch(`${BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(testCase.data),
      });

      if (response.status === testCase.expectedStatus) {
        console.log(
          `   ✅ ${testCase.name}: Correctly rejected (${response.status})`
        );
      } else {
        console.log(
          `   ❌ ${testCase.name}: Expected ${testCase.expectedStatus}, got ${response.status}`
        );
      }
    } catch (error) {
      console.log(`   ❌ ${testCase.name}: Request failed - ${error.message}`);
    }
  }
}

async function runProfileTests() {
  try {
    // Get authentication tokens
    console.log('🔐 Getting authentication tokens...');
    const mentorToken = await getAuthToken('mentor');
    const menteeToken = await getAuthToken('mentee');

    if (!mentorToken || !menteeToken) {
      console.log('❌ Failed to get authentication tokens');
      return;
    }

    console.log('✅ Authentication tokens obtained\n');

    // Test profile retrieval
    const mentorProfile = await testGetProfile(mentorToken, 'mentor');
    const menteeProfile = await testGetProfile(menteeToken, 'mentee');

    console.log('');

    if (mentorProfile && menteeProfile) {
      // Test profile updates
      await testUpdateProfile(mentorToken, 'mentor', mentorProfile.id);
      await testUpdateProfile(menteeToken, 'mentee', menteeProfile.id);

      console.log('');

      // Test legacy profile updates
      await testLegacyUpdateProfile(mentorToken, 'mentor');
      await testLegacyUpdateProfile(menteeToken, 'mentee');

      console.log('');

      // Test profile images
      await testProfileImage('mentor', mentorProfile.id);
      await testProfileImage('mentee', menteeProfile.id);

      console.log('');

      // Test invalid updates
      await testInvalidProfileUpdates(mentorToken, 'mentor', mentorProfile.id);
      await testInvalidProfileUpdates(menteeToken, 'mentee', menteeProfile.id);
    }

    console.log('\n🎉 User Profile Management API testing completed!');
  } catch (error) {
    console.error('Profile test runner error:', error);
  }
}

runProfileTests();
