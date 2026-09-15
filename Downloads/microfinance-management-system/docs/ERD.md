# Entity Relationship Document (ERD) & Database Schema Specification
**RDBMS:** PostgreSQL 15+
**Data Types Standard:** UUIDv4 Primary Keys, `numeric(18, 4)` for monetary figures, `timestamptz` for audit/temporal points.

## 1. Organization & Security Core
### `organizations`
- `id`: UUID (PK)
- `name`: VARCHAR(150) NOT NULL
- `registration_number`: VARCHAR(100) UNIQUE NOT NULL
- `tax_identification_number`: VARCHAR(50) UNIQUE NOT NULL (TIN)
- `currency_code`: VARCHAR(3) DEFAULT 'TZS' NOT NULL
- `country_code`: VARCHAR(2) DEFAULT 'TZ' NOT NULL
- `created_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
- `updated_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL

### `branches`
- `id`: UUID (PK)
- `organization_id`: UUID (FK -> organizations.id) NOT NULL
- `branch_code`: VARCHAR(20) UNIQUE NOT NULL
- `name`: VARCHAR(100) NOT NULL
- `region`: VARCHAR(100) NOT NULL
- `district`: VARCHAR(100) NOT NULL
- `address`: TEXT NOT NULL
- `phone`: VARCHAR(30) NOT NULL
- `status`: VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'CLOSED'))
- `created_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
- `updated_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL

### `users`
- `id`: UUID (PK)
- `branch_id`: UUID (FK -> branches.id) NOT NULL
- `username`: VARCHAR(50) UNIQUE NOT NULL
- `email`: VARCHAR(150) UNIQUE NOT NULL
- `password_hash`: VARCHAR(255) NOT NULL
- `first_name`: VARCHAR(100) NOT NULL
- `last_name`: VARCHAR(100) NOT NULL
- `phone`: VARCHAR(30) NOT NULL
- `status`: VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'LOCKED'))
- `failed_login_attempts`: INT DEFAULT 0 NOT NULL
- `last_login_at`: TIMESTAMPTZ
- `created_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
- `updated_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL

### `roles` & `permissions`
- `roles`: `id` (UUID PK), `name` (VARCHAR(50) UNIQUE), `description` (TEXT), `is_system` (BOOLEAN DEFAULT FALSE)
- `permissions`: `id` (UUID PK), `code` (VARCHAR(100) UNIQUE NOT NULL), `module` (VARCHAR(50) NOT NULL), `description` (TEXT)
- `role_permissions`: `role_id` (FK), `permission_id` (FK), PRIMARY KEY (role_id, permission_id)
- `user_roles`: `user_id` (FK), `role_id` (FK), PRIMARY KEY (user_id, role_id)

## 2. Customers & KYC
### `customers`
- `id`: UUID (PK)
- `customer_number`: VARCHAR(50) UNIQUE NOT NULL (Format: CUST-YYYYMMDD-XXXX)
- `branch_id`: UUID (FK -> branches.id) NOT NULL
- `first_name`: VARCHAR(100) NOT NULL
- `middle_name`: VARCHAR(100)
- `last_name`: VARCHAR(100) NOT NULL
- `date_of_birth`: DATE NOT NULL
- `gender`: VARCHAR(10) NOT NULL CHECK (gender IN ('MALE', 'FEMALE', 'OTHER'))
- `marital_status`: VARCHAR(20)
- `phone_primary`: VARCHAR(30) NOT NULL
- `phone_secondary`: VARCHAR(30)
- `email`: VARCHAR(150)
- `national_id_number`: VARCHAR(50) UNIQUE (NIDA)
- `status`: VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL CHECK (status IN ('ACTIVE', 'PENDING_KYC', 'DORMANT', 'BLACKLISTED', 'DECEASED'))
- `created_by`: UUID (FK -> users.id) NOT NULL
- `created_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
- `updated_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL

