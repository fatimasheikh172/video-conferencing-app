# 🧪 Authentication System Testing Guide

## Complete Testing Checklist

### ✅ Backend Testing

#### 1. User Registration
```bash
# Test successful registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "avatar": "https://i.pravatar.cc/150?img=1"
  }'

# Expected Response:
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "https://i.pravatar.cc/150?img=1",
    "isEmailVerified": false
  }
}

# Test weak password (should fail)
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "weak"
  }'

# Expected Response:
{
  "success": false,
  "message": "Password does not meet requirements",
  "errors": [...]
}

# Test duplicate email (should fail)
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'

# Expected Response:
{
  "success": false,
  "message": "User already exists with this email"
}
```

#### 2. User Login
```bash
# Test successful login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!",
    "rememberMe": true
  }'

# Expected Response:
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {...}
}

# Test wrong password (should fail)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "WrongPassword123!"
  }'

# Expected Response:
{
  "success": false,
  "message": "Invalid credentials"
}

# Test account lockout (try 6 times with wrong password)
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "john@example.com",
      "password": "WrongPassword123!"
    }'
  echo "\nAttempt $i"
done

# After 5 attempts, should get:
{
  "success": false,
  "message": "Account is temporarily locked due to multiple failed login attempts..."
}
```

#### 3. Token Refresh
```bash
# Test token refresh
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN_HERE"
  }'

# Expected Response:
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

#### 4. Get Current User
```bash
# Test getting current user
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"

# Expected Response:
{
  "success": true,
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "...",
    "isEmailVerified": false
  }
}
```

#### 5. Forgot Password
```bash
# Test forgot password
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com"
  }'

# Expected Response:
{
  "success": true,
  "message": "Password reset email sent"
}

# Check server console for reset link
```

#### 6. Rate Limiting
```bash
# Test login rate limiting (should block after 5 attempts)
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "test"
    }'
  echo "\nAttempt $i"
done

# After 5 attempts, should get:
{
  "success": false,
  "message": "Too many login attempts, please try again after 15 minutes"
}
```

---

### ✅ Frontend Testing

#### 1. Registration Flow
1. Navigate to http://localhost:3000/register
2. Fill in the form:
   - Name: John Doe
   - Email: john@example.com
   - Password: SecurePass123!
   - Confirm Password: SecurePass123!
3. Observe password strength indicator (should show "Strong")
4. Submit the form
5. Should redirect to dashboard
6. Check browser console for verification email link

**Test Cases:**
- ✅ Empty fields show validation errors
- ✅ Invalid email format shows error
- ✅ Weak password shows strength indicator
- ✅ Mismatched passwords show error
- ✅ Duplicate email shows error message
- ✅ Successful registration redirects to dashboard

#### 2. Login Flow
1. Navigate to http://localhost:3000/login
2. Enter credentials:
   - Email: john@example.com
   - Password: SecurePass123!
3. Check "Remember me" checkbox
4. Submit the form
5. Should redirect to dashboard

**Test Cases:**
- ✅ Empty fields show validation errors
- ✅ Invalid credentials show error
- ✅ Remember me extends session
- ✅ Show/hide password toggle works
- ✅ Successful login redirects to dashboard

#### 3. Email Verification
1. Copy verification link from console
2. Open in new tab
3. Should show "Verifying Email" loading state
4. Should show success message
5. Should auto-redirect to dashboard after 3 seconds

**Test Cases:**
- ✅ Valid token shows success
- ✅ Invalid token shows error
- ✅ Expired token shows error
- ✅ Auto-redirect works

#### 4. Forgot Password Flow
1. Navigate to http://localhost:3000/forgot-password
2. Enter email: john@example.com
3. Submit the form
4. Should show success message
5. Check console for reset link

**Test Cases:**
- ✅ Empty email shows validation error
- ✅ Invalid email format shows error
- ✅ Success message displays
- ✅ Can resend email

#### 5. Reset Password Flow
1. Copy reset link from console
2. Open in browser
3. Enter new password: NewSecurePass123!
4. Confirm password: NewSecurePass123!
5. Observe password strength indicator
6. Submit the form
7. Should show success message
8. Should redirect to login after 3 seconds

**Test Cases:**
- ✅ Weak password shows strength indicator
- ✅ Mismatched passwords show error
- ✅ Valid token allows reset
- ✅ Invalid/expired token shows error
- ✅ Success redirects to login

#### 6. Token Auto-Refresh
1. Login to the application
2. Open browser DevTools → Network tab
3. Wait 14 minutes (or modify token expiry for testing)
4. Make any API call (navigate to dashboard)
5. Should see automatic token refresh in Network tab
6. Should not be logged out

**Test Cases:**
- ✅ Token refreshes automatically before expiry
- ✅ Failed refresh logs user out
- ✅ New tokens are stored in localStorage
- ✅ API calls continue without interruption

#### 7. Protected Routes
1. Logout from the application
2. Try to access http://localhost:3000/dashboard
3. Should redirect to login page
4. Login again
5. Should redirect back to dashboard

**Test Cases:**
- ✅ Unauthenticated users redirected to login
- ✅ Authenticated users can access protected routes
- ✅ Login redirects to dashboard
- ✅ Logout clears tokens and redirects

#### 8. Remember Me Functionality
1. Login with "Remember me" checked
2. Close browser completely
3. Reopen browser and navigate to app
4. Should still be logged in

**Test Cases:**
- ✅ Remember me extends session to 7 days
- ✅ Without remember me, session is 1 day
- ✅ Tokens persist across browser sessions

---

### ✅ Security Testing

#### 1. XSS Protection
```bash
# Try to inject script in name field
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<script>alert(\"XSS\")</script>",
    "email": "xss@example.com",
    "password": "SecurePass123!"
  }'

