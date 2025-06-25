# 🏢 Corporate Google Integration Setup Guide

## Overview

This guide explains how to set up Google Meet and Calendar integration for your booking system using a **corporate service account** approach. This is the recommended approach for business environments where you don't want individual staff members to connect their personal Google accounts.

## 🆚 **Two Integration Approaches**

### **Option A: Corporate Service Account (Recommended)** ✅

- ✅ **No individual user OAuth required**
- ✅ **Single corporate Google account manages all meetings**
- ✅ **Professional meeting organization**
- ✅ **Centralized calendar management**
- ✅ **Works with your Zoho Mail setup**
- ✅ **Easy to maintain and monitor**

### **Option B: Individual OAuth (Not Recommended)**

- ❌ **Requires each consultant to connect personal Google account**
- ❌ **Complex token management**
- ❌ **Potential security concerns**
- ❌ **Maintenance overhead**

---

## 🚀 **Setup Steps for Corporate Service Account**

### **Step 1: Create Google Cloud Project**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Note your Project ID

### **Step 2: Enable Required APIs**

Enable these APIs in your Google Cloud project:

```bash
# Google Calendar API
https://console.cloud.google.com/apis/library/calendar-json.googleapis.com

# Google Meet API (if available)
https://console.cloud.google.com/apis/library/meet.googleapis.com
```

### **Step 3: Create Service Account**

1. Go to **IAM & Admin > Service Accounts**
2. Click **Create Service Account**
3. Fill in details:
   - **Name**: `intellectif-booking-service`
   - **Description**: `Service account for Intellectif booking system Google integration`
4. Click **Create and Continue**
5. Skip role assignment for now (we'll handle this differently)
6. Click **Done**

### **Step 4: Generate Service Account Key**

1. Click on your newly created service account
2. Go to the **Keys** tab
3. Click **Add Key > Create New Key**
4. Select **JSON** format
5. Download the JSON file - **Keep this secure!**

### **Step 5: Create Corporate Google Calendar**

1. Go to [Google Calendar](https://calendar.google.com)
2. Sign in with your corporate Google account (the one you want to manage all meetings)
3. Create a new calendar called "Intellectif Consultations" or similar
4. Note the calendar ID (found in calendar settings)

### **Step 6: Share Calendar with Service Account**

1. In Google Calendar, go to your consultation calendar settings
2. Under **Share with specific people**, add your service account email
3. Give it **Make changes to events** permission
4. The service account email looks like: `intellectif-booking-service@your-project.iam.gserviceaccount.com`

### **Step 7: Configure Environment Variables**

Add these to your `.env.local` file:

```bash
# Corporate Google Service Account (Recommended)
GOOGLE_SERVICE_ACCOUNT_EMAIL=intellectif-booking-service@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
[Your complete private key from the JSON file]
-----END PRIVATE KEY-----"
```

**Important**: Replace line breaks in the private key with `\n` when copying to the environment variable.

---

## 🔧 **Technical Implementation**

### **Current Setup (After Updates)**

Your booking system now uses:

1. **Corporate Service**: `src/lib/google-calendar-corporate.ts`
2. **No OAuth tokens required**: Service account handles authentication
3. **Centralized meeting creation**: All meetings created under your corporate account
4. **Professional meeting invites**: Sent from your corporate email

### **How It Works**

1. **Customer books consultation** → Booking API triggered
2. **Service account creates Google Meet** → Professional meeting room
3. **Calendar invite sent** → To both customer and assigned consultant
4. **Meeting details stored** → In booking record for dashboard access

### **Benefits of This Approach**

- **🔒 Security**: No personal account access required
- **📋 Organization**: All meetings in one corporate calendar
- **⚡ Performance**: No token refresh complexity
- **🎯 Professional**: Meetings appear from your business
- **🛠️ Maintenance**: Single point of configuration

---

## 🧪 **Testing Your Setup**

### **Test 1: Environment Check**

```bash
# Check if environment variables are loaded
console.log(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
```

### **Test 2: Service Account Authentication**

```bash
# In your Next.js API route, check authentication
const auth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

console.log('Auth configured:', !!auth);
```

### **Test 3: Create Test Meeting**

Make a test booking through your website and check:

- ✅ Google Meet URL generated
- ✅ Calendar event created
- ✅ Invites sent to customer and consultant
- ✅ Meeting details stored in database

---

## 🚨 **Troubleshooting**

### **Error: "Invalid credentials"**

- Check service account email is correct
- Verify private key format (newlines as `\n`)
- Ensure service account has calendar access

### **Error: "Calendar not found"**

- Verify calendar is shared with service account
- Check calendar ID is correct
- Ensure proper permissions granted

### **Error: "Meeting URL not generated"**

- Check Google Meet API is enabled
- Verify conferenceData configuration
- Ensure calendar has Meet integration enabled

### **No meeting invites sent**

- Check `sendUpdates: 'all'` is set
- Verify attendee emails are valid
- Ensure calendar permissions allow sending invites

---

## 🔐 **Security Best Practices**

1. **Secure Key Storage**: Store private key securely, never commit to git
2. **Limited Scope**: Use minimal required OAuth scopes
3. **Regular Rotation**: Rotate service account keys periodically
4. **Access Monitoring**: Monitor service account usage in Google Cloud Console
5. **Environment Separation**: Use different service accounts for dev/prod

---

## 📞 **Support**

If you encounter issues:

1. **Check Google Cloud Console** for API usage and errors
2. **Review server logs** for detailed error messages
3. **Verify calendar permissions** in Google Calendar settings
4. **Test service account** authentication independently

This corporate approach eliminates the need for individual staff Google account connections while providing professional Google Meet integration for your Intellectif booking system.