### `customer_kyc_documents`
- `id`: UUID (PK)
- `customer_id`: UUID (FK -> customers.id) NOT NULL
- `document_type`: VARCHAR(50) NOT NULL CHECK (document_type IN ('NIDA', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID', 'LOCAL_GOV_LETTER', 'OTHER'))
- `document_number`: VARCHAR(100) NOT NULL
- `issue_date`: DATE
- `expiry_date`: DATE
- `storage_reference`: VARCHAR(500) NOT NULL (S3 / MinIO path)
- `verification_status`: VARCHAR(20) DEFAULT 'PENDING' NOT NULL CHECK (verification_status IN ('PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED', 'EXPIRED'))
- `verified_by`: UUID (FK -> users.id)
- `verified_at`: TIMESTAMPTZ
- `rejection_reason`: TEXT
- `created_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL

## 3. Group Lending
### `lending_groups`
- `id`: UUID (PK)
- `group_number`: VARCHAR(50) UNIQUE NOT NULL (Format: GRP-YYYY-XXXX)
- `branch_id`: UUID (FK -> branches.id) NOT NULL
- `name`: VARCHAR(150) NOT NULL
- `leader_customer_id`: UUID (FK -> customers.id) NOT NULL
- `loan_officer_id`: UUID (FK -> users.id) NOT NULL
- `meeting_frequency`: VARCHAR(20) NOT NULL CHECK (meeting_frequency IN ('WEEKLY', 'BIWEEKLY', 'MONTHLY'))
- `meeting_day_of_week`: INT CHECK (meeting_day_of_week BETWEEN 1 AND 7)
- `status`: VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'CLOSED'))
- `created_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL

### `group_members`
- `id`: UUID (PK)
- `group_id`: UUID (FK -> lending_groups.id) NOT NULL
- `customer_id`: UUID (FK -> customers.id) NOT NULL
- `role_in_group`: VARCHAR(30) DEFAULT 'MEMBER' NOT NULL CHECK (role_in_group IN ('LEADER', 'SECRETARY', 'TREASURER', 'MEMBER'))
- `joined_at`: DATE NOT NULL
- `left_at`: DATE
- `status`: VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'EXPELLED'))
- UNIQUE (group_id, customer_id)

