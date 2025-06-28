import {
  generateToken,
  validateToken,
  getUserFromToken,
} from './src/middleware/auth.js';

// Test JWT token generation and validation
console.log('Testing JWT authentication middleware...\n');

// Test user object
const testUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  role: 'mentor',
};

console.log('1. Testing token generation...');
const token = generateToken(testUser);
console.log('Generated token:', token.substring(0, 50) + '...');

console.log('\n2. Testing token validation...');
const decoded = validateToken(token);
if (decoded) {
  console.log('✅ Token validation successful');
  console.log('Token payload:', {
    iss: decoded.iss,
    sub: decoded.sub,
    aud: decoded.aud,
    exp: new Date(decoded.exp * 1000).toISOString(),
    iat: new Date(decoded.iat * 1000).toISOString(),
    name: decoded.name,
    email: decoded.email,
    role: decoded.role,
  });
} else {
  console.log('❌ Token validation failed');
}

console.log('\n3. Testing token expiration...');
const now = Math.floor(Date.now() / 1000);
const timeUntilExpiry = decoded.exp - now;
console.log(
  `Token expires in ${timeUntilExpiry} seconds (${Math.round(
    timeUntilExpiry / 60
  )} minutes)`
);

console.log('\n4. Testing invalid token...');
const invalidToken = validateToken('invalid.token.here');
console.log(
  'Invalid token result:',
  invalidToken ? '❌ Should be null' : '✅ Correctly null'
);

console.log('\n✅ JWT authentication middleware test completed!');
