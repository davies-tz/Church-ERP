import { Language } from './i18n';

export interface FeatureItem {
  id: string;
  number: number;
  title: string;
  tagline: string;
  bullets: string[];
  icon: string;
  badge: string;
}

export interface HowItWorksStep {
  step: number;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
}

export interface RoleWorkspaceItem {
  id: string;
  roleTitle: string;
  authorityLevel: string;
  badgeColor: string;
  description: string;
  responsibilities: string[];
}

export interface SecurityPillar {
  title: string;
  description: string;
  verificationBadge: string;
}

export interface MobileCapability {
  title: string;
  description: string;
}

export interface EcosystemNode {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  metric?: string;
  status: string;
  category: 'branch' | 'field' | 'community' | 'payment' | 'core' | 'audit';
}

export const getAboutContent = (lang: Language) => {
  const isEn = lang === 'en';

  return {
    brand: {
      name: 'IMARA Finance',
      platformCategory: isEn ? 'SaaS Microfinance Platform' : 'Jukwaa la SaaS la Mikopo Midogo',
      tagline: isEn ? 'Smarter Microfinance. Stronger Communities.' : 'Huduma Bora za Mikopo. Jamii Imara Zaidi.',
      supportingText: isEn
        ? 'Manage customers, loans, savings, repayments, and financial operations from one secure, intelligent platform.'
        : 'Simamia wateja, mikopo, akiba, marejesho, na shughuli zote za kifedha kutoka mfumo mmoja salama na thabiti.',
      trustStatement: isEn
        ? 'Built for modern microfinance operations.'
        : 'Imejengwa kwa ajili ya uendeshaji wa kisasa wa taasisi za mikopo.',
      exploreDemo: isEn ? 'Explore Demo' : 'Gundua Jaribio (Demo)',
      signIn: isEn ? 'Sign In' : 'Ingia Kwenye Mfumo',
    },

    ecosystem: {
      title: isEn ? 'Connected Microfinance Ecosystem' : 'Muundo Kamili wa Mtandao wa Kifedha',
      subtitle: isEn
        ? 'Real-time synchronization across branch offices, mobile field operations, mobile money networks, and core accounting.'
        : 'Usawazishaji wa moja kwa moja kati ya matawi, shughuli za nyanjani, mitandao ya simu za mikononi, na leja kuu ya fedha.',
      nodes: [
        {
          id: 'core',
          title: isEn ? 'Secure Cloud Core Banking' : 'Mfumo Mkuu Salama wa Kibenki',
          subtitle: isEn ? 'PostgreSQL double-entry ledger & audit logging' : 'Leja ya hesabu mbili & rekodi za ukaguzi',
          badge: isEn ? 'Heartbeat: 99.99%' : 'Hali: 99.99%',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          metric: 'TZS 1.48B Gross Portfolio',
          status: isEn ? 'Synchronized' : 'Imeunganishwa',
          category: 'core' as const,
        },
        {
          id: 'branches',
          title: isEn ? 'Connected Branches' : 'Matawi Yaliyounganishwa',
          subtitle: isEn ? 'Kariakoo, Arusha, and Mwanza Regional Hubs' : 'Matawi ya Kariakoo, Arusha, na Mwanza',
          badge: isEn ? '3 Active Branches' : 'Matawi 3 Amilifu',
          badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
          metric: '1,842 Active Clients',
          status: isEn ? 'Online Replicating' : 'Mtandaoni',
          category: 'branch' as const,
        },
        {
          id: 'field',
          title: isEn ? 'Field Officer with Mobile Device' : 'Afisa wa Nyanjani kwa Simu Janja',
          subtitle: isEn ? 'Offline registration, GPS routing & cash receipts' : 'Usajili bila mtandao, ramani za GPS & risiti',
          badge: isEn ? 'Offline-First' : 'Bila Mtandao',
          badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
          metric: '22 Market Collections Today',
          status: isEn ? 'Auto-Syncing' : 'Kujisawazisha',
          category: 'field' as const,
        },
        {
          id: 'business',
          title: isEn ? 'Small Business Owners' : 'Wamiliki wa Biashara Ndogo',
          subtitle: isEn ? 'Market stall traders, wholesalers & artisans' : 'Wafanyabiashara wa masokoni & wajasiriamali',
          badge: isEn ? 'Biashara Boost' : 'Biashara Boost',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          metric: 'TZS 850,000 Avg Loan',
          status: isEn ? 'Productive Credit' : 'Mikopo ya Kazi',
          category: 'community' as const,
        },
        {
          id: 'savings',
          title: isEn ? 'Community Savings & Groups' : 'Akiba za Jamii na Vikundi',
          subtitle: isEn ? 'Solidarity group guarantees & weekly collections' : 'Dhamana za vikundi & akiba za wiki',
          badge: isEn ? 'Social Collateral' : 'Dhamana ya Jamii',
          badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          metric: 'TZS 620M Total Savings',
          status: isEn ? 'Compulsory & Voluntary' : 'Amana za Wateja',
          category: 'community' as const,
        },
        {
          id: 'payments',
          title: isEn ? 'Digital Repayments Gateway' : 'Lango la Malipo ya Kidijitali',
          subtitle: isEn ? 'Direct M-Pesa, Airtel Money & Tigo Pesa reconciliation' : 'Upatanisho wa papo hapo wa M-Pesa & Airtel',
          badge: isEn ? 'Instant C2B Push' : 'Muamala wa Papo Hapo',
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          metric: '99.8% On-time Rate',
          status: isEn ? 'Live Gateway' : 'Lango Imara',
          category: 'payment' as const,
        },
      ],
    },

    about: {
      headingBadge: isEn ? 'About the Platform' : 'Kuhusu Jukwaa',
      title: isEn ? 'About IMARA Finance' : 'Kuhusu IMARA Finance',
      paragraph1:
        'IMARA Finance is a cloud-based microfinance management platform designed to help microfinance institutions, SACCOs, lending groups, and financial service providers manage their daily operations from one secure system.',
      paragraph2:
        'The platform connects managers, field officers, accountants, and administrators through a centralized workspace where they can register customers, manage groups, process loan applications, monitor repayments, track overdue accounts, manage savings, and generate financial reports.',
      paragraph3:
        'IMARA Finance is built for real operational environments, with role-based access, mobile-first field operations, English and Kiswahili language support, secure data storage, offline data collection, synchronization, audit trails, and digital payment integration.',
    },

    features: {
      headingBadge: isEn ? 'Core Platform Capabilities' : 'Uwezo Mkuu wa Mfumo',
      title: isEn
        ? 'Eight Essential Modules for Commercial Microfinance'
        : 'Moduli Nane Muhimu za Uendeshaji wa Mikopo Midogo',
      items: [
        {
          id: 'customer-management',
          number: 1,
          title: isEn ? 'Customer Management' : 'Usimamizi wa Wateja',
          tagline: isEn ? 'KYC, biometric verification & profile records' : 'NIDA, KYC na wasifu kamili wa mkopaji',
          bullets: isEn
            ? [
                'Register and manage customer profiles.',
                'Capture KYC information.',
                'Assign customers to field officers.',
              ]
            : [
                'Kusajili na kusimamia wasifu wa wateja.',
                'Kukusanya taarifa za uthibitisho wa KYC na NIDA.',
                'Kupangia wateja kwa maafisa wa nyanjani.',
              ],
          icon: 'Users',
          badge: isEn ? 'Onboarding & KYC' : 'Usajili na KYC',
        },
        {
          id: 'loan-management',
          number: 2,
          title: isEn ? 'Loan Management' : 'Usimamizi wa Mikopo',
          tagline: isEn ? 'Underwriting, interest engines & product rules' : 'Uchakataji, hesabu za riba & bidhaa za mkopo',
          bullets: isEn
            ? [
                'Create loan applications.',
                'Configure loan products.',
                'Calculate interest, fees, penalties, and repayment schedules.',
                'Track the complete loan lifecycle.',
              ]
            : [
                'Kutengeneza maombi mapya ya mikopo.',
                'Kusanidi bidhaa za mikopo na sheria zake.',
                'Kupiga hesabu ya riba, ada, faini, na ratiba za marejesho.',
                'Kufuatilia mzunguko mzima wa mkopo tangu mwanzo.',
              ],
          icon: 'Briefcase',
          badge: isEn ? 'Origination & Servicing' : 'Utoaji na Usimamizi',
        },
        {
          id: 'repayment-tracking',
          number: 3,
          title: isEn ? 'Repayment Tracking' : 'Ufuatiliaji wa Marejesho',
          tagline: isEn ? 'Arrears aging, automated waterfall & PAR monitoring' : 'Marejesho kwa wakati, PAR & ukumbusho',
          bullets: isEn
            ? [
                'Monitor installment payments.',
                'View overdue accounts.',
                'Track collection performance.',
                'Follow up with customers.',
              ]
            : [
                'Kufuatilia malipo ya awamu za marejesho.',
                'Kuangalia akaunti zilizochelewa kurejesha.',
                'Kupima ufanisi wa makusanyo kwa tawi na afisa.',
                'Kufanya ufuatiliaji wa karibu na wateja.',
              ],
          icon: 'TrendingUp',
          badge: isEn ? 'Collections & Arrears' : 'Makusanyo na Madeni',
        },
        {
          id: 'savings-management',
          number: 4,
          title: isEn ? 'Savings Management' : 'Usimamizi wa Akiba',
          tagline: isEn ? 'Collateral reserves, voluntary deposits & interest' : 'Akiba za lazima za dhamana na za hiari',
          bullets: isEn
            ? [
                'Manage savings accounts.',
                'Record deposits and withdrawals.',
                'View customer savings balances.',
                'Track savings transactions.',
              ]
            : [
                'Kusimamia akaunti za akiba za wateja.',
                'Kurekodi amana na utoaji wa fedha.',
                'Kuangalia salio halisi la akiba za wateja.',
                'Kufuatilia miamala yote ya akiba.',
              ],
          icon: 'PiggyBank',
          badge: isEn ? 'Deposits & Collateral' : 'Amana na Dhamana',
        },
        {
          id: 'staff-management',
          number: 5,
          title: isEn ? 'Staff and Role Management' : 'Usimamizi wa Wafanyakazi na Majukumu',
          tagline: isEn ? 'Hierarchical RBAC, branch controls & performance' : 'Mamlaka kulingana na wadhifa & udhibiti wa matawi',
          bullets: isEn
            ? [
                'Managers create employee accounts.',
                'Assign staff to branches.',
                'Control permissions.',
                'Monitor employee performance.',
              ]
            : [
                'Mameneja kufungua akaunti za wafanyakazi.',
                'Kupangia wafanyakazi kwenye matawi mahususi.',
                'Kudhibiti mamlaka na viwango vya ufikiaji.',
                'Kufuatilia utendaji kazi wa kila mfanyakazi.',
              ],
          icon: 'UserCheck',
          badge: isEn ? 'Hierarchical RBAC' : 'Udhibiti wa Majukumu',
        },
        {
          id: 'reports-analytics',
          number: 6,
          title: isEn ? 'Reports and Analytics' : 'Ripoti na Uchambuzi wa Takwimu',
          tagline: isEn ? 'Bank of Tanzania compliance, PAR 30/90 & exports' : 'Ripoti za BOT, takwimu za PAR & upakuaji',
          bullets: isEn
            ? [
                'View portfolio performance.',
                'Monitor arrears and PAR.',
                'Generate branch and financial reports.',
                'Export data to CSV, Excel, and PDF.',
              ]
            : [
                'Kuangalia mwenendo na ubora wa jalada la mikopo.',
                'Kufuatilia mikopo iliyochelewa na PAR.',
                'Kutoa ripoti za kina za matawi na kifedha.',
                'Kupakua taarifa kwa mfumo wa CSV, Excel, na PDF.',
              ],
          icon: 'BarChart3',
          badge: isEn ? 'Intelligence & Compliance' : 'Takwimu na Sheria',
        },
        {
          id: 'mobile-offline',
          number: 7,
          title: isEn ? 'Mobile and Offline Operations' : 'Shughuli za Simu Bila Mtandao',
          tagline: isEn ? 'Field resilience for rural markets & auto-synchronization' : 'Kufanya kazi masokoni bila intaneti & kujisawazisha',
          bullets: isEn
            ? [
                'Register customers using a mobile phone.',
                'Record field collections offline.',
                'Synchronize data when internet returns.',
                'View assigned customers and repayment tasks.',
              ]
            : [
                'Kusajili wateja wapya kupitia simu ya mkononi.',
                'Kurekodi makusanyo ya nyanjani bila intaneti.',
                'Kujisawazisha kiotomatiki mtandao ukirejea.',
                'Kuangalia orodha ya wateja na majukumu ya siku.',
              ],
          icon: 'WifiOff',
          badge: isEn ? 'Offline-First Tech' : 'Teknolojia ya Nyanjani',
        },
        {
          id: 'secure-operations',
          number: 8,
          title: isEn ? 'Secure Financial Operations' : 'Shughuli Salama za Kifedha',
          tagline: isEn ? 'Double-entry ledger, cryptographic tokens & audit logs' : 'Leja ya hesabu mbili, usalama wa data & ukaguzi',
          bullets: isEn
            ? [
                'Role-based access control.',
                'Audit logs.',
                'Secure authentication.',
                'Financial transaction validation.',
                'Real database persistence.',
              ]
            : [
                'Udhibiti wa ufikiaji kulingana na wadhifa (RBAC).',
                'Kumbukumbu zisizoweza kubadilishwa za ukaguzi.',
                'Uthibitishaji salama wa kitambulisho na nenosiri.',
                'Uhifadhi na uhakiki sahihi wa miamala ya fedha.',
                'Hifadhi halisi ya data kwenye hifadhidata ya kisasa.',
              ],
          icon: 'Lock',
          badge: isEn ? 'Integrity & Ledger' : 'Uadilifu na Leja',
        },
      ],
    },

    howItWorks: {
      headingBadge: isEn ? 'Operational Workflow' : 'Mlolongo wa Uendeshaji',
      title: isEn ? 'How It Works' : 'Jinsi Mfumo Unavyofanya Kazi',
      subtitle: isEn
        ? 'A clean, four-step journey from institution setup to continuous financial growth.'
        : 'Hatua nne zilizopangwa vizuri kuanzia usanidi wa taasisi hadi ukuzaji wa mtaji.',
      steps: [
        {
          step: 1,
          title: isEn ? 'Create Your Organization' : 'Sanidi Taasisi Yako',
          subtitle: isEn ? 'Foundational Setup' : 'Usanidi wa Awali',
          description: isEn
            ? 'Set up branches, staff, loan products, and system settings.'
            : 'Weka matawi, wafanyakazi, bidhaa za mikopo, na mipangilio ya mfumo.',
          icon: 'Building2',
        },
        {
          step: 2,
          title: isEn ? 'Register Customers' : 'Sajili Wateja',
          subtitle: isEn ? 'Customer Onboarding' : 'Kuingiza Wateja',
          description: isEn
            ? 'Capture customer details, KYC information, and group membership.'
            : 'Chukua taarifa za wateja, nyaraka za KYC, na uanachama wa vikundi.',
          icon: 'UserPlus',
        },
        {
          step: 3,
          title: isEn ? 'Manage Loans and Collections' : 'Simamia Mikopo na Makusanyo',
          subtitle: isEn ? 'Credit Lifecycle' : 'Mzunguko wa Mkopo',
          description: isEn
            ? 'Process applications, approve loans, record repayments, and follow up overdue accounts.'
            : 'Chakata maombi, idhinisha mikopo, rekodi marejesho, na fuatilia akaunti zilizochelewa.',
          icon: 'CreditCard',
        },
        {
          step: 4,
          title: isEn ? 'Monitor and Grow' : 'Tathmini na Kuza Mtaji',
          subtitle: isEn ? 'Strategic Analytics' : 'Uchambuzi wa Kimkakati',
          description: isEn
            ? 'Use reports and analytics to make informed financial decisions.'
            : 'Tumia ripoti na takwimu za kina kufanya maamuzi sahihi ya kifedha.',
          icon: 'TrendingUp',
        },
      ],
    },

    rbac: {
      headingBadge: isEn ? 'Enterprise Access Architecture' : 'Muundo wa Mamlaka ya Watumiaji',
      title: isEn ? 'Role-Based Access Control' : 'Udhibiti wa Ufikiaji Kulingana na Wadhifa',
      subtitle: isEn
        ? 'Every user sees a dedicated workspace precisely calibrated to their institutional role.'
        : 'Kila mtumiaji hufungua eneo la kazi lililowekewa mipaka kulingana na wadhifa wake wa kikazi.',
      importantStatement:
        'Only authorized Managers and Super Administrators can create employee accounts. Employees cannot create their own privileged accounts or change their permissions.',
      roles: [
        {
          id: 'super-admin',
          roleTitle: isEn ? 'Super Admin' : 'Msimamizi Mkuu',
          authorityLevel: isEn ? 'Institutional Level' : 'Ngazi ya Juu ya Taasisi',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          description: isEn
            ? 'Full institutional configuration, branch expansion, global parameter settings, system audit trails, and executive governance.'
            : 'Usanidi kamili wa taasisi, ufunguzi wa matawi, mipangilio ya mfumo mzima, na ukaguzi mkuu.',
          responsibilities: isEn
            ? ['Branch & product creation', 'System-wide policy enforcement', 'Audit trail surveillance']
            : ['Kufungua matawi na bidhaa', 'Kuweka sera za taasisi', 'Kuangalia kumbukumbu za mfumo'],
        },
        {
          id: 'manager',
          roleTitle: isEn ? 'Manager' : 'Meneja wa Tawi',
          authorityLevel: isEn ? 'Branch Operational Level' : 'Ngazi ya Uendeshaji Tawi',
          badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
          description: isEn
            ? 'Direct oversight of branch portfolios, staff provisioning, credit approvals within branch limits, and arrears management.'
            : 'Usimamizi wa tawi zima, ufunguzi wa akaunti za wafanyakazi, kuidhinisha mikopo, na kusimamia marejesho.',
          responsibilities: isEn
            ? ['Create & assign employee accounts', 'Approve/reject credit files', 'Branch target monitoring']
            : ['Kusajili wafanyakazi wapya', 'Kuidhinisha maombi ya mikopo', 'Kufuatilia malengo ya tawi'],
        },
        {
          id: 'field-officer',
          roleTitle: isEn ? 'Field Officer' : 'Afisa wa Nyanjani (Field)',
          authorityLevel: isEn ? 'Mobile Field Operations' : 'Uendeshaji wa Nyanjani',
          badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          description: isEn
            ? 'Field customer registration, solidarity center meetings, offline collection recording, GPS tracking, and payment receipts.'
            : 'Kusajili wateja nyanjani, kuendesha mikutano ya vikundi, kukusanya marejesho bila mtandao, na kutoa risiti.',
          responsibilities: isEn
            ? ['Client biometric registration', 'Offline repayment collection', 'Group guarantee verification']
            : ['Kusajili wateja kwa simu', 'Kukusanya marejesho bila intaneti', 'Kuhakiki dhamana za vikundi'],
        },
        {
          id: 'loan-officer',
          roleTitle: isEn ? 'Loan Officer' : 'Afisa wa Mikopo',
          authorityLevel: isEn ? 'Underwriting & Appraisal' : 'Tathmini ya Maombi ya Mikopo',
          badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
          description: isEn
            ? 'Cash flow evaluation, debt-to-income analysis, collateral inspection, loan application packaging, and customer counseling.'
            : 'Kuchambua uwezo wa kifedha wa mkopaji, kukagua dhamana za biashara, na kuwasilisha maombi ya uidhinishwaji.',
          responsibilities: isEn
            ? ['Debt capacity calculation', 'Physical collateral assessment', 'Appraisal file compilation']
            : ['Kupima uwezo wa kulipa', 'Ukaguzi wa dhamana halisi', 'Kuandaa taarifa ya mkopo'],
        },
        {
          id: 'accountant',
          roleTitle: isEn ? 'Accountant' : 'Mhasibu',
          authorityLevel: isEn ? 'Treasury & Ledger' : 'Hazina na Leja ya Hesabu',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          description: isEn
            ? 'Double-entry chart of accounts, manual journals, mobile money float reconciliation, cashier balancing, and financial statements.'
            : 'Mpango mkuu wa hesabu (COA), vocha za marekebisho, usuluhishi wa salio la M-Pesa na Airtel Money, na taarifa za fedha.',
          responsibilities: isEn
            ? ['General ledger posting', 'Cash float reconciliation', 'Income statement generation']
            : ['Kuposti miamala ya leja', 'Kupatanisha salio la fedha', 'Kutoa taarifa za mapato'],
        },
        {
          id: 'auditor',
          roleTitle: isEn ? 'Auditor' : 'Mkaguzi wa Hesabu / Compliance',
          authorityLevel: isEn ? 'Independent Oversight' : 'Ukaguzi Huru na Sheria',
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          description: isEn
            ? 'Read-only access to transaction history, security log inspection, non-repudiation audit trails, and compliance checks.'
            : 'Ufikiaji wa kusoma miamala yote, ukaguzi wa kumbukumbu za kiusalama, na uthibitishaji wa uzingatiaji wa sheria.',
          responsibilities: isEn
            ? ['Immutable log inspection', 'Non-performing loan audit', 'Regulatory compliance review']
            : ['Kukagua miamala isiyofutika', 'Ukaguzi wa mikopo mibaya', 'Uzingatiaji wa miongozo ya serikali'],
        },
      ],
    },

    languageSupport: {
      headingBadge: isEn ? 'Localization Architecture' : 'Muundo wa Lugha',
      title: isEn ? 'Designed for English and Kiswahili Users' : 'Imeundwa kwa Watumiaji wa Kiingereza na Kiswahili',
      subtitle: isEn
        ? 'Users can switch between English and fluent localized Kiswahili throughout the application with zero page reloads.'
        : 'Watumiaji wanaweza kubadili lugha kwa urahisi kati ya Kiingereza na Kiswahili fasaha katika kurasa zote za mfumo bila kupoteza kazi zao.',
      description: isEn
        ? 'East African microfinance operations bridge rural market traders, village solidarity groups, and regional boardrooms. IMARA Finance provides full institutional parity in both languages: from loan contract agreements and SMS payment confirmations to executive balance sheets.'
        : 'Uendeshaji wa mikopo midogo unahusisha wafanyabiashara wa masokoni, vikundi vya vijijini, na bodi za wakurugenzi. IMARA Finance inatoa uwezo kamili katika lugha zote mbili: kuanzia mikataba ya mikopo na ujumbe mfupi wa SMS hadi ripoti kuu za fedha.',
    },

    mobileFirst: {
      headingBadge: isEn ? 'Field Mobility' : 'Uwezo wa Kutembea Nyanjani',
      title: isEn ? 'Work from Anywhere' : 'Fanya Kazi Kutoka Popote Ulipo',
      subtitle: isEn
        ? 'Field officers can use the platform on smartphones, tablets, and desktop computers.'
        : 'Maafisa wa nyanjani wanaweza kutumia mfumo huu kwenye simu za mkononi, vishikwambi (tablets), na kompyuta za mezani.',
      capabilities: isEn
        ? [
            {
              title: 'Customer Registration',
              description: 'Onboard clients and capture biometric NIDA documentation directly in open-air markets.',
            },
            {
              title: 'Loan Applications',
              description: 'Initiate and submit credit proposals on site with automated DTI and debt calculation.',
            },
            {
              title: 'Repayment Tracking',
              description: 'Access real-time schedules, overdue days, and immediate installment balance receipts.',
            },
            {
              title: 'Collection Follow-up',
              description: 'Execute route-optimized follow-up tasks for arrears and solidarity group meetings.',
            },
            {
              title: 'Offline Data Capture',
              description: 'Record financial transactions securely in zero-reception rural villages with indexed local queues.',
            },
            {
              title: 'Automatic Synchronization',
              description: 'Encrypted background data sync immediately reconciles records as soon as internet returns.',
            },
          ]
        : [
            {
              title: 'Usajili wa Wateja',
              description: 'Kusajili wateja na kupiga picha za vitambulisho vya NIDA moja kwa moja sokoni.',
            },
            {
              title: 'Maombi ya Mikopo',
              description: 'Kuanzisha na kuwasilisha maombi ya mikopo papo hapo pamoja na hesabu za uwezo wa kulipa.',
            },
            {
              title: 'Ufuatiliaji wa Marejesho',
              description: 'Kuangalia ratiba za malipo, siku zilizochelewa, na kutoa risiti za papo hapo.',
            },
            {
              title: 'Ufuatiliaji wa Makusanyo',
              description: 'Kufanya ziara zilizopangwa za makusanyo ya madeni na mikutano ya vikundi vya kijamii.',
            },
            {
              title: 'Kukusanya Data Bila Mtandao',
              description: 'Kurekodi marejesho salama vijijini hata pasipo na intaneti kupitia kumbukumbu ya simu.',
            },
            {
              title: 'Usawazishaji wa Kiotomatiki',
              description: 'Kusawazisha data kiotomatiki kwa usalama punde tu mtandao unapopatikana tena.',
            },
          ],
    },

    security: {
      headingBadge: isEn ? 'Enterprise Security' : 'Ulinzi na Usalama',
      title: isEn ? 'Secure Financial Operations' : 'Uendeshaji Salama wa Kifedha',
      subtitle: isEn
        ? 'Grounded, auditable financial technology engineered to protect borrower privacy and institutional capital.'
        : 'Teknolojia thabiti na inayokaguliwa iliyoundwa kulinda usiri wa wateja na mtaji wa taasisi.',
      pillars: isEn
        ? [
            {
              title: 'Firebase Authentication',
              description: 'Cryptographic identity tokens, salted password hashing, and session validation on every request.',
              verificationBadge: 'Verified Auth',
            },
            {
              title: 'Role-Based Permissions',
              description: 'Granular server-enforced authorization ensuring users never exceed their designated role scope.',
              verificationBadge: 'Strict RBAC',
            },
            {
              title: 'Secure Backend Validation',
              description: 'All interest, penalty, and loan limits calculated on protected server endpoints, never client-side.',
              verificationBadge: 'Server-Authoritative',
            },
            {
              title: 'Encrypted Communication',
              description: 'End-to-end TLS 1.3 protocol encryption protecting all data transmitted between devices and cloud.',
              verificationBadge: 'TLS 1.3 Encrypted',
            },
            {
              title: 'Audit Trails',
              description: 'Immutable, tamper-evident logs tracking user ID, IP address, action code, and timestamped payloads.',
              verificationBadge: 'Non-Repudiation Logs',
            },
            {
              title: 'Controlled Database Access',
              description: 'Encapsulated PostgreSQL queries executed via ORM with parameterized inputs to prevent injection.',
              verificationBadge: 'PostgreSQL Protected',
            },
            {
              title: 'Secure Financial Transactions',
              description: 'Atomic database transactions guaranteeing exact double-entry balancing with no orphaned debits.',
              verificationBadge: 'ACID Compliant',
            },
            {
              title: 'User Account Management',
              description: 'Zero open public signups; user accounts can only be provisioned by authorized Managers or Admins.',
              verificationBadge: 'Controlled Access',
            },
          ]
        : [
            {
              title: 'Uthibitishaji wa Firebase',
              description: 'Tokeni za kidijitali za utambulisho na ulinzi wa nenosiri kwenye kila ombi la mfumo.',
              verificationBadge: 'Uthibitisho Salama',
            },
            {
              title: 'Mamlaka ya Majukumu (RBAC)',
              description: 'Sheria za ufikiaji zinazolindwa na seva ili mtumiaji asivuke kiwango chake cha mamlaka.',
              verificationBadge: 'RBAC Madhubuti',
            },
            {
              title: 'Uhakiki Salama wa Seva',
              description: 'Hesabu zote za riba, faini, na vikomo vya mikopo hufanyika kwenye seva salama.',
              verificationBadge: 'Hesabu za Seva',
            },
            {
              title: 'Mawasiliano Yaliyolindwa',
              description: 'Ulinzi wa data kwa mfumo wa TLS 1.3 wakati data inaposafirishwa kutoka kwenye vifaa.',
              verificationBadge: 'TLS 1.3 Salama',
            },
            {
              title: 'Kumbukumbu za Ukaguzi',
              description: 'Rekodi zisizoweza kufutika zinazorekodi mtumiaji, anwani ya IP, na wakati muamala ulipofanyika.',
              verificationBadge: 'Rekodi Zisizofutika',
            },
            {
              title: 'Ufikiaji Salama wa Hifadhidata',
              description: 'Hifadhidata ya PostgreSQL inalindwa kuzuia udukuzi au uingiliaji wa mifumo ya nje.',
              verificationBadge: 'PostgreSQL Salama',
            },
            {
              title: 'Miamala Salama ya Kifedha',
              description: 'Miamala ya hesabu mbili inayozingatia uwiano halisi bila kupoteza senti hata moja.',
              verificationBadge: 'Hesabu Kamili',
            },
            {
              title: 'Usimamizi wa Akaunti za Watumiaji',
              description: 'Hakuna usajili holela; akaunti hufunguliwa tu na Mameneja au Wasimamizi Wakuu.',
              verificationBadge: 'Akaunti Zilizoidhinishwa',
            },
          ],
    },

    demoPreview: {
      headingBadge: isEn ? 'Real Platform Mockups' : 'Mifano Halisi ya Mfumo',
      title: isEn ? 'Live Demonstration Preview' : 'Mwonekano wa Majaribio ya Mfumo',
      subtitle: isEn
        ? 'Inspect authentic demo representations of the operational screens used daily by microfinance teams.'
        : 'Tazama mifano halisi ya kurasa zinazotumiwa kila siku na wataalamu wa mikopo midogo.',
      sampleDataNotice: isEn ? 'SAMPLE DEMONSTRATION DATA' : 'DATA YA MAJARIBIO YA MFANO',
    },

    cta: {
      title: isEn ? 'Ready to simplify your microfinance operations?' : 'Uko tayari kurahisisha shughuli za taasisi yako ya mikopo?',
      subtitle: isEn
        ? 'Explore the platform and discover a smarter way to manage customers, loans, savings, and repayments.'
        : 'Gundua jukwaa letu ujionee njia rahisi na ya kisasa ya kusimamia wateja, mikopo, akiba, na marejesho.',
      exploreDemo: isEn ? 'Explore Demo' : 'Gundua Jaribio (Demo)',
      signIn: isEn ? 'Sign In' : 'Ingia Kwenye Mfumo',
    },
  };
};
