import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8080/api';

console.log('🧪 Testing Profile Image Upload...\n');

// Simple base64 encoded 1x1 pixel PNG image for testing
const testImageBase64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAHGw+sAGwAAAABJRU5ErkJggg==';

async function getAuthToken() {
  try {
    const response = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'mentor@test.com',
        password: 'TestPass123!',
      }),
    });

    const data = await response.json();
    return response.status === 200 ? data.token : null;
  } catch (error) {
    console.error('Failed to get token:', error.message);
    return null;
  }
}

async function testImageUpload(token) {
  console.log('📤 Testing profile image upload...');

  try {
    const updateData = {
      id: 1, // Mentor ID
      name: 'Test Mentor with Image',
      role: 'mentor',
      bio: 'Testing image upload functionality',
      image: testImageBase64,
      skills: ['React', 'Node.js'],
    };

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
      console.log('✅ Profile image upload successful');
      console.log(
        `   Updated profile with image URL: ${data.profile.imageUrl}`
      );
      return true;
    } else {
      console.log('❌ Profile image upload failed:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ Profile image upload error:', error.message);
    return false;
  }
}

async function testInvalidImageUpload(token) {
  console.log('🚫 Testing invalid image upload...');

  const invalidCases = [
    {
      name: 'Invalid base64 format',
      image: 'invalid-base64-string',
    },
    {
      name: 'Unsupported image type',
      image: 'data:image/bmp;base64,Qk1oAAAAAAAAA',
    },
    {
      name: 'Missing image header',
      image: testImageBase64.replace('data:image/png;base64,', ''),
    },
  ];

  for (const testCase of invalidCases) {
    try {
      const updateData = {
        id: 1,
        name: 'Test',
        role: 'mentor',
        image: testCase.image,
      };

      const response = await fetch(`${BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (response.status === 400) {
        console.log(`   ✅ ${testCase.name}: Correctly rejected`);
      } else {
        console.log(
          `   ❌ ${testCase.name}: Expected rejection, got ${response.status}`
        );
      }
    } catch (error) {
      console.log(`   ❌ ${testCase.name}: Request failed - ${error.message}`);
    }
  }
}

async function testImageRetrieval() {
  console.log('🖼️  Testing uploaded image retrieval...');

  try {
    const response = await fetch(`${BASE_URL}/users/images/mentor/1`);

    if (response.status === 200) {
      const contentType = response.headers.get('content-type');
      console.log('✅ Uploaded image retrieved successfully');
      console.log(`   Content-Type: ${contentType}`);

      // Check if it's the uploaded image or default SVG
      if (contentType.includes('image/png')) {
        console.log('   📸 Custom uploaded image found');
      } else if (contentType.includes('image/svg')) {
        console.log('   🎨 Default SVG avatar served');
      }

      return true;
    } else {
      console.log('❌ Image retrieval failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Image retrieval error:', error.message);
    return false;
  }
}

async function runImageTests() {
  try {
    // Get authentication token
    console.log('🔐 Getting authentication token...');
    const token = await getAuthToken();

    if (!token) {
      console.log('❌ Failed to get authentication token');
      return;
    }

    console.log('✅ Authentication token obtained\n');

    // Test image upload
    const uploadSuccess = await testImageUpload(token);
    console.log('');

    // Test invalid image uploads
    await testInvalidImageUpload(token);
    console.log('');

    // Test image retrieval
    if (uploadSuccess) {
      await testImageRetrieval();
    }

    console.log('\n🎉 Profile Image Upload testing completed!');
  } catch (error) {
    console.error('Image test runner error:', error);
  }
}

runImageTests();
