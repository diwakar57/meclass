# API Key Management Documentation

## Overview

The API Key Management system provides secure, school-specific API access for integrations. Each school can generate and manage multiple API keys with granular permission controls.

## Key Features

- **Per-School Isolation**: Each API key is scoped to a specific school
- **Granular Permissions**: Fine-grained control over what each key can access
- **Key Rotation**: Safely rotate keys without downtime
- **Audit Logging**: Track all API key usage and management actions
- **Revocation**: Immediately disable compromised keys
- **Rate Limiting**: Prevent abuse of API endpoints

## Setup

### Generate API Keys

1. Go to Principal Dashboard → API Keys
2. Click "+ New API Key"
3. Enter a name (e.g., "Mobile App Integration")
4. Select required permissions
5. Click "Create API Key"
6. **Save the key immediately** - it won't be shown again

### API Key Format

```
sk_<random_32_bytes_hex>
```

Example: `sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t`

### Permission Types

| Permission | Description |
|-----------|-------------|
| `read:lessons` | Read lesson data and history |
| `write:lessons` | Create and modify lessons |
| `read:students` | Read student profiles and progress |
| `write:students` | Modify student data |
| `read:progress` | View student progress and mastery |
| `read:billing` | View billing and payment information |
| `write:billing` | Record payments and manage billing |

## API Authentication

### Using API Keys

Include your API key in the `Authorization` header:

```bash
curl https://api.aischool.com/v1/lessons \
  -H "Authorization: Bearer sk_your_api_key_here"
```

### Example Request

```bash
curl -X GET https://api.aischool.com/v1/students \
  -H "Authorization: Bearer sk_abc123def456" \
  -H "Content-Type: application/json"
```

### Example Responses

**Success (200)**:
```json
{
  "status": "success",
  "data": [
    {
      "id": "st_123",
      "name": "John Doe",
      "grade": "Grade 5"
    }
  ]
}
```

**Unauthorized (401)**:
```json
{
  "error": "Invalid API key",
  "code": "INVALID_API_KEY"
}
```

**Forbidden (403)**:
```json
{
  "error": "Insufficient permissions",
  "code": "INSUFFICIENT_PERMISSIONS",
  "required": ["write:students"]
}
```

## API Endpoints

### Lesson Endpoints

#### Get All Lessons

```
GET /api/v1/lessons
Required Permission: read:lessons

Query Parameters:
  - studentId: string (optional)
  - topicId: string (optional)
  - status: string (optional) - pending, completed, failed

Response:
{
  "lessons": [
    {
      "id": "les_123",
      "studentId": "st_456",
      "topicId": "top_789",
      "title": "Algebra Basics",
      "createdAt": "2026-03-22T10:30:00Z",
      "status": "completed"
    }
  ]
}
```

#### Create Lesson

```
POST /api/v1/lessons
Required Permission: write:lessons

Body:
{
  "studentId": "st_456",
  "topicId": "top_789",
  "difficulty": 5
}

Response:
{
  "id": "les_999",
  "studentId": "st_456",
  "topicId": "top_789",
  "difficulty": 5,
  "createdAt": "2026-03-22T10:30:00Z"
}
```

### Student Endpoints

#### Get All Students

```
GET /api/v1/students
Required Permission: read:students

Query Parameters:
  - grade: string (optional)
  - limit: number (optional, default 20, max 100)
  - offset: number (optional, default 0)

Response:
{
  "students": [
    {
      "id": "st_123",
      "name": "John Doe",
      "email": "john@example.com",
      "grade": "Grade 5",
      "masteryScore": 75
    }
  ],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

#### Update Student

```
PUT /api/v1/students/{studentId}
Required Permission: write:students

Body:
{
  "grade": "Grade 6",
  "interests": ["math", "science"]
}

Response:
{
  "id": "st_123",
  "name": "John Doe",
  "grade": "Grade 6"
}
```

### Progress Endpoints

#### Get Student Progress

```
GET /api/v1/students/{studentId}/progress
Required Permission: read:progress

