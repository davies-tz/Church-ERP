import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import * as dotenv from 'dotenv';
import { getDb } from './src/db/index.ts';
import * as schema from './src/db/schema.ts';
import { seedDatabaseIfEmpty } from './src/db/seed.ts';
import { eq, desc, sql, and, or, inArray } from 'drizzle-orm';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// JWT Secret & Security
// Fails closed in production: refuses to start rather than sign tokens with a
// secret an attacker could read straight out of this source file.
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable must be set in production.');
  }
  console.warn('[SECURITY WARNING] JWT_SECRET is not set. Using an insecure development-only fallback. Set JWT_SECRET in your .env file.');
  return 'insecure-dev-only-secret-do-not-use-in-production';
})();

// Shared secret used to verify inbound mobile money provider webhooks.
const MOMO_WEBHOOK_SECRET = process.env.MOMO_WEBHOOK_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('MOMO_WEBHOOK_SECRET environment variable must be set in production.');
  }
  console.warn('[SECURITY WARNING] MOMO_WEBHOOK_SECRET is not set. Using an insecure development-only fallback. Set MOMO_WEBHOOK_SECRET in your .env file.');
  return 'insecure-dev-only-momo-secret-do-not-use-in-production';
})();

// Rate Limiting Store: IP/Identifier -> { count, firstAttempt, lockedUntil }
interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lockedUntil?: number;
}
const loginAttempts = new Map<string, AttemptRecord>();
const passwordResetOtps = new Map<string, { otp: string; expiresAt: number; identifier: string }>();

// Clean up stale attempts periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of loginAttempts.entries()) {
    if (record.lockedUntil && record.lockedUntil < now) {
      loginAttempts.delete(key);
    } else if (now - record.firstAttempt > 15 * 60 * 1000 && !record.lockedUntil) {
      loginAttempts.delete(key);
    }
  }
  for (const [key, otpRec] of passwordResetOtps.entries()) {
    if (otpRec.expiresAt < now) {
      passwordResetOtps.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Helper: Round currency to nearest Tanzanian Shilling (TZS has no cents in daily operations)
function roundCurrency(val: number): number {
  return Math.round(val);
}

// ==================== AUTHENTICATION / AUTHORIZATION MIDDLEWARE ====================

// Decodes and verifies the Bearer token on a request, if present. Returns null
// (never throws) when the token is missing, malformed, or expired.
function getRequesterFromToken(req: any): any | null {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
}

// Requires a valid Bearer token. On success, attaches the decoded payload as
// req.user. Every mutating route below must use this - a missing token must
// never silently fall through to an "assume authorized" default.
function requireAuth(req: any, res: any, next: any) {
  const requester = getRequesterFromToken(req);
  if (!requester) {
    return res.status(401).json({
      error: 'Authentication required. Please sign in again.',
      code: 'UNAUTHENTICATED',
    });
  }
  req.user = requester;
  next();
}

// Must be used after requireAuth. Rejects the request unless req.user.role is
// one of the allowed roles.
function requireRole(...allowedRoles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.', code: 'UNAUTHENTICATED' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: this action requires one of the following roles: ${allowedRoles.join(', ')}.`,
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }
    next();
  };
}

// Ensure seed data and database schema migration is populated lazily on first server start
let isDbInitialized = false;
async function initDb() {
  if (!isDbInitialized) {
    try {
      const { db } = getDb();
      await seedDatabaseIfEmpty();

      // Ensure commercial users have hashed passwords for default credentials 'Imara@2025'
      const defaultHash = bcrypt.hashSync('Imara@2025', 10);
      const userUpdates = [
        // Primary Manager Accounts
        { id: 'usr-amina', username: 'amina.manager', email: 'amina.kimaro@tusonge-mfi.co.tz', firstName: 'Amina', lastName: 'Kimaro', role: 'BRANCH_MANAGER' },
        { id: 'usr-amina-ho', username: 'amina.ho', email: 'amina.mwamba@tusonge-mfi.co.tz', firstName: 'Amina', lastName: 'Mwamba', role: 'HEAD_OFFICE_MANAGER' },
        // Field & Loan Officers
        { id: 'usr-baraka', username: 'baraka.field', email: 'baraka.mushi@tusonge-mfi.co.tz', firstName: 'Baraka', lastName: 'Mushi', role: 'FIELD_OFFICER' },
        { id: 'usr-baraka-bm', username: 'baraka.bm', email: 'baraka.mkumbo@tusonge-mfi.co.tz', firstName: 'Baraka', lastName: 'Mkumbo', role: 'BRANCH_MANAGER' },
        { id: 'usr-daudi', username: 'daudi.accountant', email: 'daudi.mrema@tusonge-mfi.co.tz', firstName: 'Daudi', lastName: 'Mrema', role: 'ACCOUNTANT' },
        { id: 'usr-daudi-lo', username: 'daudi.lo', email: 'daudi.kibona@tusonge-mfi.co.tz', firstName: 'Daudi', lastName: 'Kibona', role: 'LOAN_OFFICER' },
        // Auditors & Compliance
        { id: 'usr-neema', username: 'neema.auditor', email: 'neema.massawe@tusonge-mfi.co.tz', firstName: 'Neema', lastName: 'Massawe', role: 'AUDITOR' },
        { id: 'usr-neema-aud', username: 'neema.aud', email: 'neema.lyimo@tusonge-mfi.co.tz', firstName: 'Neema', lastName: 'Lyimo', role: 'AUDITOR' },
        { id: 'usr-aud-1', username: 'auditor', email: 'auditor@hudumamfi.co.tz', firstName: 'Mwajuma', lastName: 'Salum', role: 'AUDITOR' },
        // System Administrator
        { id: 'usr-admin', username: 'admin', email: 'admin@imara-mfi.co.tz', firstName: 'System', lastName: 'Admin', role: 'SUPER_ADMIN' },
        { id: 'usr-superadmin', username: 'superadmin', email: 'superadmin@imara-mfi.co.tz', firstName: 'Super', lastName: 'Admin', role: 'SUPER_ADMIN' },
        // Branch Operations & Cashiers
        { id: 'usr-bm-1', username: 'john.bm', email: 'john.mwangi@hudumamfi.co.tz', firstName: 'John', lastName: 'Mwangi', role: 'BRANCH_MANAGER' },
        { id: 'usr-co-1', username: 'neema.co', email: 'neema.amani@hudumamfi.co.tz', firstName: 'Neema', lastName: 'Amani', role: 'CREDIT_OFFICER' },
        { id: 'usr-rehema', username: 'rehema.co', email: 'rehema.shaban@tusonge-mfi.co.tz', firstName: 'Rehema', lastName: 'Shaban', role: 'COLLECTION_OFFICER' },
        { id: 'usr-cash-1', username: 'rehema.kimaro', email: 'rehema.kimaro@hudumamfi.co.tz', firstName: 'Rehema', lastName: 'Kimaro', role: 'CASHIER' },
        { id: 'usr-juma', username: 'juma.acc', email: 'juma.mussa@tusonge-mfi.co.tz', firstName: 'Juma', lastName: 'Mussa', role: 'ACCOUNTANT' },
      ];

      for (const u of userUpdates) {
        try {
          const [existing] = await db.select().from(schema.users).where(eq(schema.users.id, u.id));
          if (existing) {
            await db.update(schema.users).set({
              username: u.username,
              email: u.email,
              passwordHash: defaultHash,
              firstName: u.firstName,
              lastName: u.lastName,
              role: u.role,
              isActive: true,
              failedLoginAttempts: 0,
            }).where(eq(schema.users.id, u.id));
          } else {
            await db.insert(schema.users).values({
              id: u.id,
              username: u.username,
              email: u.email,
              passwordHash: defaultHash,
              firstName: u.firstName,
              lastName: u.lastName,
              role: u.role,
              branchId: 'br-kariakoo',
              preferredLanguage: 'en',
              isActive: true,
              failedLoginAttempts: 0,
            });
          }
        } catch (innerErr) {
          // ignore duplicate insert errors
        }
      }

      isDbInitialized = true;
    } catch (err) {
      console.error('Database seeding error:', err);
    }
  }
}

// ==================== AUTHENTICATION ROUTES ====================

// Helper to determine destination tab based on user commercial role
function getRoleRedirectTab(role: string): string {
  switch (role) {
    case 'FIELD_OFFICER':
    case 'LOAN_OFFICER':
    case 'COLLECTION_OFFICER':
    case 'CREDIT_OFFICER':
      return 'offline_sync'; // Field operations workspace
    case 'BRANCH_MANAGER':
      return 'dashboard'; // Branch executive dashboard
    case 'ACCOUNTANT':
    case 'CASHIER':
      return 'accounting'; // Accounting & General Ledger workspace
    case 'AUDITOR':
      return 'audit'; // Compliance & Audit trail workspace
    case 'HEAD_OFFICE_MANAGER':
    case 'ADMIN':
    case 'SUPER_ADMIN':
    default:
      return 'dashboard'; // Administration executive dashboard
  }
}