# Should sanitize the input
```

#### 2. NoSQL Injection
```bash
# Try NoSQL injection in login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": {"$gt": ""},
    "password": {"$gt": ""}
  }'

# Should fail with validation error
```

#### 3. Rate Limiting
```bash
# Test registration rate limiting
for i in {1..4}; do
  curl -X POST http://localhost:5000/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"User $i\",
      \"email\": \"user$i@example.com\",
      \"password\": \"SecurePass123!\"
    }"
  echo "\nRegistration $i"
done

# 4th attempt should be blocked
```

#### 4. Token Security
```bash
# Try to use expired token
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer EXPIRED_TOKEN"

# Should return 401 Unauthorized

# Try to use invalid token
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer invalid_token"

# Should return 401 Unauthorized
```

---

### ✅ Email Testing

#### 1. Development (Ethereal Email)
1. Register a new user
2. Check server console for email preview URL
3. Click the URL to view email in browser
4. Verify email template looks good
5. Click verification link

#### 2. Production (Real SMTP)
1. Update .env with real SMTP credentials
2. Register a new user
3. Check email inbox
4. Verify email received
5. Click verification link

---

### ✅ Database Testing

#### 1. Check User Document
```javascript
// In MongoDB shell or Compass
db.users.findOne({ email: "john@example.com" })

