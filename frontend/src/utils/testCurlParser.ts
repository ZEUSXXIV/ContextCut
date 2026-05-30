import { parseCurl } from './curlParser';

const testCurl = `curl -X POST "https://api.stripe.com/v1/customers?source=card" \\
  -H "Authorization: Bearer sk_test_12345" \\
  -H "Content-Type: application/json" \\
  -d '{"email": "test@user.com", "balance": 500, "is_active": true}'`;

const result = parseCurl(testCurl);
console.log('Parsed result:', JSON.stringify(result, null, 2));

if (result && result.baseUrl === 'https://api.stripe.com') {
  console.log('SUCCESS: cURL parser parses correctly!');
} else {
  console.log('FAILURE: cURL parser failed parsing!');
}