// Login: Authenticate with Username or Email and Password
app.post('/api/auth/login', async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const { identifier, password, rememberMe } = req.body;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/username and password are required' });
    }

    const cleanIdentifier = String(identifier).trim().toLowerCase();
    const cleanPassword = String(password).trim();
    const rateLimitKey = `${clientIp}_${cleanIdentifier}`;

    // Query user by email OR username (case-insensitive)
    const allUsers = await db.select().from(schema.users);
    let user = allUsers.find(
      (u) =>
        (u.email && u.email.toLowerCase() === cleanIdentifier) ||
        (u.username && u.username.toLowerCase() === cleanIdentifier)
    );

    // Aliases support so any known demo handle or prefix resolves directly
    if (!user) {
      if (cleanIdentifier === 'amina.manager' || cleanIdentifier === 'amina' || cleanIdentifier === 'amina.ho') {
        user = allUsers.find((u) => u.username === 'amina.manager' || u.username === 'amina.ho');
      } else if (cleanIdentifier === 'baraka.field' || cleanIdentifier === 'baraka' || cleanIdentifier === 'baraka.bm') {
        user = allUsers.find((u) => u.username === 'baraka.field' || u.username === 'baraka.bm');
      } else if (cleanIdentifier === 'daudi.accountant' || cleanIdentifier === 'daudi' || cleanIdentifier === 'daudi.lo') {
        user = allUsers.find((u) => u.username === 'daudi.accountant' || u.username === 'daudi.lo');
      } else if (cleanIdentifier === 'neema.auditor' || cleanIdentifier === 'neema' || cleanIdentifier === 'neema.aud') {
        user = allUsers.find((u) => u.username === 'neema.auditor' || u.username === 'neema.aud');
      } else if (cleanIdentifier === 'admin' || cleanIdentifier === 'superadmin' || cleanIdentifier === 'administrator') {
        user = allUsers.find((u) => u.username === 'admin' || u.username === 'superadmin' || u.role === 'SUPER_ADMIN');
      }
    }

    // Password verification: bcrypt hash comparison only. Seeded demo accounts
    // are given the real hash for "Imara@2025" in initDb() below, so the demo
    // credentials still work - there is no separate bypass for any account.
    let passwordMatches = false;
    if (user && user.passwordHash) {
      try {
        passwordMatches = bcrypt.compareSync(cleanPassword, user.passwordHash);
      } catch {
        passwordMatches = false;
      }
    }

    // Rate Limiting Check only applies to failing requests
    const now = Date.now();
    const attempt = loginAttempts.get(rateLimitKey);

    if (!user || !passwordMatches) {
      if (attempt && attempt.lockedUntil && attempt.lockedUntil > now) {
        const waitMinutes = Math.ceil((attempt.lockedUntil - now) / 60000);
        return res.status(429).json({
          error: `Account temporarily locked due to excessive failed attempts. Please retry in ${waitMinutes} minute(s).`,
          code: 'RATE_LIMITED',
        });
      }

      // Record failed attempt for rate limiting
      const prevCount = attempt ? attempt.count : 0;
      const newCount = prevCount + 1;
      let lockedUntil: number | undefined = undefined;

      if (newCount >= 8) {
        lockedUntil = now + 15 * 60 * 1000; // 15-minute lock out after 8 failures
      }

      loginAttempts.set(rateLimitKey, {
        count: newCount,
        firstAttempt: attempt ? attempt.firstAttempt : now,
        lockedUntil,
      });

      // Log failed authentication in audit log
      try {
        await db.insert(schema.auditLogs).values({
          id: `log-auth-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          userId: 'ANONYMOUS',
          userName: cleanIdentifier,
          userRole: 'UNAUTHENTICATED',
          action: 'AUTH_LOGIN_FAILED',
          entityName: 'USER_AUTH',
          entityId: cleanIdentifier,
          ipAddress: String(clientIp),
          details: `Failed sign-in attempt for identifier: ${cleanIdentifier}. Consecutive failure: ${newCount}`,
        });
      } catch (logErr) {
        console.warn('Audit log write error:', logErr);
      }

      return res.status(401).json({
        error: 'Invalid username/email or password.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Clear any previous failed attempts upon successful password
    loginAttempts.delete(rateLimitKey);

    // Check if account is disabled or suspended
    if (!user.isActive) {
      return res.status(403).json({
        error: 'Account is inactive or suspended. Please contact your system administrator.',
        code: 'ACCOUNT_DISABLED',
      });
    }

    // Success! Clear failed attempts
    loginAttempts.delete(rateLimitKey);

    // Update lastLoginAt
    await db.update(schema.users).set({
      lastLoginAt: new Date(),
      failedLoginAttempts: 0,
    }).where(eq(schema.users.id, user.id));

    // Sign JWT Token (30 days if rememberMe, otherwise 8 hours)
    const expiresIn = rememberMe ? '30d' : '8h';
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      branchId: user.branchId,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn });

    // Determine target workspace based on commercial role
    const redirectTab = getRoleRedirectTab(user.role);

    // Audit log successful authentication
    try {
      await db.insert(schema.auditLogs).values({
        id: `log-auth-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userRole: user.role,
        action: 'AUTH_LOGIN_SUCCESS',
        entityName: 'USER_AUTH',
        entityId: user.id,
        ipAddress: String(clientIp),
        details: `Successful authenticated sign-in as ${user.role} (${user.email}). Redirecting to ${redirectTab}.`,
      });
    } catch (logErr) {
      console.warn('Audit log write error:', logErr);
    }

    // Sanitized user object without password hash
    const sanitizedUser = {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: '+255 754 100 201',
      role: user.role,
      branchId: user.branchId || 'br-kariakoo',
      status: user.isActive ? 'ACTIVE' : 'INACTIVE',
      preferredLanguage: user.preferredLanguage || 'en',
    };

    res.json({
      token,
      user: sanitizedUser,
      redirectTab,
      expiresIn,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal authentication server error', details: err.message });
  }
});

