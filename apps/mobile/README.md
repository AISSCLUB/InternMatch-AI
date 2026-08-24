# InternMatch AI — Mobile Client (Expo / React Native)

This directory contains the cross-platform mobile application for **InternMatch AI**, built with **React Native (0.81.5)** and **Expo SDK 54**.

---

## Overview

The mobile client provides the primary candidate interface:
- **Authentication:** Email/Password authentication & signup confirmation powered by Supabase Auth.
- **Onboarding & Profile:** Candidate profile creation, headline, skills, education, and experience.
- **CV Upload & Enrichment:** PDF/DOCX CV parsing for automated profile and skills enrichment.
- **Internship Discovery & Matching:** Explore curated internships, real-time match scoring, and deep **Why You Match** explanations with skill gap analysis.
- **Saved Internships & Applications:** Save favorite opportunities and track application lifecycle stages.
- **AI Cover Letter Drafting:** Tone-adjusted, job-specific cover letter drafts.
- **RevenueCat Monetization:** Pro Student candidate tier with native RevenueCat Test Store integration, dynamic pricing, purchasing, and entitlement restoration.
- **Multilingual Support:** Fully localized in English (`en`), Turkish (`tr`), and Arabic (`ar`) with RTL layout support.

---

## Prerequisites

- **Node.js:** `v20.x` or `v22.x` (LTS recommended)
- **npm:** `v10.x` or higher
- **Android Studio & Android SDK:** For native Android development client and emulator testing.

---

## Quick Setup

### 1. Install Dependencies
```bash
npm ci
```

### 2. Configure Environment
Copy the environment template and populate with your Supabase and RevenueCat public keys:
```bash
cp .env.example .env
```

Key variables:
- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Your Supabase public/anon API key.
- `EXPO_PUBLIC_API_URL`: Backend API URL (`http://10.0.2.2:8000/api/v1` for Android Emulator, `http://localhost:8000/api/v1` for iOS/web).
- `EXPO_PUBLIC_REVENUECAT_API_KEY`: RevenueCat public SDK key for the configured app/store. For the Shipaton Test Store workflow, use the RevenueCat Test Store public SDK key.

---

## Development Runtime & RevenueCat

> [!IMPORTANT]
> **RevenueCat native in-app purchases require a native development build.**
> Standard Expo Go does not contain the native `react-native-purchases` binary. For evaluating the full purchase, CustomerInfo entitlement updates, and restoration flow, run the native development client:

### Running with Native Development Client
```bash
# Build/run native Android development client locally
npx expo run:android

# Start the Metro bundler in development client mode
npx expo start --dev-client
```

---

## Static Type Checking

Verify TypeScript compilation:
```bash
npx tsc --noEmit
```

---

## Complete Judge & Reproduction Runbook

For end-to-end backend, database, worker, seed data, and evaluator instructions, refer to the root [Judge Reproduction Runbook](../../JUDGE_RUNBOOK.md).