Response:
{
  "masteryByTopic": {
    "Algebra": 85,
    "Geometry": 72
  },
  "completedTopics": 8,
  "totalTopics": 12,
  "quizHistory": [
    {
      "topicId": "top_123",
      "score": 85,
      "timestamp": "2026-03-22T10:30:00Z"
    }
  ]
}
```

### Billing Endpoints

#### Get Billing Summary

```
GET /api/v1/billing
Required Permission: read:billing

Response:
{
  "plan": "professional",
  "monthlyPrice": 299,
  "studentLimit": 500,
  "status": "active",
  "renewalDate": "2026-04-22T00:00:00Z"
}
```

#### Record Payment

```
POST /api/v1/billing/payments
Required Permission: write:billing

Body:
{
  "studentId": "st_456",
  "amount": 500,
  "feeType": "tuition"
}

Response:
{
  "paymentId": "pay_123",
  "studentId": "st_456",
  "amount": 500,
  "timestamp": "2026-03-22T10:30:00Z"
}
```

## API Key Management

### Create API Key

```
POST /api/school/api-keys
Headers: Authorization: Bearer {user_token}

Body:
{
  "name": "Mobile App",
  "permissions": ["read:students", "read:lessons"]
}

Response:
{
  "key": "sk_abc123def456..."
}
```

### List API Keys

```
GET /api/school/api-keys
Headers: Authorization: Bearer {user_token}

Response:
{
  "apiKeys": [
    {
      "id": "key_123",
      "name": "Mobile App",
      "maskedKey": "sk_abc...456",
      "createdAt": "2026-03-20T00:00:00Z",
      "isActive": true,
      "permissions": ["read:students", "read:lessons"]
    }
  ]
}
```

### Rotate API Key

```
POST /api/school/api-keys/{keyId}/rotate
Headers: Authorization: Bearer {user_token}

Response:
{
  "newKey": "sk_xyz789uvw123..."
}
```

### Revoke API Key

```
DELETE /api/school/api-keys/{keyId}
Headers: Authorization: Bearer {user_token}

Response:
{
  "message": "API key revoked successfully"
}
```

### Get Audit Log

```
GET /api/school/api-keys/audit-log
Headers: Authorization: Bearer {user_token}

Response:
{
  "logs": [
    {
      "action": "API_KEY_CREATED",
      "timestamp": "2026-03-22T10:30:00Z",
      "keyName": "Mobile App",
      "status": "success"
    },
    {
      "action": "API_KEY_ROTATED",
      "timestamp": "2026-03-21T15:45:00Z",
      "keyName": "Mobile App",
      "status": "success"
    }
  ]
}
```

## SDKs & Client Libraries

### JavaScript/Node.js

```javascript
import AiSchoolAPI from '@aischool/sdk';

const client = new AiSchoolAPI({
  apiKey: 'sk_your_api_key',
  baseURL: 'https://api.aischool.com/v1',
});

// Get students
const students = await client.students.list();

// Create lesson
const lesson = await client.lessons.create({
  studentId: 'st_123',
  topicId: 'top_456',
  difficulty: 5,
});
```

### Python

```python
from aischool import AiSchoolAPI

client = AiSchoolAPI(api_key='sk_your_api_key')

# Get students
students = client.students.list()

# Create lesson
lesson = client.lessons.create(
    student_id='st_123',
    topic_id='top_456',
    difficulty=5
)
```

### cURL

```bash
#!/bin/bash

API_KEY="sk_your_api_key"
API_URL="https://api.aischool.com/v1"

# List students
curl -X GET "$API_URL/students" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json"

# Create lesson
curl -X POST "$API_URL/lessons" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "st_123",
    "topicId": "top_456",
    "difficulty": 5
  }'
