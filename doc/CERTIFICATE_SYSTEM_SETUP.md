# Certificate System Setup Guide

## Overview
The certificate issuance system provides secure, shareable certificates with token-based verification.

## Environment Variables
Add to your `.env.local`:

```bash
# Secret key for signing certificate tokens (REQUIRED)
# Generate with: openssl rand -base64 32
CERTIFICATE_SECRET=your-secret-key-here

# Optional: Base URL for certificate links (defaults to http://localhost:3000)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

Generate a secure secret:
```bash
openssl rand -base64 32
```

## API Endpoints

### Issue Certificate
```
POST /api/certificates/issue
Authorization: Bearer {token}
Content-Type: application/json

{
  "certificateId": "cert_123",
  "studentId": "student_456"
}

Response:
{
  "id": "issue_789",
  "certificateId": "cert_123",
  "studentId": "student_456",
  "certificateUrl": "/certificates/view/base64_encoded_token",
  "issuedAt": "2026-03-25T12:00:00Z",
  "issuedBy": "teacher_001",
  "certificate": { ... },
  "student": { ... },
  "issuer": { ... }
}
```

### Verify Certificate (Public)
```
GET /api/certificates/verify/{token}

Response:
{
  "success": true,
  "data": {
    "certificate": {
      "id": "cert_123",
      "name": "Certificate of Completion",
      "description": "..."
    },
    "student": {
      "id": "student_456",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@school.edu",
      "gradeLevel": "10"
    },
    "school": {
      "id": "school_xyz",
      "name": "Lincoln High School"
    },
    "verified": true
  }
}
```

### View Certificate as HTML (Public)
```
GET /api/certificates/view/{token}

Returns: HTML certificate with styling
Content-Type: text/html
```

## List Certificates
```
GET /api/certificates/issue?studentId=student_456&certificateId=cert_123
Authorization: Bearer {token}

Response: Array of issued certificates
```

## Usage in Your Application

### Issuing a Certificate (Backend)
```typescript
const response = await fetch('/api/certificates/issue', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    certificateId: 'cert_123',
    studentId: 'student_456'
  })
});

const certificate = await response.json();
console.log('Certificate URL:', certificate.certificateUrl);
```

### Viewing a Certificate (Frontend)
```typescript
// Redirect to certificate viewing page
window.location.href = certificateUrl; // e.g., /certificates/view/base64_token

// Or embed in iframe
<iframe src={certificateUrl} width="100%" height="800"></iframe>

// Or fetch certificate data
const response = await fetch(`/api/certificates/verify/${token}`);
const data = await response.json();
```

### Sharing Certificate (Public Link)
```typescript
const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/certificates/view/${token}`;
// Share this URL publicly - no authentication needed
```

## Security Features

### Token Structure
- Format: `base64(certificateId:studentId:schoolId:timestamp:signature)`
- Signature: HMAC-SHA256
- Expiration: 365 days (configurable)

### Verification
- Signature validated against secret key
- Timestamp checked for expiration
- School context verified (certificateId.schoolId == token.schoolId)
- Student school isolation enforced

### Best Practices
1. Use strong CERTIFICATE_SECRET (32+ characters)
2. Rotate secret key annually (invalidates old links)
3. Don't expose CERTIFICATE_SECRET in frontend code
4. Audit certificate issuances via AuditLog table
5. Monitor for unusual certificate request patterns

## Troubleshooting

### "Invalid or expired certificate token"
- Verify CERTIFICATE_SECRET hasn't changed
- Check if token is > 365 days old
- Ensure token wasn't tampered with (base64 encoding corrupted)

### Certificate shows but data is wrong
- Verify student and certificate exist in database
- Check school isolation: student.schoolId == certificate.schoolId
- Review AuditLog for issuance records

### URL not working in email
- Ensure NEXT_PUBLIC_APP_URL is set correctly
- Verify certificate token includes domain
- Test link in incognito/private mode

## Testing

```bash
# Generate test certificate using API
curl -X POST http://localhost:3000/api/certificates/issue \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"certificateId":"test_cert","studentId":"test_student"}'

# Verify certificate
curl http://localhost:3000/api/certificates/verify/$(base64_token)

# View certificate HTML
curl http://localhost:3000/api/certificates/view/$(base64_token)
```

## Database Models

Certificate system uses these models:
- `Certificate` - Certificate definitions
- `CertificateIssue` - Issued certificates to students
- `User` - Student and teacher data
- `StudentProfile` - Student details

Ensure your schema includes these models with proper relationships.
