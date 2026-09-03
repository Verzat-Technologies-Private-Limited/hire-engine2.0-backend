# Frontend Developer Integration Guide — Subscriptions, Billing & Admin Plans

---

## 📑 Quick Navigation
1. [Authentication & Base Setup](#1-authentication--base-setup)
2. [Recruiter Checkout & Billing Flow](#2-recruiter-checkout--billing-flow)
   - [Step 1: Fetching & Rendering Pricing Cards](#step-1-fetching--rendering-pricing-cards)
   - [Step 2: Initiating Checkout (`POST /subscriptions`)](#step-2-initiating-checkout)
   - [Step 3: Handling Gateway Modals (Stripe vs. Razorpay)](#step-3-handling-gateway-modals-stripe-vs-razorpay)
   - [Step 4: Managing Subscription Status & Quota Progress Bars](#step-4-managing-subscription-status--quota-progress-bars)
   - [Step 5: Cancelling a Subscription](#step-5-cancelling-a-subscription)
   - [Step 6: Transaction History & Invoices Table](#step-6-transaction-history--invoices-table)
3. [Admin Dashboard Management Flow](#3-admin-dashboard-management-flow)
   - [Plan Catalog CRUD](#plan-catalog-crud)
   - [Processing Refunds](#processing-refunds)
   - [Platform Revenue Dashboard](#platform-revenue-dashboard)
4. [Complete TypeScript Type Definitions](#4-complete-typescript-type-definitions)
5. [Error Handling & UI Toast Mapping](#5-error-handling--ui-toast-mapping)
6. [Ready-to-Use API Service Code (Axios / TypeScript)](#6-ready-to-use-api-service-code)

---

## 1. Authentication & Base Setup

- **Base URL:** `http://localhost:5000/api/v1` (or your staging/production domain)
- **Headers:** All protected recruiter/admin requests **must** include the JWT Bearer token:
  ```http
  Authorization: Bearer <accessToken>
  Content-Type: application/json
  ```
- **Standard API Envelope:** Every JSON response follows this structure:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Human readable summary",
    "data": { ... }
  }
  ```

---

## 2. Recruiter Checkout & Billing Flow

```
┌─────────────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐
│ 1. Render Pricing Cards │ ───► │ 2. Click "Subscribe"    │ ───► │ 3. Open Payment Modal   │
│    (GET /plans?country) │      │ (POST /subscriptions)   │      │ (Stripe or Razorpay)    │
└─────────────────────────┘      └─────────────────────────┘      └────────────┬────────────┘
                                                                               │ Success
                                                                               ▼
┌─────────────────────────┐                                       ┌─────────────────────────┐
│ 5. View Quota Badges &  │ ◄──────────────────────────────────── │ 4. Refresh Sub State    │
│    Billing History      │                                       │ (Show Active Plan)      │
└─────────────────────────┘                                       └─────────────────────────┘
```

---

### Step 1: Fetching & Rendering Pricing Cards

Fetch localized plans for the user's selected country. The backend dynamically calculates the local currency and taxes (e.g. 18% GST in India).

- **Endpoint:** `GET /subscriptions/plans`
- **Auth:** Public
- **Query Params:**
  - `countryCode` (optional, string, default: `'US'`): e.g. `'IN'`, `'US'`, `'GB'`.

#### Example Request:
```http
GET /api/v1/subscriptions/plans?countryCode=IN
```

#### Example Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Available subscription plans retrieved",
  "data": {
    "country": "India",
    "currency": "INR",
    "paymentProvider": "razorpay",
    "plans": {
      "starter-monthly": {
        "id": "starter-monthly",
        "name": "Starter Plan",
        "description": "Ideal for small startups hiring occasionally",
        "price": 2999,
        "jobQuota": 5,
        "resumeQuota": 50,
        "hasResumeDB": true,
        "durationMonths": 1,
        "currency": "INR",
        "tax": {
          "baseAmount": 2999,
          "CGST": 270,
          "SGST": 270,
          "totalGST": 540,
          "rate": "18%"
        },
        "totalPrice": 3539
      },
      "growth-monthly": {
        "id": "growth-monthly",
        "name": "Growth Recruiter Plan",
        "description": "Unlimited job posts and direct resume database search",
        "price": 7999,
        "jobQuota": 0,
        "resumeQuota": 500,
        "hasResumeDB": true,
        "durationMonths": 1,
        "currency": "INR",
        "tax": {
          "baseAmount": 7999,
          "CGST": 720,
          "SGST": 720,
          "totalGST": 1440,
          "rate": "18%"
        },
        "totalPrice": 9439
      }
    }
  }
}
```

> **Frontend Display Rules:**
> 1. If `jobQuota === 0`, display **"Unlimited Job Posts"**. Otherwise display **"X Job Posts"**.
> 2. If `resumeQuota === 0`, display **"Unlimited Resume Searches"**.
> 3. Display `totalPrice` as the main checkout figure, and show `price + tax.taxAmount (tax.taxType)` as the breakdown subtitle.

---

### Step 2: Initiating Checkout

When the recruiter clicks "Upgrade" or "Subscribe", send the company ID and plan ID.

- **Endpoint:** `POST /subscriptions`
- **Auth:** Required (Bearer Token)
- **Role:** `employer` or `admin`

#### Request Payload:
```json
{
  "companyId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "planId": "growth-monthly"
}
```

#### Response Example (`201 Created`):
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Subscription order created successfully",
  "data": {
    "subscription": {
      "_id": "673f1a2b3c4d5e6f7a8b9c99",
      "company": "64f1a2b3c4d5e6f7a8b9c0d1",
      "plan": "growth-monthly",
      "status": "active",
      "paymentProvider": "razorpay",
      "externalSubscriptionId": "order_OD1234567890",
      "jobPostQuota": 0,
      "jobPostsUsed": 0,
      "resumeSearchQuota": 500,
      "resumeSearchesUsed": 0,
      "hasResumeDBAccess": true,
      "currentPeriodStart": "2026-09-01T12:00:00.000Z",
      "currentPeriodEnd": "2026-10-01T12:00:00.000Z"
    },
    "order": {
      "orderId": "order_OD1234567890",
      "providerData": {
        "orderId": "order_OD1234567890",
        "amount": 943882,
        "currency": "INR",
        "keyId": "rzp_test_51Abcdefghijk"
      }
    }
  }
}
```

---

### Step 3: Handling Gateway Modals (Stripe vs. Razorpay)

Inspect `data.order.providerData` to know which modal SDK to invoke:

#### A. If Provider is Razorpay (`providerData.keyId` exists):
Include the Razorpay script in your HTML: `<script src="https://checkout.razorpay.com/v1/checkout.js"></script>`

```javascript
const handleRazorpayPayment = (orderData, userProfile) => {
  const options = {
    key: orderData.providerData.keyId,
    amount: orderData.providerData.amount, // in paise
    currency: orderData.providerData.currency,
    name: "Hire Engine",
    description: "Recruiter Plan Subscription",
    order_id: orderData.providerData.orderId,
    prefill: {
      name: `${userProfile.firstName} ${userProfile.lastName}`,
      email: userProfile.email,
    },
    theme: { color: "#4F46E5" },
    handler: function (response) {
      // Payment Successful!
      toast.success("Payment completed successfully!");
      router.push("/recruiter/dashboard");
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
};
```

#### B. If Provider is Stripe (`providerData.clientSecret` exists):
Use `@stripe/stripe-js` / `@stripe/react-stripe-js`:

```javascript
import { useStripe, useElements } from '@stripe/react-stripe-js';

const handleStripePayment = async (clientSecret) => {
  const result = await stripe.confirmPayment({
    elements,
    clientSecret,
    confirmParams: {
      return_url: `${window.location.origin}/recruiter/billing/success`,
    },
  });

  if (result.error) {
    toast.error(result.error.message);
  }
};
```

---

### Step 4: Managing Subscription Status & Quota Progress Bars

When rendering the recruiter dashboard, calculate quotas from the subscription object:

| Status Value | Badge Color | Meaning & Required UI Action |
| :--- | :--- | :--- |
| `active` | 🟢 Green | Active subscription. Full access to job posting and resume search. |
| `past_due` | 🟡 Yellow | Payment failed / Grace period. Display banner: *"Payment past due. Please update payment method."* Posting is still allowed. |
| `cancelled` | 🔴 Red | Plan was cancelled. User retains access until `currentPeriodEnd`. Show *"Renews until [Date]"*. |
| `expired` | ⚫ Gray | No active subscription. Block job post button and show *"Upgrade Plan"* CTA. |

#### Calculating Quota UI:
```javascript
// Job Post Quota
const isUnlimitedJobs = subscription.jobPostQuota === 0;
const jobPercentage = isUnlimitedJobs 
  ? 0 
  : (subscription.jobPostsUsed / subscription.jobPostQuota) * 100;

// Resume Search Quota
const isUnlimitedResumes = subscription.resumeSearchQuota === 0;
const resumePercentage = isUnlimitedResumes 
  ? 0 
  : (subscription.resumeSearchesUsed / subscription.resumeSearchQuota) * 100;
```

---

### Step 5: Cancelling a Subscription

- **Endpoint:** `DELETE /subscriptions`
- **Auth:** Required (`role: 'employer'` or `'admin'`)

#### Request Payload:
```json
{
  "companyId": "64f1a2b3c4d5e6f7a8b9c0d1"
}
```

#### Response Example (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Subscription cancelled successfully",
  "data": {
    "_id": "673f1a2b3c4d5e6f7a8b9c99",
    "company": "64f1a2b3c4d5e6f7a8b9c0d1",
    "status": "cancelled",
    "cancelledAt": "2026-09-01T12:30:00.000Z",
    "currentPeriodEnd": "2026-10-01T12:00:00.000Z"
  }
}
```

---

### Step 6: Transaction History & Invoices Table

- **Endpoint:** `GET /subscriptions/transactions?companyId=64f1a2b3c4d5e6f7a8b9c0d1`
- **Auth:** Required (`role: 'employer'` or `'admin'`)

#### Response Example (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Company transaction history retrieved",
  "data": [
    {
      "_id": "673f1b4c3d2e1f0a9b8c7d6e",
      "company": "64f1a2b3c4d5e6f7a8b9c0d1",
      "type": "subscription",
      "amount": 9439,
      "currency": "INR",
      "status": "succeeded",
      "paymentProvider": "razorpay",
      "externalPaymentId": "pay_P1234567890",
      "description": "Subscribed to Growth Recruiter Plan",
      "taxAmount": 1440,
      "taxBreakdown": {
        "baseAmount": 7999,
        "CGST": 720,
        "SGST": 720,
        "totalGST": 1440,
        "rate": "18%"
      },
      "invoiceNumber": "INV-2026-0091",
      "createdAt": "2026-09-01T12:00:00.000Z"
    }
  ]
}
```

---

## 3. Admin Dashboard Management Flow

Base Route: `/api/v1/admin`  
*(All routes require `Authorization: Bearer <accessToken>` and user `role: 'admin'`)*

### Plan Catalog CRUD

#### 1. List Plans (`GET /admin/plans`)
```http
GET /api/v1/admin/plans?active=true
```
- Query params: `active` (`'true'` | `'false'`)

#### 2. Create Plan (`POST /admin/plans`)
```json
{
  "planId": "enterprise-annual",
  "name": "Enterprise Annual Plan",
  "description": "Full access for high-volume staffing agencies",
  "price": 79999,
  "jobQuota": 0,
  "resumeQuota": 0,
  "hasResumeDB": true,
  "durationMonths": 12,
  "isActive": true
}
```
> **Validation Rules:**
> - `planId`: Lowercase alphanumeric with hyphens only (`/^[a-z0-9-]+$/`).
> - `price`: Must be $\ge 0$.
> - `durationMonths`: Integer between 1 and 120.

#### 3. Update Plan (`PATCH /admin/plans/:id`)
```json
{
  "price": 74999,
  "isActive": true
}
```

#### 4. Delete Plan (`DELETE /admin/plans/:id`)
- **Safety Response:** If any active companies are currently using this plan, the backend returns:
  - `409 Conflict`: `"Cannot delete plan. X active subscription(s) are using it. Deactivate the plan instead."`
  - **Frontend Recommendation:** Catch `409` and show a prompt asking the admin to switch the toggle `isActive: false` instead.

---

### Processing Refunds

Admins can issue full or partial refunds for employer billing disputes.

- **Endpoint:** `POST /admin/transactions/:id/refund` (where `:id` is the Transaction ObjectId)

#### Request Payload:
```json
{
  "amount": null,
  "reason": "Duplicate payment charged due to browser refresh"
}
```
*(Pass `amount: null` for a full refund, or a number like `2999` for a partial refund)*.

#### Response Example (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Transaction refund processed",
  "data": {
    "_id": "673f1b4c3d2e1f0a9b8c7d6e",
    "status": "refunded",
    "refundReason": "Duplicate payment charged due to browser refresh"
  }
}
```

---

### Platform Revenue Dashboard

- **Endpoint:** `GET /admin/reports/overview`

#### Response Example (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Executive dashboard metrics retrieved",
  "data": {
    "metrics": {
      "totalUsers": 1250,
      "totalEmployers": 85,
      "totalJobs": 320,
      "activeJobs": 210,
      "totalApplications": 4150,
      "totalRevenue": 482590.50
    }
  }
}
```

---

## 4. Complete TypeScript Type Definitions

Copy-paste these into your frontend project (e.g. `src/types/subscription.ts`):

```typescript
export type PaymentProvider = 'stripe' | 'razorpay';

export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'expired';

export type TransactionStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface TaxBreakdown {
  baseAmount: number;
  rate: string;
  // India (GST) fields:
  CGST?: number;
  SGST?: number;
  totalGST?: number;
  // US / International fields:
  salesTax?: number;
  note?: string;
  [key: string]: unknown;
}

export interface PlanItem {
  id: string;
  name: string;
  description: string;
  price: number;
  jobQuota: number; // 0 = unlimited
  resumeQuota: number; // 0 = unlimited
  hasResumeDB: boolean;
  durationMonths: number;
  currency: string;
  tax: TaxBreakdown;
  totalPrice: number;
}

export interface PlansResponse {
  country: string;
  currency: string;
  paymentProvider: PaymentProvider;
  plans: Record<string, PlanItem>;
}

export interface Subscription {
  _id: string;
  company: string;
  plan: string;
  status: SubscriptionStatus;
  paymentProvider: PaymentProvider;
  externalSubscriptionId?: string;
  externalCustomerId?: string;
  jobPostQuota: number;
  jobPostsUsed: number;
  resumeSearchQuota: number;
  resumeSearchesUsed: number;
  hasResumeDBAccess: boolean;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt?: string | null;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscribeOrderResponse {
  subscription: Subscription;
  order: {
    orderId: string;
    providerData: {
      orderId?: string;
      amount?: number;
      currency?: string;
      keyId?: string; // Present for Razorpay
      clientSecret?: string; // Present for Stripe
      paymentIntentId?: string;
    };
  };
}

export interface Transaction {
  _id: string;
  company: string;
  type: 'subscription' | 'job_promotion' | 'refund';
  amount: number;
  currency: string;
  status: TransactionStatus;
  paymentProvider: PaymentProvider;
  externalPaymentId?: string;
  description: string;
  taxAmount: number;
  taxBreakdown?: TaxBreakdown;
  invoiceNumber?: string;
  refundReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPlanPayload {
  planId: string;
  name: string;
  description?: string;
  price: number;
  jobQuota?: number;
  resumeQuota?: number;
  hasResumeDB?: boolean;
  durationMonths: number;
  isActive?: boolean;
}
```

---

## 5. Error Handling & UI Toast Mapping

| HTTP Code | Backend Message | Suggested Toast / Frontend Handling |
| :--- | :--- | :--- |
| `400 Bad Request` | `Invalid or inactive subscription plan` | Show alert: "This plan is no longer available. Please select another." |
| `403 Forbidden` | `An active subscription is required to post jobs` | Open the Plan Upgrade Modal / Redirect to `/recruiter/billing`. |
| `403 Forbidden` | `Job posting quota exceeded for your current subscription plan. Please upgrade.` | Toast: "You have used all your job posts for this cycle. Upgrade to post more." |
| `403 Forbidden` | `You do not have permission to manage billing for this company` | Toast: "Admin permissions required to modify company billing." |
| `404 Not Found` | `Company not found` | Redirect to company setup. |
| `409 Conflict` | `Cannot delete plan "X". Y active subscription(s) are using it.` | Open confirmation modal: "Cannot delete an active plan. Deactivate it instead?" |

---

## 6. Ready-to-Use API Service Code

Copy-paste this client into your frontend (e.g. `src/services/subscriptionService.ts`):

```typescript
import axios from 'axios';
import type { 
  PlansResponse, 
  SubscribeOrderResponse, 
  Subscription, 
  Transaction,
  AdminPlanPayload 
} from '../types/subscription';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
});

// Attach token dynamically from your auth store
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const subscriptionService = {
  // ── Recruiter Methods ─────────────────────────────────
  
  async getPlans(countryCode = 'US'): Promise<PlansResponse> {
    const res = await api.get<{ data: PlansResponse }>(`/subscriptions/plans`, {
      params: { countryCode },
    });
    return res.data.data;
  },

  async subscribeCompany(companyId: string, planId: string): Promise<SubscribeOrderResponse> {
    const res = await api.post<{ data: SubscribeOrderResponse }>(`/subscriptions`, {
      companyId,
      planId,
    });
    return res.data.data;
  },

  async cancelSubscription(companyId: string): Promise<Subscription> {
    const res = await api.delete<{ data: Subscription }>(`/subscriptions`, {
      data: { companyId },
    });
    return res.data.data;
  },

  async getTransactions(companyId: string): Promise<Transaction[]> {
    const res = await api.get<{ data: Transaction[] }>(`/subscriptions/transactions`, {
      params: { companyId },
    });
    return res.data.data;
  },

  // ── Admin Methods ─────────────────────────────────────
  
  async getAdminPlans(active?: boolean): Promise<AdminPlanPayload[]> {
    const res = await api.get<{ data: AdminPlanPayload[] }>(`/admin/plans`, {
      params: active !== undefined ? { active: String(active) } : {},
    });
    return res.data.data;
  },

  async createPlan(payload: AdminPlanPayload): Promise<AdminPlanPayload> {
    const res = await api.post<{ data: AdminPlanPayload }>(`/admin/plans`, payload);
    return res.data.data;
  },

  async updatePlan(id: string, payload: Partial<AdminPlanPayload>): Promise<AdminPlanPayload> {
    const res = await api.patch<{ data: AdminPlanPayload }>(`/admin/plans/${id}`, payload);
    return res.data.data;
  },

  async deletePlan(id: string): Promise<void> {
    await api.delete(`/admin/plans/${id}`);
  },

  async processRefund(transactionId: string, reason: string, amount: number | null = null): Promise<Transaction> {
    const res = await api.post<{ data: Transaction }>(`/admin/transactions/${transactionId}/refund`, {
      reason,
      amount,
    });
    return res.data.data;
  },

  async getOverviewMetrics() {
    const res = await api.get(`/admin/reports/overview`);
    return res.data.data.metrics;
  }
};
```
