# Security API Endpoints

This document defines the API endpoints required for security features.

## Base URL
`/api/security`

## Authentication
All endpoints require authentication via Supabase auth session.

## Two-Factor Authentication Endpoints

### POST /api/security/2fa/setup
Initialize 2FA setup for the current user.

**Request Body:**
```json
{
  "method": "totp" | "sms" | "hardware_key" | "biometric"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "secret": "JBSWY3DPEHPK3PXP", // TOTP secret (only for totp method)
  "qrCodeUrl": "otpauth://totp/...", // QR code URL for authenticator app
  "backupCodes": ["12345678", "87654321", ...] // Initial backup codes
}
```

### POST /api/security/2fa/verify
Verify 2FA code during setup or login.

**Request Body:**
```json
{
  "code": "123456",
  "method": "totp"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "verified": true
}
```

### POST /api/security/2fa/disable
Disable 2FA for the current user.

**Request Body:**
```json
{
  "password": "current_password" // Required for security
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

### GET /api/security/2fa/backup-codes
Get remaining backup codes.

**Response (200 OK):**
```json
{
  "success": true,
  "backupCodes": ["12345678", "87654321", ...],
  "remaining": 8
}
```

### POST /api/security/2fa/regenerate-codes
Regenerate backup codes.

**Response (200 OK):**
```json
{
  "success": true,
  "backupCodes": ["12345678", "87654321", ...]
}
```

## Session Management Endpoints

### GET /api/security/sessions
Get all active sessions for the current user.

**Response (200 OK):**
```json
{
  "success": true,
  "sessions": [
    {
      "id": "uuid",
      "deviceInfo": {
        "browser": "Chrome",
        "os": "macOS",
        "device": "Desktop"
      },
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2026-05-23T10:00:00Z",
      "lastActive": "2026-05-23T12:00:00Z",
      "expiresAt": "2026-05-24T10:00:00Z",
      "current": true
    }
  ]
}
```

### DELETE /api/security/sessions/:id
Revoke a specific session.

**Response (200 OK):**
```json
{
  "success": true
}
```

### DELETE /api/security/sessions/all
Revoke all sessions except the current one.

**Response (200 OK):**
```json
{
  "success": true,
  "revokedCount": 3
}
```

### POST /api/security/sessions/extend
Extend the current session timeout.

**Request Body:**
```json
{
  "hours": 24
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "newExpiresAt": "2026-05-24T12:00:00Z"
}
```

## Anti-Impersonation Endpoints

### POST /api/security/voice/verify
Initiate voice identity verification.

**Request Body:**
```json
{
  "challengePhrase": "My voice is my passport"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "verificationId": "uuid",
  "status": "pending"
}
```

### POST /api/security/voice/submit
Submit voice sample for verification.

**Request Body:**
```json
{
  "verificationId": "uuid",
  "audioData": "base64_encoded_audio"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "verified": true,
  "confidence": 0.95,
  "matchScore": 0.92
}
```

### POST /api/security/voice/liveness
Run liveness detection check.

**Request Body:**
```json
{
  "challenge": "Please say the numbers: 3, 7, 2, 9"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "livenessScore": 0.98,
  "passed": true
}
```

### GET /api/security/voice/status
Get voice authentication status.

**Response (200 OK):**
```json
{
  "success": true,
  "enabled": true,
  "lastVerified": "2026-05-23T10:00:00Z",
  "verificationCount": 15
}
```

## Linked Accounts Endpoints

### GET /api/security/linked-accounts
Get all linked accounts for the current user.

**Response (200 OK):**
```json
{
  "success": true,
  "linkedAccounts": [
    {
      "id": "uuid",
      "provider": "google",
      "email": "user@gmail.com",
      "verified": true,
      "linkedAt": "2026-05-23T10:00:00Z"
    }
  ]
}
```

### POST /api/security/linked-accounts/link
Link a new account (OAuth flow).

**Request Body:**
```json
{
  "provider": "google" | "apple" | "microsoft",
  "oauthCode": "authorization_code"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "linkedAccount": {
    "id": "uuid",
    "provider": "google",
    "email": "user@gmail.com",
    "verified": true
  }
}
```

### DELETE /api/security/linked-accounts/:id
Unlink a linked account.

**Response (200 OK):**
```json
{
  "success": true
}
```

### POST /api/security/linked-accounts/verify
Verify a linked account.

**Request Body:**
```json
{
  "accountId": "uuid",
  "verificationCode": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "verified": true
}
```

## Password Management Endpoints

### POST /api/security/password/change
Change user password.

**Request Body:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

### GET /api/security/password/strength
Check password strength.

**Request Body:**
```json
{
  "password": "candidate_password"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "strength": "strong" | "medium" | "weak",
  "score": 4,
  "requirements": {
    "length": true,
    "uppercase": true,
    "lowercase": true,
    "numbers": true,
    "specialChars": true
  }
}
```

## Cybersecurity Controls Endpoints

### GET /api/security/settings
Get security settings for the current user.

**Response (200 OK):**
```json
{
  "success": true,
  "settings": {
    "sessionTimeoutHours": 24,
    "inactivityTimeoutMinutes": 30,
    "maxConcurrentSessions": 5,
    "failedLoginAttemptsLimit": 5,
    "accountLockoutDurationMinutes": 15,
    "enableSecurityAlerts": true,
    "alertOnNewSignIn": true,
    "alertOnSuspiciousActivity": true,
    "alertOn2FAReminder": true,
    "alertOnSessionExpiration": false,
    "enableIPRestrictions": false,
    "trustedIPAddresses": [],
    "enableVoiceLivenessCheck": true
  }
}
```

### PUT /api/security/settings
Update security settings.

**Request Body:**
```json
{
  "sessionTimeoutHours": 24,
  "inactivityTimeoutMinutes": 30,
  "maxConcurrentSessions": 5,
  "failedLoginAttemptsLimit": 5,
  "accountLockoutDurationMinutes": 15,
  "enableSecurityAlerts": true,
  "alertOnNewSignIn": true,
  "alertOnSuspiciousActivity": true,
  "alertOn2FAReminder": true,
  "alertOnSessionExpiration": false,
  "enableIPRestrictions": false,
  "trustedIPAddresses": ["192.168.1.1", "10.0.0.1"],
  "enableVoiceLivenessCheck": true
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

### POST /api/security/alerts/configure
Configure security alert preferences.

**Request Body:**
```json
{
  "alertOnNewSignIn": true,
  "alertOnSuspiciousActivity": true,
  "alertOn2FAReminder": true,
  "alertOnSessionExpiration": false
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

### POST /api/security/lockout/configure
Configure account lockout settings.

**Request Body:**
```json
{
  "failedLoginAttemptsLimit": 5,
  "accountLockoutDurationMinutes": 15
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

### POST /api/security/ip-restrictions/configure
Configure IP restrictions.

**Request Body:**
```json
{
  "enableIPRestrictions": true,
  "trustedIPAddresses": ["192.168.1.1", "10.0.0.1"]
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

## Security Events Endpoints

### GET /api/security/events
Get security event log for the current user.

**Query Parameters:**
- `limit`: Number of events to return (default: 50)
- `offset`: Offset for pagination (default: 0)
- `eventType`: Filter by event type (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "events": [
    {
      "id": "uuid",
      "eventType": "login",
      "eventData": {},
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2026-05-23T10:00:00Z"
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

## Error Responses

All endpoints may return error responses:

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Invalid request body",
  "code": "INVALID_REQUEST"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": "Insufficient permissions",
  "code": "FORBIDDEN"
}
```

**429 Too Many Requests:**
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Internal server error",
  "code": "INTERNAL_ERROR"
}
```
