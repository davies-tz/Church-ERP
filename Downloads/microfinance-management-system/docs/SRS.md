# System Requirements Specification (SRS) - Microfinance Core Management System
**Target Jurisdiction:** Tanzania (BOT Microfinance Regulations, NIDA/KYC Standards, Mobile Money: M-Pesa, Airtel Money, Tigo Pesa)
**Architecture Pattern:** Modular Monolith with Event-Driven Financial Core & Offline-First Field Sync

## 1. Scope & System Roles
1. **Head Office (HO)**: Global portfolio analytics, policy/product configuration, global GL, high-value approval (> 10,000,000 TZS configurable).
2. **Regional Managers**: Regional branch oversight, intermediate approval tier (1,000,001 – 10,000,000 TZS configurable).
3. **Branch Managers**: Local branch oversight, vault/till approvals, loan approvals up to tier threshold (≤ 1,000,000 TZS configurable).
4. **Loan Officers / Field Agents**: Group formation, customer onboarding, loan applications, appraisals, field collections, attendance.
5. **Collection Officers**: Arrears tracking, restructuring requests, recovery logging.
6. **Accountants**: Double-entry journal vouchers, chart of accounts management, reconciliation (mobile money, cash till, bank).
7. **Auditors**: Read-only immutable access to full audit trails, journal ledgers, change diffs.
8. **System Administrators**: User RBAC, security parameters, system integrations, audit review.
9. **Customers**: Self-service balance inquiries, mobile money repayment triggers, statement views.

## 2. Functional Domains
- **Core Organization & Branch Hierarchies**
- **Customer 360 & KYC (NIDA, Passport, Voter, Driver License)**
- **Group Lending (Center/Group structures, solidarity mechanisms, attendance)**
- **Configurable Loan Products (Flat, Declining Balance, Equal Installment/Annuity)**
- **Deterministic Interest Engine (ACTUAL_365, ACTUAL_360, 30_360 conventions)**
- **Repayment Schedule Generator with configurable grace periods**
- **Multi-Level Maker-Checker Approval Workflows**
- **Disbursement & Payment Allocation Engine (Penalty, Fee, Interest, Principal cascades)**
- **Arrears Management & Dynamic PAR Classification (PAR1, PAR7, PAR30, PAR60, PAR90)**
- **Savings Ledger (Compulsory & Voluntary accounts, transaction-derived balances)**
- **Double-Entry General Ledger (Atomic posting, debit=credit invariants)**
- **Mobile Money Integration Abstraction (M-Pesa, Airtel Money, Tigo Pesa, Bank)**
- **Offline-First SQLite Synchronization with Idempotency Key guarantees**
- **Granular Audit Logging with full pre/post delta captures**
- **Deterministic Credit Risk Scoring**
