import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8080/api';

console.log('🧪 Testing Authentication API Validation...\n');

async function testInvalidSignup() {
  console.log('📝 Testing invalid signup data...');

  const invalidCases = [
    {
      name: 'Invalid email',
      data: {
        email: 'invalid-email',
        password: 'Test123!',
        name: 'Test',
        role: 'mentor',
      },
      expectedStatus: 400,
    },
    {
      name: 'Short password',
      data: {
        email: 'test@test.com',
        password: '123',
        name: 'Test',
        role: 'mentor',
      },
      expectedStatus: 400,
    },
    {
      name: 'Empty name',
      data: {
        email: 'test@test.com',
        password: 'Test123!',
        name: '',
        role: 'mentor',
      },
      expectedStatus: 400,
    },
    {
      name: 'Invalid role',
      data: {
        email: 'test@test.com',
        password: 'Test123!',
        name: 'Test',
        role: 'admin',
      },
      expectedStatus: 400,
    },
    {
      name: 'Missing required field',
      data: { email: 'test@test.com', password: 'Test123!', name: 'Test' },
      expectedStatus: 400,
    },
  ];

  for (const testCase of invalidCases) {
    try {
      const response = await fetch(`${BASE_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase.data),
      });

      const data = await response.json();

      if (response.status === testCase.expectedStatus) {
        console.log(
          `   ✅ ${testCase.name}: Correctly rejected (${response.status})`
        );
        console.log(`      Error: ${data.error}`);
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

async function testInvalidLogin() {
  console.log('\n🔐 Testing invalid login data...');

  const invalidCases = [
    {
      name: 'Invalid email format',
      data: { email: 'invalid-email', password: 'password' },
      expectedStatus: 400,
    },
    {
      name: 'Empty password',
      data: { email: 'test@test.com', password: '' },
      expectedStatus: 400,
    },
    {
      name: 'Non-existent user',
      data: { email: 'nonexistent@test.com', password: 'Test123!' },
      expectedStatus: 401,
    },
    {
      name: 'Wrong password',
      data: { email: 'mentor@test.com', password: 'wrongpassword' },
      expectedStatus: 401,
    },
  ];

  for (const testCase of invalidCases) {
    try {
      const response = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase.data),
      });

      const data = await response.json();

      if (response.status === testCase.expectedStatus) {
        console.log(
          `   ✅ ${testCase.name}: Correctly rejected (${response.status})`
        );
        console.log(`      Error: ${data.error}`);
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

async function testInvalidTokenValidation() {
  console.log('\n🔍 Testing invalid token validation...');

  const invalidCases = [
    {
      name: 'No Authorization header',
      token: null,
      expectedStatus: 401,
    },
    {
      name: 'Invalid token format',
      token: 'invalid.token.here',
      expectedStatus: 401,
    },
    {
      name: 'Malformed Bearer token',
      token: 'NotBearerToken',
      expectedStatus: 401,
    },
  ];

  for (const testCase of invalidCases) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (testCase.token) {
        headers['Authorization'] = testCase.token.startsWith('Bearer ')
          ? testCase.token
          : `Bearer ${testCase.token}`;
      }

      const response = await fetch(`${BASE_URL}/validate`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (response.status === testCase.expectedStatus) {
        console.log(
          `   ✅ ${testCase.name}: Correctly rejected (${response.status})`
        );
        console.log(`      Error: ${data.error}`);
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

async function testDuplicateSignup() {
  console.log('\n👥 Testing duplicate user registration...');

  const userData = {
    email: 'duplicate@test.com',
    password: 'Test123!',
    name: 'Duplicate User',
    role: 'mentor',
  };

  try {
    // First signup
    console.log('   Creating first user...');
    const response1 = await fetch(`${BASE_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    const data1 = await response1.json();

    if (response1.status === 201) {
      console.log('   ✅ First user created successfully');
    } else if (
      response1.status === 400 &&
      data1.error === 'User already exists'
    ) {
      console.log('   ℹ️  User already exists from previous test');
    }

    // Second signup (should fail)
    console.log('   Attempting duplicate registration...');
    const response2 = await fetch(`${BASE_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    const data2 = await response2.json();

    if (response2.status === 400 && data2.error === 'User already exists') {
      console.log('   ✅ Duplicate registration correctly rejected');
    } else {
      console.log(
        `   ❌ Expected duplicate rejection, got ${response2.status}: ${data2.error}`
      );
    }
  } catch (error) {
    console.log(`   ❌ Duplicate signup test failed: ${error.message}`);
  }
}

async function runValidationTests() {
  try {
    await testInvalidSignup();
    await testInvalidLogin();
    await testInvalidTokenValidation();
    await testDuplicateSignup();

    console.log('\n🎉 Authentication API validation testing completed!');
  } catch (error) {
    console.error('Validation test runner error:', error);
  }
}

runValidationTests();
