# Requirements Traceability Matrix (RTM)

| Req ID | Requirement Description | Domain Module | Database Entities | Business Rules | Test Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-01** | Multi-branch tenant isolation & staff scoping | Organization | `organizations`, `branches`, `users`, `user_roles` | BR-ORG-01 | Integration test on unauthorized branch data query |
| **REQ-02** | Customer 360 & KYC document management | Customer / KYC | `customers`, `customer_kyc_documents` | BR-CUST-01 | Unit test on NIDA uniqueness and KYC state machine |
| **REQ-03** | Group lending, meeting & member guarantee tracking | Group | `lending_groups`, `group_members` | BR-GRP-01 | Test group creation, member threshold, attendance verification |
| **REQ-04** | Parametric loan product definition | Product | `loan_products` | BR-PROD-01 | Validation test of constraints (min/max amount, interest terms) |
| **REQ-05** | Loan Origination, Assessment & Multi-tier approval | Origination | `loan_applications`, `loan_assessments`, `loan_approvals` | BR-APPR-01 | Maker-checker segregation and threshold tier test |
| **REQ-06** | Deterministic Repayment Schedule Generator | Engine | `loan_installments`, `loans` | BR-SCHED-01, BR-GRACE-01 | Math property tests on Flat, Declining, PMT formulas |
| **REQ-07** | Controlled Loan Disbursement | Servicing | `loans`, `journal_entries`, `journal_lines` | BR-DISB-01 | Disbursement gate validation & automated GL entry creation |
| **REQ-08** | Payment Intake & Cascade Allocation Engine | Payment | `payments`, `payment_allocations`, `loan_installments` | BR-ALLOC-01, BR-PART-01, BR-OVER-01 | Exact decimal allocation order & partial payment test |
| **REQ-09** | Non-destructive Payment Reversals | Payment | `payment_reversals`, `payments`, `journal_entries` | BR-REV-01 | Compensating reversal journal entry and schedule restoration |
| **REQ-10** | Arrears Engine & PAR Analytics | Risk / Reporting | `loans`, `loan_installments` | BR-ARR-01 | Aging bucket test (PAR1, PAR7, PAR30, PAR60, PAR90) |
| **REQ-11** | Savings Ledger with Transaction Audit | Savings | `savings_accounts`, `savings_transactions` | BR-ACC-01 | Balance consistency and concurrent deposit/withdrawal test |
| **REQ-12** | Real-time Balanced General Ledger | Accounting | `chart_of_accounts`, `journal_entries`, `journal_lines` | BR-ACC-01 | Invariant test: Sum(Debit) == Sum(Credit) enforcement |
| **REQ-13** | Mobile Money Provider Webhook Abstraction | Integration | `provider_transactions` | BR-MOMO-01 | M-Pesa/Airtel idempotency and signature verification test |
| **REQ-14** | Offline-First Field Synchronization | Sync | `offline_sync_records` | BR-OFF-01 | Duplicate replay idempotency & conflict resolution test |
| **REQ-15** | Granular Immutable Audit Logging | Audit | `audit_logs` | BR-ACC-01 | Before/After state capture on mutation operations |
