# Authentication Setup Guide

This guide explains how to set up and configure Supabase authentication with Next.js 15 using the PKCE flow.

## Overview

Our authentication system uses:

- **Supabase Auth** with PKCE (Proof Key for Code Exchange) flow
- **Email confirmations** via `verifyOtp` with `token_hash`
- **Server-side route handlers** for secure auth processing
- **Next.js 15 App Router** with proper middleware protection

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Supabase public environment variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Site URL (used for email redirects)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase private environment variables
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_AUTH_COOKIE_PASSWORD=a_random_32_character_string
```

## Supabase Configuration

### 1. Email Templates

You need to update your Supabase email templates to use the new `token_hash` flow:

#### Confirm Signup Template

```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your user:</p>
<p>
  <a
    href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard"
    >Confirm your email</a
  >
</p>
```

#### Reset Password Template

```html
<h2>Reset Password</h2>
<p>Follow this link to reset your password:</p>
<p>
  <a
    href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/update-password"
    >Reset Password</a
  >
</p>
```

### 2. Site URL Configuration

In your Supabase dashboard:

1. Go to **Authentication** → **Settings**
2. Set **Site URL** to: `http://localhost:3000` (development) or your production URL
3. Add **Redirect URLs**:
   - `http://localhost:3000/auth/confirm`
   - `https://yourdomain.com/auth/confirm` (production)

## Authentication Flow

### Sign Up Flow

1. User fills out sign-up form
2. `supabase.auth.signUp()` is called with `emailRedirectTo: /auth/confirm?next=/dashboard`
3. User receives email with confirmation link containing `token_hash`
4. User clicks link → redirected to `/auth/confirm` route handler
5. Server calls `supabase.auth.verifyOtp()` with `token_hash`
6. User is authenticated and redirected to dashboard

### Password Reset Flow

1. User requests password reset
2. `supabase.auth.resetPasswordForEmail()` is called with `redirectTo: /auth/confirm?type=recovery&next=/auth/update-password`
3. User receives email with reset link containing `token_hash`
4. User clicks link → redirected to `/auth/confirm` route handler
5. Server calls `supabase.auth.verifyOtp()` with `token_hash` and `type=recovery`
6. User is authenticated and redirected to `/auth/update-password`
7. User updates password and is redirected to dashboard

## Key Components

### 1. Auth Context (`/src/contexts/AuthContext.tsx`)

- Manages global authentication state
- Provides `signUp`, `signIn`, `signOut`, `resetPassword` methods
- Uses correct redirect URLs for new flow

### 2. Auth Confirm Route Handler (`/src/app/auth/confirm/route.ts`)

- Server-side route handler for email confirmations
- Uses `verifyOtp` with `token_hash` (not `exchangeCodeForSession`)
- Handles both signup confirmations and password resets

### 3. Supabase Client Configuration (`/src/lib/supabase.ts`)

- Explicit PKCE flow configuration
- Disabled automatic session detection in URL
- Proper cookie handling for SSR

### 4. Middleware (`/src/middleware.ts`)

- Protects authenticated routes
- Redirects authenticated users away from auth pages
- Allows public access to auth callback routes

## Routes

### Public Routes

- `/` - Home page
- `/auth/signin` - Sign in page
- `/auth/signup` - Sign up page
- `/auth/forgot-password` - Password reset request
- `/auth/confirm` - Email confirmation handler (server-side)
- `/auth/callback` - Legacy callback (with redirect to new flow)
- `/auth/auth-code-error` - Error page for failed confirmations

### Protected Routes

- `/dashboard` - User dashboard (requires authentication)
- `/profile` - User profile (requires authentication)
- `/auth/update-password` - Password update page (requires authentication)

## Error Handling

### Common Issues

1. **"Invalid request: both auth code and code verifier should be non-empty"**

   - **Cause**: Using old `exchangeCodeForSession` for email confirmations
   - **Solution**: Use `verifyOtp` with `token_hash` (implemented in new flow)

2. **Email links not working**

   - **Cause**: Wrong email template or redirect URL
   - **Solution**: Update email templates to use `/auth/confirm` with `token_hash`

3. **Session not persisting**
   - **Cause**: Cookie configuration issues
   - **Solution**: Check SUPABASE_AUTH_COOKIE_PASSWORD and cookie settings

### Error Pages

- `/auth/auth-code-error` - Shows helpful error messages and recovery options

## Development vs Production

### Development

- Use `http://localhost:3000` for Site URL
- Email templates should use `{{ .SiteURL }}` (automatically resolves)

### Production

- Update Site URL in Supabase dashboard
- Add production domain to Redirect URLs
- Ensure HTTPS is used for all auth URLs

## Testing

### Sign Up Flow

1. Go to `/auth/signup`
2. Fill out form and submit
3. Check email for confirmation link
4. Click link → should redirect to dashboard

### Password Reset Flow

1. Go to `/auth/forgot-password`
2. Enter email and submit
3. Check email for reset link
4. Click link → should redirect to `/auth/update-password`
5. Update password → should redirect to dashboard

## Migration from Old Flow

If you're migrating from the old `exchangeCodeForSession` flow:

1. Update email templates to use `token_hash`
2. Change redirect URLs from `/auth/callback` to `/auth/confirm`
3. Update Supabase client configuration
4. Test all auth flows thoroughly

The old `/auth/callback` route is kept for backward compatibility and will automatically redirect to the new flow when possible.

## Security Considerations

- PKCE flow provides better security than implicit flow
- `token_hash` approach prevents code verifier issues
- Server-side route handlers protect against client-side attacks
- Middleware ensures proper route protection
- Email confirmation prevents unauthorized access

## Troubleshooting

### Debug Steps

1. Check browser Network tab for failed requests
2. Verify email template configuration
3. Check Supabase dashboard logs
4. Ensure environment variables are correct
5. Test with fresh browser session (clear cookies)

### Support

- Check Supabase documentation for latest updates
- Review GitHub discussions for similar issues
- Test in incognito mode to isolate cookie issues