```

## Security Best Practices

### Keep Your API Key Secure

1. **Never commit to version control**:
   ```bash
   # .gitignore
   .env
   .env.local
   ```

2. **Use environment variables**:
   ```javascript
   const API_KEY = process.env.AISCHOOL_API_KEY;
   ```

3. **Don't expose in frontend code**:
   ```javascript
   // ❌ WRONG - Never do this
   const client = new AiSchoolAPI({ apiKey: 'sk_...' });

   // ✅ CORRECT - Use backend-to-backend calls
   ```

4. **Rotate keys regularly**:
   - Rotate every 90 days
   - Immediately rotate if compromised
   - Test new key before deactivating old one

5. **Use least privilege**:
   - Only grant permissions actually needed
   - Create separate keys for different use cases

6. **Monitor usage**:
   - Check audit log regularly
   - Set up alerts for unusual activity
   - Review key access patterns

### IP Whitelisting

```
POST /api/school/api-keys/{keyId}/ip-whitelist
Body: {
  "ipAddresses": ["192.168.1.1", "10.0.0.0/8"]
}
```

## Rate Limiting

API requests are rate-limited per key:

- **Standard**: 100 requests per minute
- **Burst**: Up to 500 requests per minute (averaged)
- **Webhook**: Unlimited (for webhook delivery)

Response headers indicate remaining quota:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1648227000
```

When rate limit exceeded:

```
HTTP 429 Too Many Requests

{
  "error": "Rate limit exceeded",
  "retryAfter": 30
}
```

## Error Handling

### Common Errors

| Code | Status | Solution |
|------|--------|----------|
| `INVALID_API_KEY` | 401 | Check your API key is correct |
| `EXPIRED_API_KEY` | 401 | Key may be revoked - generate new key |
| `INSUFFICIENT_PERMISSIONS` | 403 | Key lacks required permission |
| `SCHOOL_NOT_FOUND` | 404 | School data is missing |
| `STUDENT_NOT_FOUND` | 404 | Student ID is invalid |
| `RATE_LIMIT_EXCEEDED` | 429 | Wait before retrying |
| `INTERNAL_ERROR` | 500 | Contact support |

### Retry Logic

```javascript
async function apiCallWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) {
        const retryAfter = parseInt(error.headers['retry-after'] || '60');
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      } else if (error.status >= 500 && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      } else {
        throw error;
      }
    }
  }
}
```

## Audit Logging

All API key actions are logged:

```sql
SELECT * FROM audit_logs 
WHERE entity_type = 'api_key'
ORDER BY timestamp DESC;
```

Logged events:
- `API_KEY_CREATED` - New key created
- `API_KEY_ROTATED` - Key rotated
- `API_KEY_REVOKED` - Key disabled
- `API_KEY_USED_SUCCESS` - Successful API call
- `API_KEY_USED_FAILURE` - Failed API call

## Troubleshooting

### API Key Not Working

1. Check key format: Should start with `sk_`
2. Verify it's not revoked: Check in dashboard
3. Check permissions: Ensure key has required permission
4. Check school binding: Key must belong to correct school

### Permission Denied

```
Error: Insufficient permissions
Required: ['write:students']
```

Solution: Add the required permission to your API key

1. Go to Principal Dashboard → API Keys
2. Find your key
3. Click "Rotate" to regenerate with new permissions
4. Add missing permissions

### Rate Limit Exceeded

Solution: Implement exponential backoff

```javascript
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let backoff = 1000;
for (let attempt = 0; attempt < 5; attempt++) {
  try {
    return await makeApiCall();
  } catch (error) {
    if (error.status === 429) {
      await sleep(backoff);
      backoff *= 2;
    }
  }
}
```

## Testing

### Test API Keys

Use test mode API keys that don't affect production data:

```bash
# Generate test key
curl -X POST http://localhost:3000/api/school/api-keys \
  -H "Authorization: Bearer {test_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Integration",
    "permissions": ["read:students"]
  }'
```

### Mock Responses

For development without real API:

```javascript
// Use mock adapter
import { mockAdapter } from '@aischool/sdk/test';

const client = new AiSchoolAPI({
  adapter: mockAdapter,
});
```

## Support

Having issues? Check:
1. API status page: https://status.aischool.com
2. Error logs in dashboard
3. Documentation: https://docs.aischool.com
4. Contact support: support@aischool.com

## Roadmap

Planned features:
- [ ] IP whitelisting per key
- [ ] Custom rate limits
- [ ] Webhook signatures
- [ ] OAuth 2.0 support
- [ ] GraphQL API
- [ ] gRPC support
