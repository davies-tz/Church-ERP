# Business Rules Catalogue & Financial Policy Invariants

| Rule ID | Module | Rule Summary | Configuration Status | Invariant Formula / Policy |
| :--- | :--- | :--- | :--- | :--- |
| **BR-ORG-01** | Multi-Tenancy | Customer & Loan Branch Scoping | HARD INVARIANT | Every customer and loan must belong to a branch. Branch data isolation enforced at data access layer. |
| **BR-CUST-01**| Customer & KYC | Unique Customer ID & Identification | HARD INVARIANT | Customer ID format `CUST-YYYYMMDD-XXXX`. NIDA / Passport unique across active accounts. |
| **BR-GRP-01** | Group Lending | Cross-Guarantorship & Attendance | CONFIGURABLE | Minimum members per group (default 5, max 30). Group loan eligibility requires attendance ≥ 80%. |
| **BR-PROD-01**| Loan Products | Interest Calculation Formula | CONFIGURABLE | Supports `FLAT`, `DECLINING_BALANCE`, `EQUAL_INSTALLMENT (PMT)`. Conventions: `ACTUAL_365`, `ACTUAL_360`, `30_360`. |
| **BR-SCHED-01**| Schedule Engine | Deterministic Schedule Invariant | HARD INVARIANT | Sum(Principal Due) == Disbursed Principal. Sum(Paid + Outstanding) == Total Expected. |
| **BR-GRACE-01**| Grace Periods | Amortization Moratorium | CONFIGURABLE | `NONE`, `PRINCIPAL_ONLY` (interest paid during grace), `PRINCIPAL_AND_INTEREST` (capitalized or deferred). |
| **BR-APPR-01**| Maker-Checker | Multi-Level Tier Approval | CONFIGURABLE | Maker cannot check/approve their own loan. Branch ≤ 1M TZS, Regional ≤ 10M TZS, HO > 10M TZS. |
| **BR-DISB-01**| Disbursement | Pre-requisite Verification Gate | HARD INVARIANT | Disbursement requires: KYC Verified + Approved + Valid Docs + No active delinquent loan. |
| **BR-ALLOC-01**| Payment Engine | Repayment Allocation Priority | CONFIGURABLE | Default order: Penalty -> Fees -> Interest -> Principal. Alternative: Principal -> Interest -> Fee -> Penalty. |
| **BR-PART-01**| Partial Repayment | Installment Status Lifecycle | HARD INVARIANT | Paid < Total Due transitions status to `PARTIALLY_PAID`. Installment remains open with remaining due balance. |
| **BR-OVER-01**| Overpayment | Excess Inflow Disposition | CONFIGURABLE | Policy: `NEXT_INSTALLMENT` (early amortization of future installment), `PRINCIPAL_PREPAYMENT`, or `CUSTOMER_CREDIT`. |
| **BR-REV-01** | Payment Reversal | Financial Non-Destruction | HARD INVARIANT | Soft-cancellation forbidden. Creates compensating `payment_reversals` record and inverse GL journal entry. |
| **BR-ARR-01** | Arrears & PAR | Portfolio at Risk Classification | CONFIGURABLE | Overdue Days = Current Date - Oldest Unpaid Installment Due Date. PAR1 (>0 days), PAR7 (>7), PAR30 (>30), PAR90 (>90). |
| **BR-ACC-01** | General Ledger | Balanced Double Entry | HARD INVARIANT | Sum(Debits) == Sum(Credits) on every journal entry before commit. Unbalanced vouchers trigger immediate transaction rollback. |
| **BR-MOMO-01**| Mobile Money | Webhook Idempotency & Verification | HARD INVARIANT | Provider transaction IDs deduplicated before processing. SHA256 / HMAC signature verified prior to execution. |
| **BR-OFF-01** | Offline Sync | Field Collector Conflict Resolution| CONFIGURABLE | Offline actions use UUIDv4 client idempotency keys. Duplicate keys return existing state. Financial conflicts route to `CONFLICT_QUEUE`. |
