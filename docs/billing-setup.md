# Billing Setup

The product uses a `BillingProvider` interface.

Local:

```bash
BILLING_PROVIDER=mock
MOCK_BILLING=true
```

Production options:

- RevenueCat provider.
- StoreKit and Google Play provider adapters.

Rules:

- Client purchase state is not authoritative.
- Provider webhooks update server entitlements.
- Products: `MONTHLY`, `YEARLY`.
- Entitlements: `FREE`, `TRIAL`, `PREMIUM`, `EXPIRED`.
