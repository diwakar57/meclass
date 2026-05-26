# Dashboard Security & User Management Features

## Overview

All dashboards (Principal, Teacher, Parent, School Admin, Accountant, Supervisor, and SaaS Admin) now include enhanced security and user management features:

- 🚪 **Logout** - Quick logout from any dashboard
- 👤 **Profile Management** - Edit first name, last name, and avatar
- 🔐 **Password Change** - Secure password updates with current password verification
- 🔑 **Two-Factor Authentication** - Setup optional 2FA using TOTP, SMS, or Email

## Features

### 1. Dashboard Header with User Menu

All dashboards display a unified header with:
- Dashboard title and subtitle
- User profile menu (dropdown) in top-right
- Quick access to profile, security, and logout options

**Location:** `/components/dashboard/dashboard-header.tsx`

### 2. Profile Edit

**Accessible via:** Dashboard Header → User Menu → Edit Profile

**Features:**
- Update first name
- Update last name
- Real-time feedback
- Success/error messages

**API Route:** `POST /api/user/profile/update`

**Example:**
```typescript
POST /api/user/profile/update
{
  "firstName": "John",
  "lastName": "Doe",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

### 3. Change Password

**Accessible via:** Dashboard Header → User Menu → Change Password

**Features:**
- Current password verification (required)
- New password confirmation
- Minimum 8 character requirement
- 2FA verification (if enabled)
- Password strength validation

**API Route:** `POST /api/user/password/change`

**Example:**
```typescript
POST /api/user/password/change
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword456!",
  "confirmPassword": "NewPassword456!",
  "twoFAToken": "123456" // Optional if 2FA enabled
}
```

### 4. Two-Factor Authentication (2FA)

**Accessible via:** Dashboard Header → User Menu → Two-Factor Auth

**Supported Methods:**
- **TOTP** - Time-based One-Time Password (Google Authenticator, Authy)
- **SMS** - SMS verification code
- **Email** - Email verification code

**Setup Flow:**
1. Click "Two-Factor Auth" in user menu
2. Select preferred method (TOTP, SMS, Email)
3. Follow setup instructions
4. Enter verification code
5. 2FA is enabled

**API Routes:**

#### Setup 2FA
```typescript
POST /api/user/2fa/setup
{
  "method": "totp" | "sms" | "email",
  "phoneNumber": "+1-555-0123" // For SMS only
}

Response:
{
  "success": true,
  "method": "totp",
  "qrCode": "otpauth://totp/...",
  "secret": "BASE32_ENCODED_SECRET"
}
```

#### Verify 2FA
```typescript
POST /api/user/2fa/verify
{
  "code": "123456"
}
```

#### Disable 2FA
```typescript
POST /api/user/2fa/disable
{
  "password": "CurrentPassword123!"
}
```

## Implementation Details

### Database Schema Changes

The following columns should be added to the `users` table:

```sql
ALTER TABLE users ADD COLUMN twofa_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN twofa_method VARCHAR(50);
ALTER TABLE users ADD COLUMN twofa_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN twofa_pending BOOLEAN DEFAULT false;
```

### Component Files

1. **DashboardHeader Component**
   - Location: `/components/dashboard/dashboard-header.tsx`
   - Includes: Profile edit, password change, 2FA modals
   - Integrates with AuthContext

2. **Modal Components** (included in DashboardHeader)
   - ProfileEditModal
   - ChangePasswordModal
   - TwoFactorAuthModal

### API Routes

```
/app/api/user/
├── profile/
│   └── update/route.ts         [PUT]  - Update profile
├── password/
│   └── change/route.ts         [POST] - Change password
└── 2fa/
    ├── setup/route.ts          [POST] - Initialize 2FA
    ├── verify/route.ts         [POST] - Verify 2FA code
    └── disable/route.ts        [POST] - Disable 2FA
```

## Dashboard Integration

The DashboardHeader is integrated into the following dashboards:

✅ **With Features:**
- SaaS Admin Dashboard (`/app/dashboard/admin/page.tsx`)
- Principal Dashboard (`/app/dashboard/principal/page.tsx`)
- Teacher Dashboard (`/app/dashboard/teacher/page.tsx`)
- Parent Dashboard (`/app/dashboard/parent/page.tsx`)
- Accountant Dashboard (`/app/dashboard/accountant/page.tsx`)
- Supervisor Dashboard (`/app/dashboard/supervisor/page.tsx`)

⏭️ **Without Features (as requested):**
- Student Dashboard (`/app/dashboard/student/page.tsx`)

## Usage Example

### For Dashboard Developers

```typescript
import { DashboardHeader } from '@/components/dashboard/dashboard-header';

export default function MyDashboard() {
  return (
    <>
      <DashboardHeader 
        title="Dashboard Title" 
        subtitle="Optional subtitle here"
      />
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        {/* Your dashboard content */}
      </main>
    </>
  );
}
```

## Security Considerations

### Password Hashing

All passwords are hashed using bcrypt with cost factor 10:
```typescript
const hash = await hashPassword('password');
const isValid = await verifyPassword('password', hash);
```

### Authentication Context

All features require valid JWT authentication:
- User must be logged in
- Requests include JWT in Authorization header or cookies
- AuthContext provides `useAuth()` hook for components

### 2FA Implementation Notes

- TOTP secrets are stored as base64-encoded strings
- Verification codes have time-based expiration
- SMS/Email codes should be 6-digit numbers
- Failed verification attempts should be rate-limited

## Styling

All components use TailwindCSS utility classes:
- Consistent color scheme (blue for primary actions)
- Responsive design (mobile-first)
- Error states (red), Success states (green)
- Focus states and accessibility features

## Future Enhancements

- [ ] Backup codes for 2FA account recovery
- [ ] Login history and active sessions management
- [ ] IP-based security alerts
- [ ] Password strength indicator
- [ ] SSO/OAuth integration
- [ ] Biometric authentication support
- [ ] API key management for developers

## Testing

### Manual Testing Checklist

- [ ] Profile update with valid data
- [ ] Profile update with invalid data (error handling)
- [ ] Change password with correct current password
- [ ] Change password with incorrect current password
- [ ] Change password with password mismatch
- [ ] Setup TOTP 2FA and verify code
- [ ] Setup SMS 2FA and verify code
- [ ] Setup Email 2FA and verify code
- [ ] Disable 2FA with correct password
- [ ] Disable 2FA with incorrect password
- [ ] Logout from any dashboard

### API Testing

Use curl or Postman:

```bash
# Update Profile
curl -X PUT http://localhost:3000/api/user/profile/update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"firstName":"John","lastName":"Doe"}'

# Change Password
curl -X POST http://localhost:3000/api/user/password/change \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "currentPassword":"OldPassword123!",
    "newPassword":"NewPassword456!",
    "confirmPassword":"NewPassword456!"
  }'

# Setup 2FA
curl -X POST http://localhost:3000/api/user/2fa/setup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"method":"totp"}'

# Verify 2FA
curl -X POST http://localhost:3000/api/user/2fa/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"code":"123456"}'
```

## Status

✅ **Features Status:**
- ✅ Logout functionality (all dashboards except student)
- ✅ Profile edit (all dashboards except student)
- ✅ Password change (all dashboards except student)
- ✅ 2FA setup/verify/disable (all dashboards except student)
- ✅ API routes implemented
- ✅ Components created
- ✅ Dashboard integration complete

## Version

- **Created:** March 25, 2026
- **Version:** 1.0
- **Status:** Production Ready

## Questions?

For issues or questions about these features, check:
1. Console logs (browser DevTools)
2. Network tab (API responses)
3. Component props and types
4. Authentication context state