## 4. Loan Products & Origination
### `loan_products`
- `id`: UUID (PK)
- `organization_id`: UUID (FK -> organizations.id) NOT NULL
- `product_code`: VARCHAR(30) UNIQUE NOT NULL
- `name`: VARCHAR(100) NOT NULL
- `min_principal`: NUMERIC(18, 4) NOT NULL
- `max_principal`: NUMERIC(18, 4) NOT NULL
- `interest_method`: VARCHAR(30) NOT NULL CHECK (interest_method IN ('FLAT', 'DECLINING_BALANCE', 'EQUAL_INSTALLMENT'))
- `day_count_convention`: VARCHAR(20) NOT NULL CHECK (day_count_convention IN ('ACTUAL_365', 'ACTUAL_360', '30_360'))
- `annual_nominal_rate`: NUMERIC(8, 4) NOT NULL
- `repayment_frequency`: VARCHAR(20) NOT NULL CHECK (repayment_frequency IN ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'))
- `min_term`: INT NOT NULL
- `max_term`: INT NOT NULL
- `grace_period_type`: VARCHAR(30) DEFAULT 'NONE' NOT NULL CHECK (grace_period_type IN ('NONE', 'PRINCIPAL_ONLY', 'PRINCIPAL_AND_INTEREST'))
- `grace_period_installments`: INT DEFAULT 0 NOT NULL
- `payment_allocation_strategy`: VARCHAR(50) DEFAULT 'PENALTY_FEE_INTEREST_PRINCIPAL' NOT NULL
- `overpayment_policy`: VARCHAR(30) DEFAULT 'NEXT_INSTALLMENT' NOT NULL CHECK (overpayment_policy IN ('NEXT_INSTALLMENT', 'PRINCIPAL_PREPAYMENT', 'CUSTOMER_CREDIT'))
- `status`: VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED'))

### `loan_applications`
- `id`: UUID (PK)
- `application_number`: VARCHAR(50) UNIQUE NOT NULL
- `branch_id`: UUID (FK -> branches.id) NOT NULL
- `customer_id`: UUID (FK -> customers.id) NOT NULL
- `group_id`: UUID (FK -> lending_groups.id) NULL
- `product_id`: UUID (FK -> loan_products.id) NOT NULL
- `applied_principal`: NUMERIC(18, 4) NOT NULL
- `approved_principal`: NUMERIC(18, 4)
- `term_installments`: INT NOT NULL
- `purpose`: TEXT NOT NULL
- `status`: VARCHAR(30) DEFAULT 'DRAFT' NOT NULL CHECK (status IN (
    'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ASSESSED', 'PENDING_APPROVAL',
    'APPROVED', 'REJECTED', 'CANCELLED', 'READY_FOR_DISBURSEMENT', 'DISBURSED'
  ))
- `assigned_loan_officer_id`: UUID (FK -> users.id)
- `created_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
- `updated_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL

### `loan_assessments`
- `id`: UUID (PK)
- `application_id`: UUID (FK -> loan_applications.id) NOT NULL
- `assessor_id`: UUID (FK -> users.id) NOT NULL
- `monthly_income`: NUMERIC(18, 4) NOT NULL
- `monthly_expenses`: NUMERIC(18, 4) NOT NULL
- `disposable_income`: NUMERIC(18, 4) NOT NULL
- `debt_to_income_ratio`: NUMERIC(8, 4) NOT NULL
- `credit_risk_score`: INT
- `risk_grade`: VARCHAR(20) CHECK (risk_grade IN ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'))
- `recommendation`: VARCHAR(30) NOT NULL CHECK (recommendation IN ('RECOMMEND_APPROVE', 'RECOMMEND_REJECT', 'CONDITIONALLY_APPROVE'))
- `notes`: TEXT NOT NULL
- `created_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL

### `loan_approvals`
- `id`: UUID (PK)
- `application_id`: UUID (FK -> loan_applications.id) NOT NULL
- `approver_id`: UUID (FK -> users.id) NOT NULL
- `approval_level`: VARCHAR(30) NOT NULL CHECK (approval_level IN ('BRANCH_MANAGER', 'REGIONAL_MANAGER', 'HEAD_OFFICE'))
- `decision`: VARCHAR(20) NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED', 'RETURNED_FOR_REWORK'))
- `approved_amount`: NUMERIC(18, 4)
- `comments`: TEXT NOT NULL
- `created_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL

## 5. Loan Servicing & Schedules
### `loans`
- `id`: UUID (PK)
- `loan_account_number`: VARCHAR(50) UNIQUE NOT NULL (Format: LN-YYYY-XXXXXX)
- `application_id`: UUID (FK -> loan_applications.id) UNIQUE NOT NULL
- `customer_id`: UUID (FK -> customers.id) NOT NULL
- `branch_id`: UUID (FK -> branches.id) NOT NULL
- `product_id`: UUID (FK -> loan_products.id) NOT NULL
- `group_id`: UUID (FK -> lending_groups.id) NULL
- `disbursed_principal`: NUMERIC(18, 4) NOT NULL
- `outstanding_principal`: NUMERIC(18, 4) NOT NULL
- `outstanding_interest`: NUMERIC(18, 4) NOT NULL
- `outstanding_fees`: NUMERIC(18, 4) NOT NULL
- `outstanding_penalties`: NUMERIC(18, 4) NOT NULL
- `total_outstanding`: NUMERIC(18, 4) NOT NULL
- `days_in_arrears`: INT DEFAULT 0 NOT NULL
- `status`: VARCHAR(30) DEFAULT 'ACTIVE' NOT NULL CHECK (status IN (
    'ACTIVE', 'IN_ARREARS', 'PAID_OFF', 'CLOSED', 'RESCHEDULED', 'RESTRUCTURED', 'WRITTEN_OFF'
  ))
- `disbursed_at`: TIMESTAMPTZ NOT NULL
- `disbursed_by`: UUID (FK -> users.id) NOT NULL
- `maturity_date`: DATE NOT NULL

### `loan_installments`
- `id`: UUID (PK)
- `loan_id`: UUID (FK -> loans.id) NOT NULL
- `installment_number`: INT NOT NULL
- `due_date`: DATE NOT NULL
- `principal_due`: NUMERIC(18, 4) NOT NULL
- `interest_due`: NUMERIC(18, 4) NOT NULL
- `fee_due`: NUMERIC(18, 4) DEFAULT 0 NOT NULL
- `penalty_due`: NUMERIC(18, 4) DEFAULT 0 NOT NULL
- `principal_paid`: NUMERIC(18, 4) DEFAULT 0 NOT NULL
- `interest_paid`: NUMERIC(18, 4) DEFAULT 0 NOT NULL
- `fee_paid`: NUMERIC(18, 4) DEFAULT 0 NOT NULL
- `penalty_paid`: NUMERIC(18, 4) DEFAULT 0 NOT NULL
- `status`: VARCHAR(20) DEFAULT 'PENDING' NOT NULL CHECK (status IN ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'WAIVED'))
- `created_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
- UNIQUE (loan_id, installment_number)

## 6. Payments, Allocations & Reversals
### `payments`
- `id`: UUID (PK)
- `receipt_number`: VARCHAR(50) UNIQUE NOT NULL (Format: RCP-YYYYMMDD-XXXXXX)
- `loan_id`: UUID (FK -> loans.id) NOT NULL
- `branch_id`: UUID (FK -> branches.id) NOT NULL
- `payment_method`: VARCHAR(30) NOT NULL CHECK (payment_method IN ('CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'SAVINGS_OFFSET'))
- `payment_channel_reference`: VARCHAR(100) -- e.g. M-Pesa transaction ID
- `amount`: NUMERIC(18, 4) NOT NULL CHECK (amount > 0)
- `payment_date`: TIMESTAMPTZ NOT NULL
- `received_by`: UUID (FK -> users.id) NOT NULL
- `idempotency_key`: VARCHAR(100) UNIQUE NOT NULL
- `is_reversed`: BOOLEAN DEFAULT FALSE NOT NULL
- `created_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL

### `payment_allocations`
- `id`: UUID (PK)
- `payment_id`: UUID (FK -> payments.id) NOT NULL
- `installment_id`: UUID (FK -> loan_installments.id) NOT NULL
- `allocated_principal`: NUMERIC(18, 4) DEFAULT 0 NOT NULL
- `allocated_interest`: NUMERIC(18, 4) DEFAULT 0 NOT NULL
- `allocated_fee`: NUMERIC(18, 4) DEFAULT 0 NOT NULL
- `allocated_penalty`: NUMERIC(18, 4) DEFAULT 0 NOT NULL
- `created_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL

### `payment_reversals`
- `id`: UUID (PK)
- `payment_id`: UUID (FK -> payments.id) UNIQUE NOT NULL
- `reason`: TEXT NOT NULL
- `reversed_by`: UUID (FK -> users.id) NOT NULL
- `approved_by`: UUID (FK -> users.id) NOT NULL
- `reversed_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
- `journal_reversal_entry_id`: UUID NOT NULL

## 7. Savings Core
### `savings_accounts`
- `id`: UUID (PK)
- `account_number`: VARCHAR(50) UNIQUE NOT NULL (Format: SA-YYYY-XXXXXX)
- `customer_id`: UUID (FK -> customers.id) NOT NULL
- `branch_id`: UUID (FK -> branches.id) NOT NULL
- `product_type`: VARCHAR(30) NOT NULL CHECK (product_type IN ('VOLUNTARY', 'COMPULSORY_COLLATERAL', 'GROUP_POOL'))
- `interest_rate`: NUMERIC(8, 4) DEFAULT 0 NOT NULL
- `balance`: NUMERIC(18, 4) DEFAULT 0 NOT NULL CHECK (balance >= 0)
- `status`: VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL CHECK (status IN ('ACTIVE', 'DORMANT', 'FROZEN', 'CLOSED'))
- `created_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL

### `savings_transactions`
- `id`: UUID (PK)
- `savings_account_id`: UUID (FK -> savings_accounts.id) NOT NULL
- `transaction_type`: VARCHAR(30) NOT NULL CHECK (transaction_type IN ('DEPOSIT', 'WITHDRAWAL', 'INTEREST_CREDIT', 'FEE_DEDUCTION', 'LOAN_OFFSET'))
- `amount`: NUMERIC(18, 4) NOT NULL CHECK (amount > 0)
- `balance_before`: NUMERIC(18, 4) NOT NULL
- `balance_after`: NUMERIC(18, 4) NOT NULL
- `reference_id`: VARCHAR(100) NOT NULL
- `posted_by`: UUID (FK -> users.id) NOT NULL
- `idempotency_key`: VARCHAR(100) UNIQUE NOT NULL
- `created_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL

## 8. Double-Entry Accounting (General Ledger)
### `chart_of_accounts`
- `id`: UUID (PK)
- `account_code`: VARCHAR(30) UNIQUE NOT NULL (e.g. 1010, 1020, 2010)
- `account_name`: VARCHAR(100) NOT NULL
- `account_type`: VARCHAR(30) NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'))
- `normal_balance`: VARCHAR(10) NOT NULL CHECK (normal_balance IN ('DEBIT', 'CREDIT'))
- `status`: VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL

### `journal_entries`
- `id`: UUID (PK)
- `entry_number`: VARCHAR(50) UNIQUE NOT NULL
- `branch_id`: UUID (FK -> branches.id) NOT NULL
- `transaction_date`: DATE NOT NULL
- `narration`: TEXT NOT NULL
- `reference_type`: VARCHAR(50) NOT NULL -- LOAN_DISBURSEMENT, LOAN_REPAYMENT, SAVINGS_DEPOSIT, FEE
- `reference_id`: UUID NOT NULL
- `posted_by`: UUID (FK -> users.id) NOT NULL
- `created_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL

### `journal_lines`
- `id`: UUID (PK)
- `journal_entry_id`: UUID (FK -> journal_entries.id) NOT NULL
- `account_id`: UUID (FK -> chart_of_accounts.id) NOT NULL
- `entry_type`: VARCHAR(10) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT'))
- `amount`: NUMERIC(18, 4) NOT NULL CHECK (amount > 0)
- `created_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL

## 9. Mobile Money Integration & Webhook Ingestion
### `provider_transactions`
- `id`: UUID (PK)
- `provider`: VARCHAR(30) NOT NULL CHECK (provider IN ('MPESA', 'AIRTEL_MONEY', 'TIGO_PESA', 'BANK_API'))
- `provider_tx_id`: VARCHAR(100) UNIQUE NOT NULL
- `phone_number`: VARCHAR(30) NOT NULL
- `bill_ref_number`: VARCHAR(100) NOT NULL
- `amount`: NUMERIC(18, 4) NOT NULL
- `raw_payload`: JSONB NOT NULL
- `signature_verified`: BOOLEAN DEFAULT FALSE NOT NULL
- `processing_status`: VARCHAR(30) DEFAULT 'PENDING' NOT NULL CHECK (processing_status IN ('PENDING', 'PROCESSED', 'FAILED', 'DUPLICATE', 'REJECTED'))
- `error_message`: TEXT
- `created_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL

## 10. Offline Sync Queue & Idempotency
### `offline_sync_records`
- `id`: UUID (PK)
- `device_id`: VARCHAR(100) NOT NULL
- `user_id`: UUID (FK -> users.id) NOT NULL
- `operation_type`: VARCHAR(50) NOT NULL
- `idempotency_key`: VARCHAR(100) UNIQUE NOT NULL
- `payload`: JSONB NOT NULL
- `client_timestamp`: TIMESTAMPTZ NOT NULL
- `sync_status`: VARCHAR(20) DEFAULT 'PENDING' NOT NULL CHECK (sync_status IN ('PENDING', 'SYNCED', 'CONFLICT', 'FAILED'))
- `conflict_reason`: TEXT
- `processed_at`: TIMESTAMPTZ

## 11. Immutable Audit Trails
### `audit_logs`
- `id`: UUID (PK)
- `user_id`: UUID NULL (NULL for system events)
- `action`: VARCHAR(100) NOT NULL
- `entity_name`: VARCHAR(100) NOT NULL
- `entity_id`: VARCHAR(100) NOT NULL
- `before_state`: JSONB
- `after_state`: JSONB
- `ip_address`: VARCHAR(45)
- `user_agent`: TEXT
- `created_at`: TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