// Verify Current Session / Token
app.get('/api/auth/me', async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Session token has expired or is invalid', code: 'SESSION_EXPIRED' });
    }

    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, decoded.id));
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User no longer active', code: 'USER_NOT_FOUND' });
    }

    const sanitizedUser = {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: '+255 754 100 201',
      role: user.role,
      branchId: user.branchId || 'br-kariakoo',
      status: user.isActive ? 'ACTIVE' : 'INACTIVE',
      preferredLanguage: user.preferredLanguage || 'en',
    };

    res.json({
      user: sanitizedUser,
      redirectTab: getRoleRedirectTab(user.role),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Logout Endpoint
app.post('/api/auth/logout', async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const { userId, userName, role } = req.body;

    if (userId) {
      await db.insert(schema.auditLogs).values({
        id: `log-auth-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId,
        userName: userName || 'User',
        userRole: role || 'STAFF',
        action: 'AUTH_LOGOUT',
        entityName: 'USER_AUTH',
        entityId: userId,
        ipAddress: req.ip || '127.0.0.1',
        details: `User signed out cleanly from terminal session.`,
      });
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Forgot Password OTP Generation
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({ error: 'Email or username is required' });
    }

    const cleanIdentifier = String(identifier).trim().toLowerCase();
    const allUsers = await db.select().from(schema.users);
    const user = allUsers.find(
      (u) =>
        (u.email && u.email.toLowerCase() === cleanIdentifier) ||
        (u.username && u.username.toLowerCase() === cleanIdentifier)
    );

    // Generate a secure 6-digit verification code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins validity

    passwordResetOtps.set(cleanIdentifier, {
      otp,
      expiresAt,
      identifier: cleanIdentifier,
    });

    if (user) {
      await db.insert(schema.auditLogs).values({
        id: `log-pwd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userRole: user.role,
        action: 'PASSWORD_RESET_REQUESTED',
        entityName: 'USER_AUTH',
        entityId: user.id,
        ipAddress: req.ip || '127.0.0.1',
        details: `Password reset OTP generated for account ${cleanIdentifier}. Channel: SMS/Email dispatch.`,
      });
    }

    // Return friendly generic response (with demonstration OTP for testing ease)
    res.json({
      success: true,
      message: 'If an account matches your entry, a 6-digit password reset OTP has been dispatched.',
      demoOtp: otp, // For rapid testing & evaluation
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset Password with OTP
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const { identifier, otp, newPassword } = req.body;

    if (!identifier || !otp || !newPassword) {
      return res.status(400).json({ error: 'Identifier, OTP, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const cleanIdentifier = String(identifier).trim().toLowerCase();
    const stored = passwordResetOtps.get(cleanIdentifier);

    if (!stored || stored.expiresAt < Date.now() || stored.otp !== String(otp).trim()) {
      return res.status(400).json({ error: 'Invalid or expired OTP verification code' });
    }

    const allUsers = await db.select().from(schema.users);
    const user = allUsers.find(
      (u) =>
        (u.email && u.email.toLowerCase() === cleanIdentifier) ||
        (u.username && u.username.toLowerCase() === cleanIdentifier)
    );

    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    await db.update(schema.users).set({
      passwordHash: newHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
    }).where(eq(schema.users.id, user.id));

    passwordResetOtps.delete(cleanIdentifier);

    await db.insert(schema.auditLogs).values({
      id: `log-pwd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      action: 'PASSWORD_RESET_COMPLETED',
      entityName: 'USER_AUTH',
      entityId: user.id,
      ipAddress: req.ip || '127.0.0.1',
      details: `Password was successfully updated via verified OTP for account ${cleanIdentifier}.`,
    });

    res.json({ success: true, message: 'Password has been updated successfully. You can now sign in.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Demo accounts endpoint for testing different commercial roles
app.get('/api/auth/demo-users', async (req, res) => {
  res.json([
    {
      role: 'LOAN_OFFICER',
      roleLabel: 'Field Officer (Loan Officer)',
      username: 'daudi.lo',
      email: 'daudi.kibona@tusonge-mfi.co.tz',
      name: 'Daudi Kibona',
      targetWorkspace: 'Field Operations & Sync',
      branch: 'Kariakoo Main',
      password: 'Imara@2025',
    },
    {
      role: 'BRANCH_MANAGER',
      roleLabel: 'Branch Manager',
      username: 'baraka.bm',
      email: 'baraka.mkumbo@tusonge-mfi.co.tz',
      name: 'Baraka Mkumbo',
      targetWorkspace: 'Branch Executive Dashboard',
      branch: 'Kariakoo Main',
      password: 'Imara@2025',
    },
    {
      role: 'ACCOUNTANT',
      roleLabel: 'Chief Accountant',
      username: 'juma.acc',
      email: 'juma.mussa@tusonge-mfi.co.tz',
      name: 'Juma Mussa',
      targetWorkspace: 'General Ledger & COA',
      branch: 'Kariakoo Main',
      password: 'Imara@2025',
    },
    {
      role: 'HEAD_OFFICE_MANAGER',
      roleLabel: 'Managing Director / Admin',
      username: 'amina.ho',
      email: 'amina.mwamba@tusonge-mfi.co.tz',
      name: 'Amina Mwamba',
      targetWorkspace: 'Institutional Control Center',
      branch: 'Head Office',
      password: 'Imara@2025',
    },
  ]);
});

// ==================== HIERARCHICAL STAFF & USER MANAGEMENT API ====================

// List all staff members
app.get('/api/staff', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const branchFilter = req.query.branchId as string;

    let query = db.select().from(schema.users);
    const allUsers = await query;

    const filtered = branchFilter && branchFilter !== 'ALL'
      ? allUsers.filter((u) => u.branchId === branchFilter)
      : allUsers;

    const sanitized = filtered.map((u) => ({
      id: u.id,
      username: u.username || u.email.split('@')[0],
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: '+255 754 100 201',
      role: u.role,
      branchId: u.branchId || 'br-kariakoo',
      status: u.isActive ? 'ACTIVE' : 'INACTIVE',
      preferredLanguage: u.preferredLanguage || 'en',
      lastLoginAt: u.lastLoginAt,
    }));

    res.json(sanitized);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create new employee account (Privileged - Manager & Super Admin ONLY)
app.post('/api/staff', requireAuth, requireRole('SUPER_ADMIN', 'HEAD_OFFICE_MANAGER', 'BRANCH_MANAGER'), async (req: any, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const requester = req.user;
    const requesterRole = requester.role;

    const { username, email, firstName, lastName, role, branchId, phone, initialPassword } = req.body;

    if (!email || !firstName || !lastName || !role) {
      return res.status(400).json({ error: 'First name, last name, email, and role are required.' });
    }

    const validRoles = [
      'SUPER_ADMIN',
      'HEAD_OFFICE_MANAGER',
      'MANAGER',
      'BRANCH_MANAGER',
      'FIELD_OFFICER',
      'LOAN_OFFICER',
      'ACCOUNTANT',
      'AUDITOR',
      'CUSTOMER',
    ];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    const newUserId = `usr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const cleanUsername = (username || `${firstName.toLowerCase()}.${lastName.toLowerCase()}`).trim();
    const passwordHash = bcrypt.hashSync(initialPassword || 'Imara@2025', 10);

    await db.insert(schema.users).values({
      id: newUserId,
      username: cleanUsername,
      email: email.trim().toLowerCase(),
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role,
      branchId: branchId || 'br-kariakoo',
      preferredLanguage: 'en',
      isActive: true,
      failedLoginAttempts: 0,
    });

    // Audit log account creation
    await db.insert(schema.auditLogs).values({
      id: `log-staff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: requester.id,
      userName: `${requester.firstName} ${requester.lastName}`,
      userRole: requesterRole,
      action: 'EMPLOYEE_ACCOUNT_CREATED',
      entityName: 'USERS',
      entityId: newUserId,
      ipAddress: req.ip || '127.0.0.1',
      details: `Created new employee account: ${firstName} ${lastName} (${cleanUsername}) with role ${role} assigned to branch ${branchId || 'br-kariakoo'}.`,
    });

    const newEmployee = {
      id: newUserId,
      username: cleanUsername,
      firstName,
      lastName,
      email,
      phone: phone || '+255 754 000 000',
      role,
      branchId: branchId || 'br-kariakoo',
      status: 'ACTIVE',
      preferredLanguage: 'en',
    };

    res.status(201).json(newEmployee);
  } catch (err: any) {
    console.error('Staff creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update employee account
app.put('/api/staff/:id', requireAuth, requireRole('SUPER_ADMIN', 'HEAD_OFFICE_MANAGER', 'BRANCH_MANAGER'), async (req: any, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const requester = req.user;
    const { id } = req.params;
    const { firstName, lastName, role, branchId, status } = req.body;

    const [existing] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    if (!existing) {
      return res.status(404).json({ error: 'Employee account not found.' });
    }

    const updates: any = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (role) updates.role = role;
    if (branchId) updates.branchId = branchId;
    if (status !== undefined) updates.isActive = status === 'ACTIVE';

    await db.update(schema.users).set(updates).where(eq(schema.users.id, id));

    // Audit log
    await db.insert(schema.auditLogs).values({
      id: `log-staff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: requester.id,
      userName: `${requester.firstName} ${requester.lastName}`,
      userRole: requester.role,
      action: 'EMPLOYEE_ACCOUNT_UPDATED',
      entityName: 'USERS',
      entityId: id,
      ipAddress: req.ip || '127.0.0.1',
      details: `Updated employee profile for ${id}: ${JSON.stringify(updates)}`,
    });

    res.json({ success: true, message: 'Employee updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle employee active / inactive status (Deactivate / Reactivate)
app.post('/api/staff/:id/toggle-status', requireAuth, requireRole('SUPER_ADMIN', 'HEAD_OFFICE_MANAGER', 'BRANCH_MANAGER'), async (req: any, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const requester = req.user;
    const { id } = req.params;

    const [existing] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    if (!existing) {
      return res.status(404).json({ error: 'Employee account not found.' });
    }

    const newActiveState = !existing.isActive;
    await db.update(schema.users).set({ isActive: newActiveState }).where(eq(schema.users.id, id));

    // Audit log
    await db.insert(schema.auditLogs).values({
      id: `log-staff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: requester.id,
      userName: `${requester.firstName} ${requester.lastName}`,
      userRole: requester.role,
      action: newActiveState ? 'EMPLOYEE_ACTIVATED' : 'EMPLOYEE_DEACTIVATED',
      entityName: 'USERS',
      entityId: id,
      ipAddress: req.ip || '127.0.0.1',
      details: `Employee ${existing.firstName} ${existing.lastName} was ${newActiveState ? 'activated' : 'deactivated/suspended'}.`,
    });

    res.json({
      success: true,
      isActive: newActiveState,
      status: newActiveState ? 'ACTIVE' : 'INACTIVE',
      message: `Employee account is now ${newActiveState ? 'ACTIVE' : 'INACTIVE'}.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset employee password / access
app.post('/api/staff/:id/reset-access', requireAuth, requireRole('SUPER_ADMIN', 'HEAD_OFFICE_MANAGER', 'BRANCH_MANAGER'), async (req: any, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const requester = req.user;
    const { id } = req.params;

    const [existing] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    if (!existing) {
      return res.status(404).json({ error: 'Employee account not found.' });
    }

    const defaultPassword = 'Imara@' + new Date().getFullYear();
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);

    await db.update(schema.users).set({
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
    }).where(eq(schema.users.id, id));

    // Audit log
    await db.insert(schema.auditLogs).values({
      id: `log-staff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: requester.id,
      userName: `${requester.firstName} ${requester.lastName}`,
      userRole: requester.role,
      action: 'EMPLOYEE_ACCESS_RESET',
      entityName: 'USERS',
      entityId: id,
      ipAddress: req.ip || '127.0.0.1',
      details: `Manager reset credentials and cleared lockouts for employee ${existing.username} (${existing.email}).`,
    });

    res.json({
      success: true,
      message: `Access credentials reset. Temporary password is: ${defaultPassword}`,
      temporaryPassword: defaultPassword,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== OPERATIONAL API ROUTES ====================

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await initDb();
    res.json({ status: 'ok', database: 'connected', region: 'europe-west2' });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Dashboard Summary & KPI Metrics
app.get('/api/summary', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();

    // Portfolio metrics
    const allLoans = await db.select().from(schema.loans);
    const activeLoans = allLoans.filter((l) => l.status === 'ACTIVE' || l.status === 'DELINQUENT');
    const grossPortfolio = activeLoans.reduce((sum, l) => sum + (l.outstandingPrincipal || 0), 0);
    const totalDisbursed = allLoans.reduce((sum, l) => sum + (l.principalAmount || 0), 0);
    
    // Delinquency / PAR calculations
    const par30Loans = activeLoans.filter((l) => l.daysInArrears > 30);
    const par30Amount = par30Loans.reduce((sum, l) => sum + l.outstandingPrincipal, 0);
    const par30Ratio = grossPortfolio > 0 ? (par30Amount / grossPortfolio) * 100 : 0;

    const par90Loans = activeLoans.filter((l) => l.daysInArrears > 90);
    const par90Amount = par90Loans.reduce((sum, l) => sum + l.outstandingPrincipal, 0);
    const par90Ratio = grossPortfolio > 0 ? (par90Amount / grossPortfolio) * 100 : 0;

    // Savings summary
    const allSavings = await db.select().from(schema.savingsAccounts);
    const totalSavings = allSavings.reduce((sum, s) => sum + s.balance, 0);

    // Customer count
    const allCustomers = await db.select().from(schema.customers);

    // Mobile Money Float from COA
    const coaList = await db.select().from(schema.chartOfAccounts);
    const mpesaAcc = coaList.find((c) => c.code === '1020');
    const airtelAcc = coaList.find((c) => c.code === '1030');
    const tigoAcc = coaList.find((c) => c.code === '1040');
    const bankAcc = coaList.find((c) => c.code === '1050');
    const cashAcc = coaList.find((c) => c.code === '1010');

    // Recent 10 repayments
    const recentRepayments = await db.select().from(schema.repayments).orderBy(desc(schema.repayments.createdAt)).limit(8);

    res.json({
      activeBorrowers: activeLoans.length,
      totalCustomers: allCustomers.length,
      grossPortfolio: roundCurrency(grossPortfolio),
      totalDisbursed: roundCurrency(totalDisbursed),
      totalSavings: roundCurrency(totalSavings),
      par30Amount: roundCurrency(par30Amount),
      par30Ratio: Number(par30Ratio.toFixed(2)),
      par90Amount: roundCurrency(par90Amount),
      par90Ratio: Number(par90Ratio.toFixed(2)),
      liquidity: {
        cashInVault: cashAcc?.balance || 0,
        mpesaFloat: mpesaAcc?.balance || 0,
        airtelFloat: airtelAcc?.balance || 0,
        tigoFloat: tigoAcc?.balance || 0,
        crdbBank: bankAcc?.balance || 0,
        totalLiquid: (cashAcc?.balance || 0) + (mpesaAcc?.balance || 0) + (airtelAcc?.balance || 0) + (tigoAcc?.balance || 0) + (bankAcc?.balance || 0),
      },
      recentRepayments,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Branches
app.get('/api/branches', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const branchList = await db.select().from(schema.branches);
    res.json(branchList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Customers
app.get('/api/customers', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const customerList = await db.select().from(schema.customers).orderBy(desc(schema.customers.createdAt));
    res.json(customerList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', requireAuth, async (req: any, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const body = req.body;
    const requester = req.user;

    const id = `cust-${Date.now()}`;
    const customerNumber = `CUST-2024-${Math.floor(1000 + Math.random() * 9000)}`;

    const newCust = {
      id,
      customerNumber,
      firstName: body.firstName,
      lastName: body.lastName,
      nationalIdNida: body.nationalIdNida,
      phoneNumber: body.phoneNumber,
      email: body.email || null,
      dateOfBirth: body.dateOfBirth || '1990-01-01',
      gender: body.gender || 'FEMALE',
      residentialAddress: body.residentialAddress,
      businessType: body.businessType,
      monthlyIncome: Number(body.monthlyIncome) || 1000000,
      branchId: body.branchId || 'br-kariakoo',
      kycTier: Number(body.kycTier) || 2,
      crbStatus: body.crbStatus || 'GOOD',
      crbScore: Number(body.crbScore) || 710,
      latitude: body.latitude ? Number(body.latitude) : null,
      longitude: body.longitude ? Number(body.longitude) : null,
      documentUrl: body.documentUrl || null,
    };

    await db.insert(schema.customers).values(newCust);

    // Auto-create default voluntary savings account for new member
    const savId = `sav-${Date.now()}`;
    const accNum = `SAV-TZS-${Math.floor(10000 + Math.random() * 90000)}`;
    await db.insert(schema.savingsAccounts).values({
      id: savId,
      accountNumber: accNum,
      customerId: id,
      productType: 'VOLUNTARY',
      balance: 0,
      lockedAmount: 0,
      status: 'ACTIVE',
    });

    // Record audit log
    await db.insert(schema.auditLogs).values({
      id: `log-${Date.now()}`,
      userId: requester.id,
      userName: `${requester.firstName} ${requester.lastName}`,
      userRole: requester.role,
      action: 'CUSTOMER_ONBOARDING',
      entityName: 'CUSTOMER',
      entityId: id,
      ipAddress: req.ip || '127.0.0.1',
      details: `Onboarded customer ${body.firstName} ${body.lastName} (NIDA: ${body.nationalIdNida}).`,
    });

    res.status(201).json(newCust);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Groups
app.get('/api/groups', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const groupsList = await db.select().from(schema.groups);
    const members = await db.select().from(schema.groupMembers);

    const result = groupsList.map((g) => {
      const groupMembersList = members.filter((m) => m.groupId === g.id);
      return {
        ...g,
        memberCount: groupMembersList.length,
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/groups', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const body = req.body;
    const id = `grp-${Date.now()}`;
    const groupNumber = `GRP-${Math.floor(100 + Math.random() * 900)}`;

    const newGroup = {
      id,
      groupNumber,
      name: body.name,
      meetingDay: body.meetingDay,
      meetingFrequency: body.meetingFrequency || 'WEEKLY',
      meetingLocation: body.meetingLocation,
      branchId: body.branchId || 'br-kariakoo',
      officerId: body.officerId || 'usr-co-1',
      isActive: true,
    };

    await db.insert(schema.groups).values(newGroup);
    res.status(201).json(newGroup);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Loan Products
app.get('/api/products', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const products = await db.select().from(schema.loanProducts);
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Loan Applications
app.get('/api/applications', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const apps = await db.select().from(schema.loanApplications).orderBy(desc(schema.loanApplications.createdAt));
    res.json(apps);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/applications', requireAuth, async (req: any, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const body = req.body;
    const requester = req.user;

    const id = `app-${Date.now()}`;
    const applicationNumber = `APP-2024-${Math.floor(1000 + Math.random() * 9000)}`;

    // Quick Debt Service-to-Income (DSTI) estimation
    const customer = await db.select().from(schema.customers).where(eq(schema.customers.id, body.customerId));
    const monthlyIncome = customer[0]?.monthlyIncome || 1500000;
    const requested = Number(body.requestedAmount);
    const tenure = Number(body.tenureMonths) || 12;
    const approxMonthlyPayment = requested / tenure + (requested * 0.18) / 12;
    const assessedDsti = Number((approxMonthlyPayment / monthlyIncome).toFixed(2));

    const newApp = {
      id,
      applicationNumber,
      customerId: body.customerId,
      productId: body.productId,
      groupId: body.groupId || null,
      requestedAmount: requested,
      approvedAmount: null,
      tenureMonths: tenure,
      purpose: body.purpose,
      status: 'PENDING_REVIEW',
      assessedDsti,
      creditScore: customer[0]?.crbScore || 700,
      officerRecommendation: body.officerRecommendation || 'Field assessment conducted. Verified identity and business premises.',
      submittedBy: requester.id,
      reviewedBy: null,
      rejectionReason: null,
    };

    await db.insert(schema.loanApplications).values(newApp);

    await db.insert(schema.auditLogs).values({
      id: `log-${Date.now()}`,
      userId: requester.id,
      userName: `${requester.firstName} ${requester.lastName}`,
      userRole: requester.role,
      action: 'LOAN_APPLICATION_SUBMIT',
      entityName: 'LOAN_APPLICATION',
      entityId: id,
      ipAddress: req.ip || '127.0.0.1',
      details: `Submitted loan application for TZS ${requested.toLocaleString()} by customer ${body.customerId}.`,
    });

    res.status(201).json(newApp);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Per BR-APPR-01: Branch Managers may approve up to this amount; anything
// larger must be escalated to a Head Office Manager / Super Admin, who have
// no cap here.
const BRANCH_MANAGER_APPROVAL_LIMIT = 1_000_000;

// Review Loan Application (Approve or Reject)
app.patch('/api/applications/:id/review', requireAuth, requireRole('BRANCH_MANAGER', 'HEAD_OFFICE_MANAGER', 'SUPER_ADMIN'), async (req: any, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const { id } = req.params;
    const { action, approvedAmount, rejectionReason } = req.body; // action: 'APPROVE' | 'REJECT'
    const requester = req.user;

    const [appRecord] = await db.select().from(schema.loanApplications).where(eq(schema.loanApplications.id, id));
    if (!appRecord) {
      return res.status(404).json({ error: 'Loan application not found' });
    }

    const terminalStatuses = ['APPROVED', 'REJECTED', 'DISBURSED'];
    if (terminalStatuses.includes(appRecord.status)) {
      return res.status(409).json({
        error: `This application has already been reviewed (status: ${appRecord.status}) and cannot be reviewed again.`,
        code: 'ALREADY_REVIEWED',
      });
    }

    // Maker-checker (BR-APPR-01): the person who submitted the application
    // (the "maker") can never be the one who approves or rejects it (the
    // "checker"), regardless of their role.
    if (appRecord.submittedBy && appRecord.submittedBy === requester.id) {
      return res.status(403).json({
        error: 'Maker-checker violation: you submitted this application and cannot review your own submission. Escalate to another authorized reviewer.',
        code: 'SELF_APPROVAL_FORBIDDEN',
      });
    }

    // Tiered approval limit (BR-APPR-01): Branch Managers may only approve
    // up to BRANCH_MANAGER_APPROVAL_LIMIT; larger amounts require Head
    // Office / Super Admin sign-off.
    if (action === 'APPROVE' && requester.role === 'BRANCH_MANAGER' && Number(approvedAmount) > BRANCH_MANAGER_APPROVAL_LIMIT) {
      return res.status(403).json({
        error: `Branch Managers may approve loans up to TZS ${BRANCH_MANAGER_APPROVAL_LIMIT.toLocaleString()}. This amount (TZS ${Number(approvedAmount).toLocaleString()}) must be escalated to a Head Office Manager.`,
        code: 'APPROVAL_LIMIT_EXCEEDED',
      });
    }

    // Reviewer identity always comes from the verified token, never the
    // request body - otherwise a caller could approve as anyone they liked.
    if (action === 'APPROVE') {
      await db.update(schema.loanApplications).set({
        status: 'APPROVED',
        approvedAmount: Number(approvedAmount),
        reviewedBy: requester.id,
      }).where(eq(schema.loanApplications.id, id));
    } else {
      await db.update(schema.loanApplications).set({
        status: 'REJECTED',
        rejectionReason: rejectionReason || 'Failed credit policy affordability threshold',
        reviewedBy: requester.id,
      }).where(eq(schema.loanApplications.id, id));
    }

    await db.insert(schema.auditLogs).values({
      id: `log-review-${Date.now()}`,
      userId: requester.id,
      userName: `${requester.firstName} ${requester.lastName}`,
      userRole: requester.role,
      action: action === 'APPROVE' ? 'LOAN_APPLICATION_APPROVED' : 'LOAN_APPLICATION_REJECTED',
      entityName: 'LOAN_APPLICATION',
      entityId: id,
      ipAddress: req.ip || '127.0.0.1',
      details: action === 'APPROVE'
        ? `Approved application ${id} for TZS ${Number(approvedAmount).toLocaleString()}.`
        : `Rejected application ${id}. Reason: ${rejectionReason || 'Failed credit policy affordability threshold'}`,
    });

    const updated = await db.select().from(schema.loanApplications).where(eq(schema.loanApplications.id, id));
    res.json(updated[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Disburse Loan (creates active loan, schedule of installments, updates application, generates double entry)
app.post('/api/loans/disburse', requireAuth, requireRole('BRANCH_MANAGER', 'HEAD_OFFICE_MANAGER', 'SUPER_ADMIN', 'ACCOUNTANT', 'CASHIER'), async (req: any, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const { applicationId, disbursementDate, channel } = req.body;
    const requester = req.user;

    const [appRecord] = await db.select().from(schema.loanApplications).where(eq(schema.loanApplications.id, applicationId));
    if (!appRecord) {
      return res.status(404).json({ error: 'Application not found' });
    }
    if (appRecord.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Only APPROVED applications can be disbursed' });
    }

    const [product] = await db.select().from(schema.loanProducts).where(eq(schema.loanProducts.id, appRecord.productId));
    const principal = appRecord.approvedAmount || appRecord.requestedAmount;
    const tenureMonths = appRecord.tenureMonths;
    const annualRate = product.annualInterestRate;

    const loanId = `loan-${Date.now()}`;
    const loanAccountNumber = `LN-${Math.floor(10000 + Math.random() * 90000)}`;

    const startDate = disbursementDate || new Date().toISOString().split('T')[0];
    const maturity = new Date(startDate);
    maturity.setMonth(maturity.getMonth() + tenureMonths);
    const maturityDate = maturity.toISOString().split('T')[0];

    // Create Loan record
    const newLoan = {
      id: loanId,
      loanAccountNumber,
      applicationId: appRecord.id,
      customerId: appRecord.customerId,
      productId: product.id,
      branchId: 'br-kariakoo',
      groupId: appRecord.groupId || null,
      principalAmount: principal,
      outstandingPrincipal: principal,
      interestRate: annualRate,
      tenureMonths,
      disbursementDate: startDate,
      maturityDate,
      status: 'ACTIVE',
      interestMethod: product.interestMethod,
      repaymentFrequency: product.repaymentFrequency,
      daysInArrears: 0,
      accruedInterest: 0,
      unpaidFees: 0,
      unpaidPenalties: 0,
      totalPaid: 0,
    };

    await db.insert(schema.loans).values(newLoan);

    // Update application status to DISBURSED
    await db.update(schema.loanApplications).set({ status: 'DISBURSED' }).where(eq(schema.loanApplications.id, applicationId));

    // Generate installments
    const installments = [];
    const monthlyPrincipal = roundCurrency(principal / tenureMonths);
    const monthlyRate = (annualRate / 100) / 12;

    for (let i = 1; i <= tenureMonths; i++) {
      const instDueDate = new Date(startDate);
      instDueDate.setMonth(instDueDate.getMonth() + i);
      const dueDateStr = instDueDate.toISOString().split('T')[0];

      let instPrincipal = monthlyPrincipal;
      if (i === tenureMonths) {
        // adjust last month for rounding
        instPrincipal = principal - (monthlyPrincipal * (tenureMonths - 1));
      }

      let instInterest = 0;
      if (product.interestMethod === 'FLAT') {
        instInterest = roundCurrency((principal * (annualRate / 100) * (tenureMonths / 12)) / tenureMonths);
      } else {
        // Reducing balance interest for current month
        const remainingPrincipal = principal - ((i - 1) * monthlyPrincipal);
        instInterest = roundCurrency(remainingPrincipal * monthlyRate);
      }

      const totalDue = instPrincipal + instInterest;

      installments.push({
        id: `inst-${loanId}-${i}`,
        loanId,
        installmentNumber: i,
        dueDate: dueDateStr,
        principalDue: instPrincipal,
        interestDue: instInterest,
        feesDue: 0,
        totalDue,
        principalPaid: 0,
        interestPaid: 0,
        feesPaid: 0,
        penaltiesPaid: 0,
        status: 'PENDING',
        paidAt: null,
      });
    }

    if (installments.length > 0) {
      await db.insert(schema.loanInstallments).values(installments);
    }

    // Double-Entry Accounting Posting:
    // DR: 1200 Gross Loan Portfolio (Asset increase)
    // CR: 1020 M-Pesa Settlement / 1010 Cash in Vault (Asset decrease)
    const journalId = `jnl-${Date.now()}`;
    const disburseAccount = channel === 'CASH' ? '1010' : '1020';
    const disburseAccountName = channel === 'CASH' ? 'Cash in Vault' : 'M-Pesa Settlement Float';

    await db.insert(schema.journalEntries).values({
      id: journalId,
      entryNumber: `JNL-DISB-${Math.floor(1000 + Math.random() * 9000)}`,
      transactionDate: startDate,
      narration: `Disbursement of Loan ${loanAccountNumber} to customer ${appRecord.customerId}`,
      referenceType: 'DISBURSEMENT',
      referenceId: loanId,
      totalDebit: principal,
      totalCredit: principal,
      postedBy: requester.id,
    });

    await db.insert(schema.journalLines).values([
      {
        id: `line-${journalId}-1`,
        journalId,
        accountCode: '1200',
        accountName: 'Gross Loan Portfolio',
        entryType: 'DEBIT',
        amount: principal,
      },
      {
        id: `line-${journalId}-2`,
        journalId,
        accountCode: disburseAccount,
        accountName: disburseAccountName,
        entryType: 'CREDIT',
        amount: principal,
      },
    ]);

    // Update Chart of Account balances
    await db.update(schema.chartOfAccounts).set({
      balance: sql`${schema.chartOfAccounts.balance} + ${principal}`,
    }).where(eq(schema.chartOfAccounts.code, '1200'));

    await db.update(schema.chartOfAccounts).set({
      balance: sql`${schema.chartOfAccounts.balance} - ${principal}`,
    }).where(eq(schema.chartOfAccounts.code, disburseAccount));

    // Audit Log
    await db.insert(schema.auditLogs).values({
      id: `log-${Date.now()}`,
      userId: requester.id,
      userName: `${requester.firstName} ${requester.lastName}`,
      userRole: requester.role,
      action: 'LOAN_DISBURSED',
      entityName: 'LOAN',
      entityId: loanId,
      ipAddress: req.ip || '127.0.0.1',
      details: `Successfully disbursed TZS ${principal.toLocaleString()} for Loan ${loanAccountNumber} via ${disburseAccountName}.`,
    });

    res.status(201).json({ loan: newLoan, installmentsCount: installments.length });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Loans list
app.get('/api/loans', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const loansList = await db.select().from(schema.loans).orderBy(desc(schema.loans.createdAt));
    res.json(loansList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Loan Installments
app.get('/api/loans/:id/installments', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const insts = await db.select().from(schema.loanInstallments).where(eq(schema.loanInstallments.loanId, req.params.id));
    res.json(insts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Repayments - Record Payment with Regulatory Cascade
// Waterfall Order: Penalties -> Fees -> Accrued Interest -> Principal
app.post('/api/repayments', requireAuth, async (req: any, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const { loanId, amount, paymentMethod, referenceNumber } = req.body;
    const requester = req.user;
    const receivedBy = `${requester.firstName} ${requester.lastName}`;
    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }

    const [loan] = await db.select().from(schema.loans).where(eq(schema.loans.id, loanId));
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    let remaining = paymentAmount;

    // 1. Penalties
    const penaltiesAllocated = Math.min(remaining, loan.unpaidPenalties || 0);
    remaining -= penaltiesAllocated;

    // 2. Fees
    const feesAllocated = Math.min(remaining, loan.unpaidFees || 0);
    remaining -= feesAllocated;

    // 3. Accrued Interest
    const interestAllocated = Math.min(remaining, loan.accruedInterest > 0 ? loan.accruedInterest : roundCurrency(loan.outstandingPrincipal * (loan.interestRate / 100 / 12)));
    remaining -= interestAllocated;

    // 4. Principal
    const principalAllocated = Math.min(remaining, loan.outstandingPrincipal);
    remaining -= principalAllocated;

    const receiptNumber = `RCP-2024-${Math.floor(10000 + Math.random() * 90000)}`;
    const paymentDate = new Date().toISOString().split('T')[0];

    const repaymentRecord = {
      id: `rep-${Date.now()}`,
      receiptNumber,
      loanId,
      amount: paymentAmount,
      paymentDate,
      paymentMethod: paymentMethod || 'MPESA',
      referenceNumber: referenceNumber || `TXN-${Math.floor(1000000 + Math.random() * 9000000)}`,
      principalAllocated,
      interestAllocated,
      feesAllocated,
      penaltiesAllocated,
      receivedBy: receivedBy || 'Field Officer',
      isReversed: false,
      reversalReason: null,
    };

    await db.insert(schema.repayments).values(repaymentRecord);

    // Update loan record
    const newOutstanding = Math.max(0, loan.outstandingPrincipal - principalAllocated);
    const newStatus = newOutstanding === 0 ? 'CLOSED' : (loan.daysInArrears > 0 ? 'ACTIVE' : loan.status);

    await db.update(schema.loans).set({
      outstandingPrincipal: newOutstanding,
      unpaidPenalties: Math.max(0, (loan.unpaidPenalties || 0) - penaltiesAllocated),
      unpaidFees: Math.max(0, (loan.unpaidFees || 0) - feesAllocated),
      accruedInterest: Math.max(0, (loan.accruedInterest || 0) - interestAllocated),
      totalPaid: sql`${schema.loans.totalPaid} + ${paymentAmount}`,
      status: newStatus,
      daysInArrears: newOutstanding === 0 ? 0 : loan.daysInArrears,
    }).where(eq(schema.loans.id, loanId));

    // Double-Entry Journal Entry
    // DR: 1020 M-Pesa / 1010 Cash (Total Amount received)
    // CR: 1200 Gross Loan Portfolio (Principal reduction)
    // CR: 4010 Interest on Loans (Interest income)
    // CR: 4020 Loan Fees (if any)
    // CR: 4030 Penalties (if any)
    const journalId = `jnl-${Date.now()}`;
    const debitAccount = paymentMethod === 'CASH' ? '1010' : (paymentMethod === 'AIRTEL_MONEY' ? '1030' : (paymentMethod === 'TIGO_PESA' ? '1040' : '1020'));
    const debitAccountName = paymentMethod === 'CASH' ? 'Cash in Vault' : `${paymentMethod} Settlement Account`;

    await db.insert(schema.journalEntries).values({
      id: journalId,
      entryNumber: `JNL-REP-${Math.floor(1000 + Math.random() * 9000)}`,
      transactionDate: paymentDate,
      narration: `Repayment for Loan ${loan.loanAccountNumber} (Receipt ${receiptNumber})`,
      referenceType: 'REPAYMENT',
      referenceId: repaymentRecord.id,
      totalDebit: paymentAmount,
      totalCredit: paymentAmount,
      postedBy: requester.id,
    });

    const lines = [
      {
        id: `line-${journalId}-dr`,
        journalId,
        accountCode: debitAccount,
        accountName: debitAccountName,
        entryType: 'DEBIT',
        amount: paymentAmount,
      },
    ];

    if (principalAllocated > 0) {
      lines.push({
        id: `line-${journalId}-cr-prin`,
        journalId,
        accountCode: '1200',
        accountName: 'Gross Loan Portfolio',
        entryType: 'CREDIT',
        amount: principalAllocated,
      });
      await db.update(schema.chartOfAccounts).set({
        balance: sql`${schema.chartOfAccounts.balance} - ${principalAllocated}`,
      }).where(eq(schema.chartOfAccounts.code, '1200'));
    }

    if (interestAllocated > 0) {
      lines.push({
        id: `line-${journalId}-cr-int`,
        journalId,
        accountCode: '4010',
        accountName: 'Interest on Loans',
        entryType: 'CREDIT',
        amount: interestAllocated,
      });
      await db.update(schema.chartOfAccounts).set({
        balance: sql`${schema.chartOfAccounts.balance} + ${interestAllocated}`,
      }).where(eq(schema.chartOfAccounts.code, '4010'));
    }

    if (penaltiesAllocated > 0) {
      lines.push({
        id: `line-${journalId}-cr-pen`,
        journalId,
        accountCode: '4030',
        accountName: 'Late Payment Penalties',
        entryType: 'CREDIT',
        amount: penaltiesAllocated,
      });
      await db.update(schema.chartOfAccounts).set({
        balance: sql`${schema.chartOfAccounts.balance} + ${penaltiesAllocated}`,
      }).where(eq(schema.chartOfAccounts.code, '4030'));
    }

    if (feesAllocated > 0) {
      lines.push({
        id: `line-${journalId}-cr-fee`,
        journalId,
        accountCode: '4020',
        accountName: 'Loan Processing Fees',
        entryType: 'CREDIT',
        amount: feesAllocated,
      });
      await db.update(schema.chartOfAccounts).set({
        balance: sql`${schema.chartOfAccounts.balance} + ${feesAllocated}`,
      }).where(eq(schema.chartOfAccounts.code, '4020'));
    }

    // Debit Account update
    await db.update(schema.chartOfAccounts).set({
      balance: sql`${schema.chartOfAccounts.balance} + ${paymentAmount}`,
    }).where(eq(schema.chartOfAccounts.code, debitAccount));

    await db.insert(schema.journalLines).values(lines);

    // Audit Log
    await db.insert(schema.auditLogs).values({
      id: `log-${Date.now()}`,
      userId: requester.id,
      userName: receivedBy,
      userRole: requester.role,
      action: 'REPAYMENT_POSTED',
      entityName: 'REPAYMENT',
      entityId: repaymentRecord.id,
      ipAddress: req.ip || '127.0.0.1',
      details: `Collected TZS ${paymentAmount.toLocaleString()} (Principal: ${principalAllocated}, Interest: ${interestAllocated}) for ${loan.loanAccountNumber}.`,
    });

    res.status(201).json(repaymentRecord);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Repayments list
app.get('/api/repayments', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const list = await db.select().from(schema.repayments).orderBy(desc(schema.repayments.createdAt)).limit(50);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Savings Accounts & Transactions
app.get('/api/savings', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const accounts = await db.select().from(schema.savingsAccounts);
    res.json(accounts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/savings/transaction', requireAuth, async (req: any, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const { accountId, transactionType, amount, channel, narration } = req.body;
    const txAmount = Number(amount);

    // Withdrawals move money out of the institution - restrict to roles that
    // handle cash/till operations, unlike deposits which any staff can record.
    if (transactionType === 'WITHDRAWAL') {
      const withdrawalRoles = ['CASHIER', 'BRANCH_MANAGER', 'ACCOUNTANT', 'HEAD_OFFICE_MANAGER', 'SUPER_ADMIN'];
      if (!withdrawalRoles.includes(req.user.role)) {
        return res.status(403).json({
          error: `Forbidden: savings withdrawals require one of the following roles: ${withdrawalRoles.join(', ')}.`,
          code: 'INSUFFICIENT_PERMISSIONS',
        });
      }
    }

    const [account] = await db.select().from(schema.savingsAccounts).where(eq(schema.savingsAccounts.id, accountId));
    if (!account) {
      return res.status(404).json({ error: 'Savings account not found' });
    }

    let newBalance = account.balance;
    if (transactionType === 'DEPOSIT') {
      newBalance += txAmount;
    } else if (transactionType === 'WITHDRAWAL') {
      const available = account.balance - account.lockedAmount;
      if (txAmount > available) {
        return res.status(400).json({ error: `Insufficient withdrawable balance. Available: TZS ${available.toLocaleString()} (Locked: TZS ${account.lockedAmount.toLocaleString()})` });
      }
      newBalance -= txAmount;
    }

    const txId = `sav-tx-${Date.now()}`;
    const txRecord = {
      id: txId,
      accountId,
      transactionType,
      amount: txAmount,
      balanceAfter: newBalance,
      narration: narration || `Member ${transactionType.toLowerCase()} via ${channel || 'Cash'}`,
      channel: channel || 'CASH',
      reference: `SAV-REF-${Math.floor(100000 + Math.random() * 900000)}`,
    };

    await db.insert(schema.savingsTransactions).values(txRecord);
    await db.update(schema.savingsAccounts).set({ balance: newBalance }).where(eq(schema.savingsAccounts.id, accountId));

    res.status(201).json(txRecord);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Accounting: Chart of Accounts
app.get('/api/accounting/coa', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const coa = await db.select().from(schema.chartOfAccounts).orderBy(schema.chartOfAccounts.code);
    res.json(coa);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Accounting: Trial Balance
app.get('/api/accounting/trial-balance', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const coa = await db.select().from(schema.chartOfAccounts).orderBy(schema.chartOfAccounts.code);

    let totalDebit = 0;
    let totalCredit = 0;

    const rows = coa.map((account) => {
      let debit = 0;
      let credit = 0;
      if (account.normalBalance === 'DEBIT') {
        debit = account.balance;
        totalDebit += debit;
      } else {
        credit = account.balance;
        totalCredit += credit;
      }
      return {
        code: account.code,
        name: account.name,
        type: account.type,
        debit,
        credit,
      };
    });

    res.json({
      asOf: new Date().toISOString(),
      rows,
      totalDebit: roundCurrency(totalDebit),
      totalCredit: roundCurrency(totalCredit),
      isBalanced: Math.abs(totalDebit - totalCredit) < 1,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Accounting: Journal Entries
app.get('/api/accounting/journal', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const entries = await db.select().from(schema.journalEntries).orderBy(desc(schema.journalEntries.createdAt)).limit(30);
    const lines = await db.select().from(schema.journalLines);

    const fullEntries = entries.map((e) => {
      const entryLines = lines.filter((l) => l.journalId === e.id);
      return {
        ...e,
        lines: entryLines,
      };
    });

    res.json(fullEntries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Accounting: Post Manual Journal Voucher
app.post('/api/accounting/journal', requireAuth, requireRole('ACCOUNTANT', 'BRANCH_MANAGER', 'HEAD_OFFICE_MANAGER', 'SUPER_ADMIN'), async (req: any, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const { entryNumber, narration, lines } = req.body;
    const requester = req.user;

    if (!Array.isArray(lines) || lines.length < 2) {
      return res.status(400).json({ error: 'At least two balanced journal lines are required' });
    }

    const totalDebit = lines
      .filter((l: any) => l.entryType === 'DEBIT')
      .reduce((sum: number, l: any) => sum + Number(l.amount), 0);
    const totalCredit = lines
      .filter((l: any) => l.entryType === 'CREDIT')
      .reduce((sum: number, l: any) => sum + Number(l.amount), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({
        error: `Double-entry invariant violated: Total Debits (${totalDebit}) must equal Total Credits (${totalCredit})`,
      });
    }

    const journalId = `jnl-${Date.now()}`;
    const transactionDate = new Date().toISOString().split('T')[0];

    const newEntry = {
      id: journalId,
      entryNumber: entryNumber || `JV-MAN-${Math.floor(100000 + Math.random() * 900000)}`,
      transactionDate,
      narration: narration || 'Manual Journal Adjustment',
      referenceType: 'ADJUSTMENT',
      referenceId: journalId,
      totalDebit,
      totalCredit,
      postedBy: requester.id,
    };

    await db.insert(schema.journalEntries).values(newEntry);

    const journalLineRecords = lines.map((l: any, idx: number) => ({
      id: `line-${journalId}-${idx}`,
      journalId,
      accountCode: l.accountCode,
      accountName: l.accountName || 'Account',
      entryType: l.entryType,
      amount: Number(l.amount),
    }));

    await db.insert(schema.journalLines).values(journalLineRecords);

    // Update account balances
    for (const line of lines) {
      const amt = Number(line.amount);
      const isDebit = line.entryType === 'DEBIT';
      // Assets & Expenses increase on Debit, decrease on Credit
      // Liabilities, Equity, Revenues increase on Credit, decrease on Debit
      const [acc] = await db
        .select()
        .from(schema.chartOfAccounts)
        .where(eq(schema.chartOfAccounts.code, line.accountCode));

      if (acc) {
        let delta = 0;
        if (acc.type === 'ASSET' || acc.type === 'EXPENSE') {
          delta = isDebit ? amt : -amt;
        } else {
          delta = isDebit ? -amt : amt;
        }
        await db
          .update(schema.chartOfAccounts)
          .set({ balance: sql`${schema.chartOfAccounts.balance} + ${delta}` })
          .where(eq(schema.chartOfAccounts.code, line.accountCode));
      }
    }

    // Audit Log
    await db.insert(schema.auditLogs).values({
      id: `log-${Date.now()}`,
      userId: requester.id,
      userName: `${requester.firstName} ${requester.lastName}`,
      userRole: requester.role,
      action: 'MANUAL_JOURNAL_POSTED',
      entityName: 'JOURNAL_ENTRY',
      entityId: journalId,
      ipAddress: req.ip || '127.0.0.1',
      details: `Posted manual journal voucher ${newEntry.entryNumber} totaling TZS ${totalDebit.toLocaleString()}. Narration: ${narration}`,
    });

    res.status(201).json({ ...newEntry, lines: journalLineRecords });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Mobile Money C2B Webhook Simulator & Integration
// Called by the real mobile money provider (M-Pesa/Airtel Money/Tigo Pesa),
// not a logged-in user - there is no JWT to check. Instead the provider must
// prove it knows MOMO_WEBHOOK_SECRET by sending a matching signature; the
// signature is never trusted from the request body, only computed here from
// a secret only this server and the provider hold.
app.post('/api/mobile-money/webhook', async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const { provider, providerTxId, accountReference, phoneNumber, amount } = req.body;

    const txAmount = Number(amount);
    const txId = providerTxId || `MNO${Date.now()}`;

    const expectedSignature = crypto.createHmac('sha256', MOMO_WEBHOOK_SECRET)
      .update(`${provider}:${txId}:${accountReference}:${txAmount}`)
      .digest('hex');

    const providedSignature = String(req.headers['x-webhook-signature'] || '');
    const expectedBuf = Buffer.from(expectedSignature, 'hex');
    const providedBuf = Buffer.from(providedSignature, 'hex');
    const signatureValid =
      providedBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, providedBuf);

    if (!signatureValid) {
      return res.status(401).json({ error: 'Invalid or missing webhook signature', code: 'INVALID_SIGNATURE' });
    }

    const signature = expectedSignature;

    // Check for duplicate transaction
    const existing = await db.select().from(schema.mobileMoneyTransactions).where(eq(schema.mobileMoneyTransactions.providerTxId, txId));
    if (existing.length > 0) {
      return res.status(200).json({ status: 'DUPLICATE_IGNORED', message: 'Transaction already processed' });
    }

    // Try matching loan account number
    const loansMatching = await db.select().from(schema.loans).where(eq(schema.loans.loanAccountNumber, accountReference));
    let processingStatus = 'COMPLETED';
    let receiptNumber = null;

    if (loansMatching.length > 0) {
      // Auto-post loan repayment
      const loan = loansMatching[0];
      const repReq = {
        loanId: loan.id,
        amount: txAmount,
        paymentMethod: provider || 'MPESA',
        referenceNumber: txId,
        receivedBy: 'MOBILE_MONEY_GATEWAY',
      };
      
      const repId = `rep-${Date.now()}`;
      receiptNumber = `RCP-MNO-${Math.floor(10000 + Math.random() * 90000)}`;

      // waterfall
      const principalAllocated = Math.min(txAmount, loan.outstandingPrincipal);
      const interestAllocated = Math.max(0, txAmount - principalAllocated);

      await db.insert(schema.repayments).values({
        id: repId,
        receiptNumber,
        loanId: loan.id,
        amount: txAmount,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: provider || 'MPESA',
        referenceNumber: txId,
        principalAllocated,
        interestAllocated,
        feesAllocated: 0,
        penaltiesAllocated: 0,
        receivedBy: 'C2B_AUTOMATION',
        isReversed: false,
        reversalReason: null,
      });

      await db.update(schema.loans).set({
        outstandingPrincipal: Math.max(0, loan.outstandingPrincipal - principalAllocated),
        totalPaid: sql`${schema.loans.totalPaid} + ${txAmount}`,
      }).where(eq(schema.loans.id, loan.id));
    }

    // Record webhook log
    await db.insert(schema.mobileMoneyTransactions).values({
      id: `mno-tx-${Date.now()}`,
      provider: provider || 'MPESA',
      providerTxId: txId,
      accountReference,
      phoneNumber,
      amount: txAmount,
      hmacSignature: signature,
      processingStatus,
      receiptNumber,
    });

    res.status(200).json({
      status: 'SUCCESS',
      providerTxId: txId,
      receiptNumber,
      message: 'Mobile money C2B callback verified and ledger updated',
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Staff-triggered test/demo action ("Simulate Mobile Money Payment" in the
// UI) - this is an authenticated action performed by a logged-in staff
// member, not a real provider callback, so it is gated by requireAuth rather
// than a webhook signature. It shares the webhook's repayment-application
// logic but is recorded as SIMULATED so it's distinguishable in the audit
// trail from a genuine mobile money confirmation.
app.post('/api/mobile-money/simulate', requireAuth, async (req: any, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const { provider, accountReference, phoneNumber, amount } = req.body;
    const requester = req.user;

    const txAmount = Number(amount);
    if (!txAmount || txAmount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const txId = `SIM-${provider || 'MPESA'}-${Date.now()}`;

    const loansMatching = await db.select().from(schema.loans).where(eq(schema.loans.loanAccountNumber, accountReference));
    let receiptNumber = null;

    if (loansMatching.length > 0) {
      const loan = loansMatching[0];
      receiptNumber = `RCP-MNO-${Math.floor(10000 + Math.random() * 90000)}`;

      const principalAllocated = Math.min(txAmount, loan.outstandingPrincipal);
      const interestAllocated = Math.max(0, txAmount - principalAllocated);

      await db.insert(schema.repayments).values({
        id: `rep-${Date.now()}`,
        receiptNumber,
        loanId: loan.id,
        amount: txAmount,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: provider || 'MPESA',
        referenceNumber: txId,
        principalAllocated,
        interestAllocated,
        feesAllocated: 0,
        penaltiesAllocated: 0,
        receivedBy: `${requester.firstName} ${requester.lastName}`,
        isReversed: false,
        reversalReason: null,
      });

      await db.update(schema.loans).set({
        outstandingPrincipal: Math.max(0, loan.outstandingPrincipal - principalAllocated),
        totalPaid: sql`${schema.loans.totalPaid} + ${txAmount}`,
      }).where(eq(schema.loans.id, loan.id));
    }

    await db.insert(schema.mobileMoneyTransactions).values({
      id: `mno-tx-${Date.now()}`,
      provider: provider || 'MPESA',
      providerTxId: txId,
      accountReference,
      phoneNumber,
      amount: txAmount,
      hmacSignature: 'SIMULATED-NO-SIGNATURE',
      processingStatus: loansMatching.length > 0 ? 'COMPLETED' : 'FAILED',
      receiptNumber,
    });

    await db.insert(schema.auditLogs).values({
      id: `log-momosim-${Date.now()}`,
      userId: requester.id,
      userName: `${requester.firstName} ${requester.lastName}`,
      userRole: requester.role,
      action: 'MOBILE_MONEY_PAYMENT_SIMULATED',
      entityName: 'MOBILE_MONEY_TRANSACTION',
      entityId: txId,
      ipAddress: req.ip || '127.0.0.1',
      details: `Simulated ${provider || 'MPESA'} payment of TZS ${txAmount.toLocaleString()} against ${accountReference}.`,
    });

    res.status(200).json({
      status: loansMatching.length > 0 ? 'SUCCESS' : 'NO_MATCHING_LOAN',
      providerTxId: txId,
      receiptNumber,
      message: loansMatching.length > 0
        ? 'Simulated mobile money payment applied and ledger updated'
        : `No active loan found for account reference ${accountReference}`,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Audit Logs
app.get('/api/audit-logs', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const logs = await db.select().from(schema.auditLogs).orderBy(desc(schema.auditLogs.timestamp)).limit(50);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Offline Sync Batch Endpoint
app.post('/api/offline-sync', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const { deviceId, queue } = req.body; // Array of queued local operations

    if (!Array.isArray(queue)) {
      return res.status(400).json({ error: 'Queue must be an array' });
    }

    const results = [];

    for (const item of queue) {
      try {
        // Check if already processed
        const existing = await db.select().from(schema.offlineSyncRecords).where(eq(schema.offlineSyncRecords.localId, item.localId));
        if (existing.length > 0) {
          results.push({ localId: item.localId, status: 'ALREADY_SYNCED' });
          continue;
        }

        // Record sync event
        await db.insert(schema.offlineSyncRecords).values({
          id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          localId: item.localId,
          deviceId: deviceId || 'field-tablet-01',
          operationType: item.operationType,
          payloadJson: JSON.stringify(item.payload),
          clientTimestamp: item.clientTimestamp || new Date().toISOString(),
          syncStatus: 'SYNCED',
          syncedAt: new Date(),
          errorMessage: null,
          retryCount: 0,
        });

        // If operation is a field collection payment, apply repayment to database
        if (item.operationType === 'COLLECTION_PAYMENT' && item.payload) {
          const { loanId, amount, paymentMethod, channelRef } = item.payload;
          if (loanId && amount) {
            const [loan] = await db.select().from(schema.loans).where(eq(schema.loans.id, loanId));
            if (loan) {
              const paymentAmount = Number(amount);
              const principalAllocated = Math.min(paymentAmount, loan.outstandingPrincipal);
              const interestAllocated = Math.max(0, paymentAmount - principalAllocated);
              const receiptNumber = channelRef || `RCP-OFF-${Date.now().toString().slice(-6)}`;

              await db.insert(schema.repayments).values({
                id: `rep-off-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                receiptNumber,
                loanId,
                amount: paymentAmount,
                paymentDate: (item.clientTimestamp || new Date().toISOString()).split('T')[0],
                paymentMethod: paymentMethod || 'CASH',
                referenceNumber: channelRef || `OFFLINE-SYNC-${item.localId}`,
                principalAllocated,
                interestAllocated,
                feesAllocated: 0,
                penaltiesAllocated: 0,
                receivedBy: item.payload.officer || 'Field Officer',
                isReversed: false,
                reversalReason: null,
              });

              const newOutstanding = Math.max(0, loan.outstandingPrincipal - principalAllocated);
              await db.update(schema.loans).set({
                outstandingPrincipal: newOutstanding,
                totalPaid: sql`${schema.loans.totalPaid} + ${paymentAmount}`,
                status: newOutstanding === 0 ? 'CLOSED' : loan.status,
              }).where(eq(schema.loans.id, loanId));
            }
          }
        }

        results.push({ localId: item.localId, status: 'SUCCESS' });
      } catch (innerErr: any) {
        results.push({ localId: item.localId, status: 'FAILED', error: innerErr.message });
      }
    }

    res.json({ syncedCount: results.filter((r) => r.status === 'SUCCESS').length, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vite Middleware for Development / Static serving for Production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Huduma MFI Operating System server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