// Should see:
{
  _id: ObjectId("..."),
  name: "John Doe",
  email: "john@example.com",
  password: "$2a$10$...", // Hashed
  avatar: "...",
  isEmailVerified: false,
  refreshTokens: [
    {
      token: "...",
      createdAt: ISODate("..."),
      expiresAt: ISODate("..."),
      deviceInfo: "..."
    }
  ],
  loginAttempts: 0,
  isOnline: true,
  lastSeen: ISODate("..."),
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

#### 2. Check Token Cleanup
```javascript
// Tokens should be cleaned up automatically
// Check that expired tokens are removed
db.users.findOne(
  { email: "john@example.com" },
  { refreshTokens: 1 }
)

// Should only show non-expired tokens
```

---

### ✅ Performance Testing

#### 1. Password Hashing Performance
```bash
# Time 100 registrations
time for i in {1..100}; do
  curl -X POST http://localhost:5000/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"User $i\",
      \"email\": \"perf$i@example.com\",
      \"password\": \"SecurePass123!\"
    }" > /dev/null 2>&1
done

# Should complete in reasonable time (bcrypt is intentionally slow)
```

#### 2. Token Verification Performance
```bash
# Time 1000 token verifications
time for i in {1..1000}; do
  curl -X GET http://localhost:5000/api/auth/me \
    -H "Authorization: Bearer YOUR_TOKEN" > /dev/null 2>&1
done

# Should be fast (JWT verification is quick)
```

---

### ✅ Error Handling Testing

#### 1. Network Errors
1. Stop the backend server
2. Try to login from frontend
3. Should show appropriate error message
4. Start server again
5. Retry should work

#### 2. Database Errors
1. Stop MongoDB
2. Try to register
3. Should show server error
4. Start MongoDB
5. Retry should work

#### 3. Invalid Data
1. Send malformed JSON
2. Send missing required fields
3. Send invalid data types
4. Should get validation errors

---

### ✅ Browser Compatibility

Test in multiple browsers:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

Check:
- ✅ UI renders correctly
- ✅ Forms work properly
- ✅ Cookies are set
- ✅ LocalStorage works
- ✅ Redirects work

---

### ✅ Mobile Responsiveness

Test on different screen sizes:
- ✅ Desktop (1920x1080)
- ✅ Laptop (1366x768)
- ✅ Tablet (768x1024)
- ✅ Mobile (375x667)

Check:
- ✅ Forms are usable
- ✅ Buttons are clickable
- ✅ Text is readable
- ✅ Layout doesn't break

---

## 🐛 Common Issues and Solutions

### Issue 1: "Cannot connect to MongoDB"
**Solution:**
```bash
# Start MongoDB
mongod

# Or check if it's running
ps aux | grep mongod
```

### Issue 2: "CORS error"
**Solution:**
- Check CLIENT_URL in server/.env matches frontend URL
- Ensure withCredentials: true in axios config

### Issue 3: "Token refresh not working"
**Solution:**
- Check JWT_REFRESH_SECRET is set
- Verify cookies are enabled in browser
- Check cookie path in jwt.js

### Issue 4: "Emails not sending"
**Solution:**
- Check SMTP credentials in .env
- For development, use Ethereal Email
- Check server console for email preview URLs

### Issue 5: "Rate limiting too strict"
**Solution:**
- Adjust limits in rateLimiter.js
- Clear rate limit by restarting server
- Use different IP for testing

### Issue 6: "Password validation too strict"
**Solution:**
- Adjust requirements in passwordValidator.js
- Update validation messages
- Test with different passwords

---

## 📊 Test Results Template

```
Authentication System Test Results
Date: ___________
Tester: ___________

Backend Tests:
[ ] User Registration - Pass/Fail
[ ] User Login - Pass/Fail
[ ] Token Refresh - Pass/Fail
[ ] Email Verification - Pass/Fail
[ ] Password Reset - Pass/Fail
[ ] Rate Limiting - Pass/Fail

Frontend Tests:
[ ] Registration UI - Pass/Fail
[ ] Login UI - Pass/Fail
[ ] Forgot Password UI - Pass/Fail
[ ] Reset Password UI - Pass/Fail
[ ] Email Verification UI - Pass/Fail
[ ] Token Auto-Refresh - Pass/Fail

Security Tests:
[ ] XSS Protection - Pass/Fail
[ ] NoSQL Injection - Pass/Fail
[ ] Rate Limiting - Pass/Fail
[ ] Token Security - Pass/Fail

Performance Tests:
[ ] Password Hashing - Pass/Fail
[ ] Token Verification - Pass/Fail

Browser Compatibility:
[ ] Chrome - Pass/Fail
[ ] Firefox - Pass/Fail
[ ] Safari - Pass/Fail
[ ] Edge - Pass/Fail

Mobile Responsiveness:
[ ] Desktop - Pass/Fail
[ ] Tablet - Pass/Fail
[ ] Mobile - Pass/Fail

Overall Status: Pass/Fail
Notes: ___________
```

---

## 🎉 Success Criteria

All tests should pass with:
- ✅ No security vulnerabilities
- ✅ All features working as expected
- ✅ Good user experience
- ✅ Fast performance
- ✅ Proper error handling
- ✅ Cross-browser compatibility
- ✅ Mobile responsiveness

**Authentication system is production-ready when all tests pass!**
