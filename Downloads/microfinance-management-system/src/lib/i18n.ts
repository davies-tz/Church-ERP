export type Language = 'en' | 'sw';

export interface Translations {
  appName: string;
  appSubtitle: string;
  dashboard: string;
  customers: string;
  groups: string;
  products: string;
  origination: string;
  servicing: string;
  payments: string;
  savings: string;
  accounting: string;
  mobileMoney: string;
  offlineSync: string;
  reports: string;
  auditTrail: string;
  staffManagement: string;
  aboutDemo: string;
  branch: string;
  allBranches: string;
  role: string;
  online: string;
  offlineMode: string;
  sync: string;
  language: string;
  // About & Demo Section
  tagline: string;
  exploreDemo: string;
  signInButton: string;
  builtForModernOps: string;
  heroSupportingText: string;
  aboutHeading: string;
  aboutParagraph1: string;
  aboutParagraph2: string;
  aboutParagraph3: string;
  featuresTitle: string;
  howItWorksTitle: string;
  roleBasedTitle: string;
  roleBasedStatement: string;
  languageSupportTitle: string;
  mobileFirstTitle: string;
  securityTitle: string;
  demoPreviewTitle: string;
  ctaTitle: string;
  ctaSubtitle: string;
  // Dashboard Metrics
  activeBorrowers: string;
  grossPortfolio: string;
  par30: string;
  par90: string;
  totalSavings: string;
  totalDisbursed: string;
  repaymentRate: string;
  liquidFloat: string;
  quickActions: string;
  newCustomer: string;
  applyLoan: string;
  recordPayment: string;
  savingsDeposit: string;
  recentRepayments: string;
  portfolioDistribution: string;
  // Common Buttons & Labels
  search: string;
  save: string;
  submit: string;
  cancel: string;
  confirm: string;
  approve: string;
  reject: string;
  disburse: string;
  reverse: string;
  exportPdf: string;
  status: string;
  actions: string;
  date: string;
  amount: string;
  principal: string;
  interest: string;
  fees: string;
  penalties: string;
  outstanding: string;
  overdue: string;
  phoneNumber: string;
  nidaNumber: string;
  businessType: string;
  monthlyIncome: string;
  residence: string;
  tenure: string;
  interestRate: string;
  repaymentFreq: string;
  purpose: string;
  // Empty states
  noRecordsFound: string;
  loadingData: string;
  offlineNotice: string;
  // Mobile Navigation
  moreMenu: string;
  // Authentication & Login
  welcomeBack: string;
  signInPrompt: string;
  emailOrUsername: string;
  password: string;
  rememberMe: string;
  forgotPassword: string;
  signIn: string;
  signingIn: string;
  secureAccessNote: string;
  brandTagline: string;
  brandSubtitle: string;
  invalidCredentials: string;
  accountDisabled: string;
  rateLimited: string;
  networkError: string;
  forgotPasswordTitle: string;
  forgotPasswordInstructions: string;
  sendResetLink: string;
  backToSignIn: string;
  resetSuccess: string;
  signOut: string;
  demoCredentialsTitle: string;
  demoCredentialsSubtitle: string;
  financialInclusionPillar: string;
  communityLendingPillar: string;
  digitalTreasuryPillar: string;
  regulatoryCompliancePillar: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    appName: 'IMARA FINANCE',
    appSubtitle: 'Microfinance Management Platform',
    dashboard: 'Dashboard & MIS',
    customers: 'Customers & KYC',
    groups: 'Solidarity Groups',
    products: 'Loan Products',
    origination: 'Loan Origination',
    servicing: 'Loan Portfolio & Schedules',
    payments: 'Payments & Allocation',
    savings: 'Savings Ledger',
    accounting: 'General Ledger & COA',
    mobileMoney: 'Mobile Money Gateway',
    offlineSync: 'Field Operations & Sync',
    reports: 'Portfolio & PAR Reports',
    auditTrail: 'Audit Trail & Compliance',
    staffManagement: 'Staff & Team Directory',
    aboutDemo: 'About Platform & Live Demo',
    branch: 'Branch',
    allBranches: 'All Branches (Head Office)',
    role: 'Role',
    online: 'Online',
    offlineMode: 'Offline Field Mode',
    sync: 'Sync',
    language: 'Language',
    // About & Demo Section
    tagline: 'Smarter Microfinance. Stronger Communities.',
    exploreDemo: 'Explore Demo',
    signInButton: 'Sign In',
    builtForModernOps: 'Built for modern microfinance operations.',
    heroSupportingText: 'Manage customers, loans, savings, repayments, and financial operations from one secure, intelligent platform.',
    aboutHeading: 'About IMARA Finance',
    aboutParagraph1: 'IMARA Finance is a cloud-based microfinance management platform designed to help microfinance institutions, SACCOs, lending groups, and financial service providers manage their daily operations from one secure system.',
    aboutParagraph2: 'The platform connects managers, field officers, accountants, and administrators through a centralized workspace where they can register customers, manage groups, process loan applications, monitor repayments, track overdue accounts, manage savings, and generate financial reports.',
    aboutParagraph3: 'IMARA Finance is built for real operational environments, with role-based access, mobile-first field operations, English and Kiswahili language support, secure data storage, offline data collection, synchronization, audit trails, and digital payment integration.',
    featuresTitle: 'Comprehensive Microfinance Capabilities',
    howItWorksTitle: 'How IMARA Finance Works',
    roleBasedTitle: 'Role-Based Access Control',
    roleBasedStatement: 'Only authorized Managers and Super Administrators can create employee accounts. Employees cannot create their own privileged accounts or change their permissions.',
    languageSupportTitle: 'Designed for English and Kiswahili Users',
    mobileFirstTitle: 'Work From Anywhere',
    securityTitle: 'Enterprise-Grade Security & Integrity',
    demoPreviewTitle: 'Interactive System Previews',
    ctaTitle: 'Ready to simplify your microfinance operations?',
    ctaSubtitle: 'Explore the platform and discover a smarter way to manage customers, loans, savings, and repayments.',
    activeBorrowers: 'Active Borrowers',
    grossPortfolio: 'Gross Loan Portfolio',
    par30: 'Portfolio at Risk (PAR > 30)',
    par90: 'Portfolio at Risk (PAR > 90)',
    totalSavings: 'Total Client Savings',
    totalDisbursed: 'Total Cumulative Disbursed',
    repaymentRate: 'Monthly Collection Rate',
    liquidFloat: 'Mobile Money & Cash Float',
    quickActions: 'Quick Field Actions',
    newCustomer: 'Onboard Customer',
    applyLoan: 'New Loan Application',
    recordPayment: 'Record Repayment',
    savingsDeposit: 'Savings Deposit',
    recentRepayments: 'Real-time Collections Feed',
    portfolioDistribution: 'Product Portfolio Breakdown',
    search: 'Search by Name, NIDA, or Phone...',
    save: 'Save Changes',
    submit: 'Submit Application',
    cancel: 'Cancel',
    confirm: 'Confirm Action',
    approve: 'Approve',
    reject: 'Reject',
    disburse: 'Disburse Funds',
    reverse: 'Reverse Payment',
    exportPdf: 'Export Statement',
    status: 'Status',
    actions: 'Actions',
    date: 'Date',
    amount: 'Amount (TZS)',
    principal: 'Principal',
    interest: 'Interest',
    fees: 'Fees',
    penalties: 'Penalties',
    outstanding: 'Outstanding Balance',
    overdue: 'Days Overdue',
    phoneNumber: 'Phone Number',
    nidaNumber: 'NIDA National ID',
    businessType: 'Business / Economic Activity',
    monthlyIncome: 'Monthly Income (TZS)',
    residence: 'Residential Address',
    tenure: 'Tenure (Months)',
    interestRate: 'Interest Rate',
    repaymentFreq: 'Repayment Frequency',
    purpose: 'Loan Purpose',
    noRecordsFound: 'No records matching the selected criteria',
    loadingData: 'Connecting to Cloud SQL database...',
    offlineNotice: 'Operating offline. Actions are queued for field synchronization.',
    moreMenu: 'More Options',
    // Authentication & Login (English)
    welcomeBack: 'Welcome back',
    signInPrompt: 'Sign in to continue to your workspace',
    emailOrUsername: 'Email or username',
    password: 'Password',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?',
    signIn: 'Sign in',
    signingIn: 'Authenticating securely...',
    secureAccessNote: 'Secure access to your financial operations',
    brandTagline: 'Empowering communities through smarter financial management.',
    brandSubtitle: 'Microfinance Management Platform',
    invalidCredentials: 'Invalid username/email or password',
    accountDisabled: 'Account is inactive or suspended. Please contact your administrator.',
    rateLimited: 'Too many failed login attempts. Please wait 15 minutes before trying again.',
    networkError: 'Unable to connect to the authentication server. Please check your network.',
    forgotPasswordTitle: 'Reset Password',
    forgotPasswordInstructions: 'Enter your registered email or username to initiate a secure recovery OTP verification.',
    sendResetLink: 'Send Verification OTP',
    backToSignIn: 'Back to sign in',
    resetSuccess: 'Temporary recovery token generated and sent to registered contact.',
    signOut: 'Sign out',
    demoCredentialsTitle: 'Commercial Role Profiles',
    demoCredentialsSubtitle: 'Click any role to populate credentials and test authorized workspaces',
    financialInclusionPillar: 'Empowering 12,000+ micro-entrepreneurs & market collectives',
    communityLendingPillar: 'Social collateral & automated solidarity group monitoring',
    digitalTreasuryPillar: 'Real-time Vodacom M-Pesa, Airtel Money & Tigo Pesa integration',
    regulatoryCompliancePillar: 'Bank of Tanzania (BOT) prudential returns & IFRS 9 ECL provisioning',
  },
  sw: {
    appName: 'IMARA FINANCE',
    appSubtitle: 'Mfumo wa Usimamizi wa Taasisi za Kifedha',
    dashboard: 'Dashibodi & Takwimu',
    customers: 'Wateja na Utambuzi (KYC)',
    groups: 'Vikundi vya Mshikamano',
    products: 'Aina za Mikopo',
    origination: 'Maombi na Uidhinishaji',
    servicing: 'Mikopo na Ratiba za Marejesho',
    payments: 'Marejesho na Ugawaji',
    savings: 'Daftari la Akiba',
    accounting: 'Leja Kuu na Mpango wa Hesabu',
    mobileMoney: 'Lango la Pesa ya Simu',
    offlineSync: 'Uendeshaji wa Field & Usawazishaji',
    reports: 'Ripoti za BOT na PAR',
    auditTrail: 'Kumbukumbu za Ukaguzi',
    staffManagement: 'Usimamizi wa Wafanyakazi',
    aboutDemo: 'Kuhusu Mfumo & Jaribio la Moja kwa Moja',
    branch: 'Tawi',
    allBranches: 'Matawi Yote (Makao Makuu)',
    role: 'Wadhifa',
    online: 'Ipo Mtandaoni',
    offlineMode: 'Hali ya Field (Bila Mtandao)',
    sync: 'Sawazisha',
    language: 'Lugha',
    // About & Demo Section (Kiswahili)
    tagline: 'Huduma Bora za Mikopo. Jamii Imara Zaidi.',
    exploreDemo: 'Gundua Jaribio (Demo)',
    signInButton: 'Ingia Kwenye Mfumo',
    builtForModernOps: 'Imejengwa kwa ajili ya uendeshaji wa kisasa wa taasisi za mikopo.',
    heroSupportingText: 'Simamia wateja, mikopo, akiba, marejesho, na shughuli zote za kifedha kutoka mfumo mmoja salama na thabiti.',
    aboutHeading: 'Kuhusu IMARA Finance',
    aboutParagraph1: 'IMARA Finance ni jukwaa la kidijitali lililoundwa kusaidia taasisi za mikopo midogo, SACCOs, vikundi vya ukopeshaji, na watoa huduma za kifedha kusimamia shughuli zao za kila siku kupitia mfumo mmoja salama.',
    aboutParagraph2: 'Jukwaa linaunganisha mameneja, maafisa wa mikopo na field, wahasibu, na wakaguzi kupitia sehemu kuu ya kazi ambapo wanaweza kusajili wateja, kusimamia vikundi, kuchakata maombi ya mikopo, kufuatilia marejesho na madeni yaliyochelewa, kusimamia akiba, na kutoa ripoti za kina.',
    aboutParagraph3: 'IMARA Finance imejengwa kwa ajili ya mazingira halisi ya kazi, ikiwa na udhibiti wa majukumu (RBAC), uendeshaji wa simu kwa maafisa wa nyanjani, lugha za Kiingereza na Kiswahili, uhifadhi salama wa data, ukusanyaji data bila mtandao (offline sync), na muunganisho wa malipo ya kidijitali.',
    featuresTitle: 'Uwezo Kamili wa Usimamizi wa Mikopo Midogo',
    howItWorksTitle: 'Jinsi IMARA Finance Inavyofanya Kazi',
    roleBasedTitle: 'Udhibiti wa Ufikiaji Kulingana na Majukumu (RBAC)',
    roleBasedStatement: 'Ni Mameneja na Wasimamizi Wakuu walioidhinishwa pekee wanaoweza kufungua akaunti za wafanyakazi. Wafanyakazi hawawezi kujifungulia akaunti wala kubadilisha mamlaka yao.',
    languageSupportTitle: 'Imeundwa kwa Watumiaji wa Kiingereza na Kiswahili',
    mobileFirstTitle: 'Fanya Kazi Kutoka Popote Ulipo',
    securityTitle: 'Ulinzi na Usalama wa Kiwango cha Juu cha Kibenki',
    demoPreviewTitle: 'Mionekano ya Majaribio ya Mfumo',
    ctaTitle: 'Uko tayari kurahisisha shughuli za taasisi yako ya mikopo?',
    ctaSubtitle: 'Gundua jukwaa letu ujionee njia rahisi na ya kisasa ya kusimamia wateja, mikopo, akiba, na marejesho.',
    activeBorrowers: 'Wakopaji Wanaolipa',
    grossPortfolio: 'Jumla ya Mikopo Iliyotolewa',
    par30: 'Mikopo Iliyochelewa (PAR > Siku 30)',
    par90: 'Mikopo Hatari Sana (PAR > Siku 90)',
    totalSavings: 'Jumla ya Akiba za Wateja',
    totalDisbursed: 'Jumla Iliyotolewa Hadi Sasa',
    repaymentRate: 'Kiwango cha Makusanyo',
    liquidFloat: 'Salio la Pesa ya Simu na Sandukuni',
    quickActions: 'Hatua za Haraka za Field',
    newCustomer: 'Sajili Mteja Mpya',
    applyLoan: 'Omba Mkopo Mpya',
    recordPayment: 'Pokea Rejesho',
    savingsDeposit: 'Weka Akiba',
    recentRepayments: 'Mwenendo wa Marejesho ya Hivi Karibuni',
    portfolioDistribution: 'Mgawanyo wa Mikopo kwa Bidhaa',
    search: 'Tafuta kwa Jina, NIDA, au Nambari ya Simu...',
    save: 'Hifadhi Mabadiliko',
    submit: 'Wasilisha Maombi',
    cancel: 'Ghairi',
    confirm: 'Thibitisha Hatua',
    approve: 'Idhinisha',
    reject: 'Kataa',
    disburse: 'Toa Fedha za Mkopo',
    reverse: 'Batilisha Malipo',
    exportPdf: 'Pakua Taarifa',
    status: 'Hali',
    actions: 'Vitendo',
    date: 'Tarehe',
    amount: 'Kiasi (TZS)',
    principal: 'Msingi wa Mkopo',
    interest: 'Riba',
    fees: 'Ada',
    penalties: 'Faini/Adhabu',
    outstanding: 'Salio Lililobaki',
    overdue: 'Siku Zilizochelewa',
    phoneNumber: 'Nambari ya Simu',
    nidaNumber: 'NIDA Kitambulisho cha Taifa',
    businessType: 'Aina ya Biashara / Shughuli',
    monthlyIncome: 'Mapato ya Mwezi (TZS)',
    residence: 'Anwani ya Makazi',
    tenure: 'Muda (Miezi)',
    interestRate: 'Kiwango cha Riba',
    repaymentFreq: 'Marudio ya Marejesho',
    purpose: 'Madhumuni ya Mkopo',
    noRecordsFound: 'Hakuna rekodi zilizopatikana',
    loadingData: 'Inaunganisha na hifadhidata ya Cloud SQL...',
    offlineNotice: 'Mfumo hauna mtandao. Rekodi zimehifadhiwa kwenye kumbukumbu ya kifaa.',
    moreMenu: 'Chaguo Zaidi',
    // Authentication & Login (Kiswahili)
    welcomeBack: 'Karibu tena',
    signInPrompt: 'Ingia ili kuendelea kwenye mfumo wako',
    emailOrUsername: 'Barua pepe au jina la mtumiaji',
    password: 'Nenosiri',
    rememberMe: 'Nikumbuke',
    forgotPassword: 'Umesahau nenosiri?',
    signIn: 'Ingia',
    signingIn: 'Inathibitisha kwa usalama...',
    secureAccessNote: 'Ufikiaji salama wa shughuli zako za kifedha',
    brandTagline: 'Kuwezesha jamii kupitia usimamizi bora wa kifedha.',
    brandSubtitle: 'Mfumo wa Usimamizi wa Taasisi za Kifedha',
    invalidCredentials: 'Jina la mtumiaji/barua pepe au nenosiri si sahihi',
    accountDisabled: 'Akaunti imesimamishwa au haitumiki. Tafadhali wasiliana na msimamizi.',
    rateLimited: 'Majaribio yasiyo sahihi yamezidi. Tafadhali subiri dakika 15 kabla ya kujaribu tena.',
    networkError: 'Haikuweza kuunganishwa na seva ya uthibitishaji. Tafadhali kagua mtandao wako.',
    forgotPasswordTitle: 'Weka Upya Nenosiri',
    forgotPasswordInstructions: 'Weka barua pepe au jina la mtumiaji lililosajiliwa ili kupokea nambari ya uthibitisho (OTP).',
    sendResetLink: 'Tuma Nambari ya OTP',
    backToSignIn: 'Rudi kwenye kuingia',
    resetSuccess: 'Nambari ya muda ya kubadili nenosiri imetumwa kwenye mawasiliano yako.',
    signOut: 'Ondoka',
    demoCredentialsTitle: 'Wasifu wa Watumiaji Kibiashara',
    demoCredentialsSubtitle: 'Bonyeza wadhifa wowote kujaza nenosiri na kujaribu maeneo ya kazi yaliyoidhinishwa',
    financialInclusionPillar: 'Kuwezesha wajasiriamali wadogo na vikundi zaidi ya 12,000',
    communityLendingPillar: 'Dhamana ya kijamii na ufuatiliaji wa vikundi vya mshikamano',
    digitalTreasuryPillar: 'Muunganisho wa moja kwa moja na M-Pesa, Airtel Money & Tigo Pesa',
    regulatoryCompliancePillar: 'Uzingatiaji wa miongozo ya Benki Kuu ya Tanzania (BOT) na IFRS 9',
  },
};

export function roundCurrency(amount: number): number {
  return Math.round(amount || 0);
}

export function formatTZS(amount: number, lang: Language = 'en'): string {
  if (isNaN(amount) || amount === null || amount === undefined) return 'TZS 0';
  return new Intl.NumberFormat(lang === 'sw' ? 'sw-TZ' : 'en-TZ', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatDateLocale(dateStr: string, lang: Language = 'en'): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === 'sw' ? 'sw-TZ' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
