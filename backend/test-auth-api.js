import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8080/api';

console.log('🧪 Testing Authentication API...\n');

// Test data
const testMentor = {
  email: 'mentor@test.com',
  password: 'TestPass123!',
  name: 'Test Mentor',
  role: 'mentor',
};

const testMentee = {
  email: 'mentee@test.com',
  password: 'TestPass456!',
  name: 'Test Mentee',
  role: 'mentee',
};

async function testSignup(userData, testName) {
  console.log(`📝 Testing ${testName} signup...`);

  try {
    const response = await fetch(`${BASE_URL}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (response.status === 201) {
      console.log(`✅ ${testName} signup successful:`, data.message);
      return true;
    } else if (
      response.status === 400 &&
      data.error === 'User already exists'
    ) {
      console.log(`ℹ️  ${testName} already exists, skipping signup`);
      return true;
    } else {
      console.log(`❌ ${testName} signup failed:`, data);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${testName} signup error:`, error.message);
    return false;
  }
}

async function testLogin(credentials, testName) {
  console.log(`🔐 Testing ${testName} login...`);

  try {
    const response = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    });

    const data = await response.json();

    if (response.status === 200) {
      console.log(`✅ ${testName} login successful`);
      console.log(`   User: ${data.user.name} (${data.user.role})`);
      console.log(`   Token: ${data.token.substring(0, 30)}...`);
      return data.token;
    } else {
      console.log(`❌ ${testName} login failed:`, data);
      return null;
    }
  } catch (error) {
    console.log(`❌ ${testName} login error:`, error.message);
    return null;
  }
}

async function testTokenValidation(token, testName) {
  console.log(`🔍 Testing ${testName} token validation...`);

  try {
    const response = await fetch(`${BASE_URL}/validate`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.status === 200) {
      console.log(`✅ ${testName} token validation successful`);
      console.log(`   Expires: ${data.expiresAt}`);
      return true;
    } else {
      console.log(`❌ ${testName} token validation failed:`, data);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${testName} token validation error:`, error.message);
    return false;
  }
}

async function testPasswordStrength() {
  console.log(`🔒 Testing password strength checker...`);

  const passwords = [
    { password: '123', expected: 'weak' },
    { password: 'password', expected: 'weak' },
    { password: 'Password123', expected: 'strong' },
    { password: 'MySecureP@ss123!', expected: 'strong' },
  ];

  for (const { password, expected } of passwords) {
    try {
      const response = await fetch(`${BASE_URL}/check-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();
      const status = data.strength === expected ? '✅' : '❌';
      console.log(
        `   ${status} "${password}" -> ${data.strength} (expected: ${expected})`
      );
    } catch (error) {
      console.log(`   ❌ Error testing password: ${password}`);
    }
  }
}

async function runTests() {
  try {
    // Test signups
    const mentorSignupOk = await testSignup(testMentor, 'Mentor');
    const menteeSignupOk = await testSignup(testMentee, 'Mentee');

    console.log('');

    if (mentorSignupOk && menteeSignupOk) {
      // Test logins
      const mentorToken = await testLogin(testMentor, 'Mentor');
      const menteeToken = await testLogin(testMentee, 'Mentee');

      console.log('');

      // Test token validation
      if (mentorToken) await testTokenValidation(mentorToken, 'Mentor');
      if (menteeToken) await testTokenValidation(menteeToken, 'Mentee');

      console.log('');

      // Test password strength
      await testPasswordStrength();
    }

    console.log('\n🎉 Authentication API testing completed!');
  } catch (error) {
    console.error('Test runner error:', error);
  }
}

runTests();
