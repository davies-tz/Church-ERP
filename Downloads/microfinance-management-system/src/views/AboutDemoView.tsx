import React, { useState } from 'react';
import {
  ShieldCheck,
  Smartphone,
  Users,
  CreditCard,
  PiggyBank,
  UserCheck,
  BarChart3,
  WifiOff,
  Lock,
  ArrowRight,
  CheckCircle2,
  Globe2,
  Briefcase,
  Building2,
  Sparkles,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  Download,
  Check,
  Layers,
  Store,
  Compass,
  FileText,
  UserPlus
} from 'lucide-react';
import { useMfi } from '../context/MfiContext';
import { Language, translations, formatTZS } from '../lib/i18n';
import { getAboutContent } from '../lib/aboutContent';
import { ConnectedEcosystemVisual } from '../components/ConnectedEcosystemVisual';

interface AboutDemoViewProps {
  onGoToLogin: () => void;
  onExploreDemo: () => void;
}

export const AboutDemoView: React.FC<AboutDemoViewProps> = ({ onGoToLogin, onExploreDemo }) => {
  const { language, setLanguage } = useMfi();
  const t = translations[language];
  const content = getAboutContent(language);
  const isEn = language === 'en';

  const [activeDemoTab, setActiveDemoTab] = useState<
    'manager' | 'customer' | 'loan' | 'repayment' | 'staff' | 'reports' | 'field'
  >('manager');

  const toggleLanguage = (lang: Language) => {
    setLanguage(lang);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/85 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                  IMARA Finance
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {content.brand.platformCategory}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                {content.brand.tagline}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Language Switcher */}
            <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                id="btn-lang-en"
                onClick={() => toggleLanguage('en')}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  language === 'en'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                English
              </button>
              <button
                type="button"
                id="btn-lang-sw"
                onClick={() => toggleLanguage('sw')}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  language === 'sw'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Kiswahili
              </button>
            </div>

            <button
              type="button"
              id="header-explore-demo-btn"
              onClick={onExploreDemo}
              className="hidden md:inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>{content.brand.exploreDemo}</span>
            </button>

            <button
              type="button"
              id="header-signin-btn"
              onClick={onGoToLogin}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition transform hover:-translate-y-0.5"
            >
              <span>{content.brand.signIn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-800">
        <div className="absolute inset-0 -z-10 opacity-30">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-emerald-600/20 blur-[140px] rounded-full pointer-events-none" />
          <div className="absolute top-60 -left-20 w-[450px] h-[450px] bg-teal-600/15 blur-[120px] rounded-full pointer-events-none" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-6 space-y-6 text-left">
              {/* Trust Statement Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>{content.brand.trustStatement}</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                {isEn ? (
                  <>
                    Smarter Microfinance.{' '}
                    <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                      Stronger Communities.
                    </span>
                  </>
                ) : (
                  <>
                    Huduma Bora za Mikopo.{' '}
                    <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                      Jamii Imara Zaidi.
                    </span>
                  </>
                )}
              </h1>

              {/* Supporting Text */}
              <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed max-w-xl">
                {content.brand.supportingText}
              </p>

              {/* Main Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  id="hero-explore-demo-btn"
                  onClick={onExploreDemo}
                  className="px-6 py-3.5 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 shadow-xl shadow-emerald-500/25 flex items-center gap-2.5 transition transform hover:-translate-y-0.5"
                >
                  <Sparkles className="w-5 h-5 text-slate-950" />
                  <span>{content.brand.exploreDemo}</span>
                </button>

                <button
                  type="button"
                  id="hero-signin-btn"
                  onClick={onGoToLogin}
                  className="px-6 py-3.5 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 flex items-center gap-2 transition"
                >
                  <span>{content.brand.signIn}</span>
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </button>
              </div>

              {/* Key Quantitative Proof Points */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-slate-800/80">
                <div>
                  <div className="text-2xl font-black text-white">99.8%</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {isEn ? 'Collection Rate' : 'Kiwango cha Makusanyo'}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-emerald-400">100%</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {isEn ? 'Offline Field Sync' : 'Kazi Bila Mtandao'}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-teal-400">BOT & IFRS 9</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {isEn ? 'Statutory Ready' : 'Uzingatiaji wa Sheria'}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Connected Financial Ecosystem Visual Column */}
            <div className="lg:col-span-6">
              <ConnectedEcosystemVisual language={language} onExploreDemo={onExploreDemo} />
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-slate-900/40 border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/20">
              {content.about.headingBadge}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-3 text-white">
              {content.about.title}
            </h2>
          </div>

          <div className="space-y-6 text-slate-300 text-base sm:text-lg leading-relaxed bg-slate-900/80 p-8 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl">
            <p className="font-medium text-slate-200">
              {content.about.paragraph1}
            </p>
            <p>
              {content.about.paragraph2}
            </p>
            <p className="border-t border-slate-800 pt-6 text-slate-300 text-sm sm:text-base">
              {content.about.paragraph3}
            </p>
          </div>
        </div>
      </section>

      {/* Features Section (8 Visually Attractive Cards with Exact Bullets) */}
      <section className="py-20 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/20">
              {content.features.headingBadge}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-3 text-white">
              {content.features.title}
            </h2>
            <p className="text-slate-400 mt-3 text-sm sm:text-base">
              {isEn
                ? 'Architected specifically for microfinance institutions, SACCOs, and community credit providers.'
                : 'Imeundwa mahsusi kwa ajili ya taasisi za mikopo, SACCOs, na vikundi vya kijamii.'}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {content.features.items.map((item) => {
              return (
                <div
                  key={item.id}
                  id={`feature-card-${item.number}`}
                  className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between group shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                        {item.number}
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
                        {item.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white mb-1 group-hover:text-emerald-300 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-400 mb-4 italic">
                      {item.tagline}
                    </p>

                    <ul className="space-y-2 border-t border-slate-800/80 pt-3.5">
                      {item.bullets.map((bullet, bIdx) => (
                        <li key={bIdx} className="flex items-start gap-2 text-xs text-slate-300">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section (4 Steps) */}
      <section className="py-20 bg-slate-900/40 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/20">
              {content.howItWorks.headingBadge}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-3 text-white">
              {content.howItWorks.title}
            </h2>
            <p className="text-slate-400 mt-3 text-sm sm:text-base max-w-2xl mx-auto">
              {content.howItWorks.subtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {content.howItWorks.steps.map((step) => (
              <div
                key={step.step}
                id={`how-it-works-step-${step.step}`}
                className="relative p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-md shadow-emerald-500/20">
                      0{step.step}
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase">
                      {step.subtitle}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Role-Based Access Section */}
      <section className="py-20 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/20">
              {content.rbac.headingBadge}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-3 text-white">
              {content.rbac.title}
            </h2>
            <p className="text-slate-400 mt-3 text-sm sm:text-base">
              {content.rbac.subtitle}
            </p>
          </div>

          {/* Important Security Callout Statement Box */}
          <div className="mb-12 p-6 sm:p-7 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 max-w-4xl mx-auto flex items-start gap-4 shadow-xl">
            <ShieldCheck className="w-7 h-7 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                {isEn ? 'Institution Governance Policy' : 'Sera ya Mamlaka ya Taasisi'}
              </h4>
              <p className="text-base sm:text-lg font-semibold text-white mt-1.5 leading-snug">
                "{content.rbac.importantStatement}"
              </p>
            </div>
          </div>

          {/* 6 Roles Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {content.rbac.roles.map((r) => (
              <div
                key={r.id}
                id={`role-box-${r.id}`}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-white text-base">{r.roleTitle}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${r.badgeColor}`}>
                      {r.authorityLevel}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    {r.description}
                  </p>
                </div>

                <div className="border-t border-slate-800 pt-3 space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">
                    {isEn ? 'Authorized Scope' : 'Mamlaka Yaliyoidhinishwa'}
                  </div>
                  {r.responsibilities.map((resp, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{resp}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Language Support Section */}
      <section className="py-20 bg-slate-900/40 border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/10">
            <Globe2 className="w-8 h-8" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/20">
            {content.languageSupport.headingBadge}
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-4 text-white">
            {content.languageSupport.title}
          </h2>
          <p className="text-slate-300 mt-4 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            {content.languageSupport.subtitle}
          </p>

          <p className="text-slate-400 mt-3 text-xs sm:text-sm max-w-3xl mx-auto leading-relaxed">
            {content.languageSupport.description}
          </p>

          {/* Interactive Language Switcher Controls */}
          <div className="mt-8 inline-flex items-center gap-3 p-2 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl">
            <button
              type="button"
              id="lang-section-toggle-en"
              onClick={() => toggleLanguage('en')}
              className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                language === 'en'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              English {language === 'en' && '(Active)'}
            </button>
            <button
              type="button"
              id="lang-section-toggle-sw"
              onClick={() => toggleLanguage('sw')}
              className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                language === 'sw'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Kiswahili {language === 'sw' && '(Amilifu)'}
            </button>
          </div>
        </div>
      </section>

      {/* Mobile-First Section (Work From Anywhere) */}
      <section className="py-20 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/20">
                {content.mobileFirst.headingBadge}
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                {content.mobileFirst.title}
              </h2>
              <p className="text-slate-300 leading-relaxed text-base">
                {content.mobileFirst.subtitle}
              </p>

              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                {content.mobileFirst.capabilities.map((cap, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <div className="flex items-center gap-2 font-bold text-white text-xs mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{cap.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed pl-5.5">
                      {cap.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Device Mockup */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-[340px] rounded-[40px] bg-slate-900 border-4 border-slate-700 p-4 shadow-2xl shadow-emerald-500/10">
                <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-4" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="font-bold text-emerald-400">Field Workspace</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                      Offline Ready
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/90 border border-slate-700">
                    <div className="text-[11px] text-slate-400">Today's Collections</div>
                    <div className="text-xl font-black text-white">{formatTZS(4850000, language)}</div>
                    <div className="text-[10px] text-emerald-400 mt-0.5">18 of 22 scheduled loans collected</div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-slate-300">Upcoming Route Installments</div>
                    <div className="p-2.5 rounded-lg bg-slate-800/50 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-white">Fatuma Rashid Mwamba</div>
                        <div className="text-[10px] text-slate-400">Kariakoo Market - Group A</div>
                      </div>
                      <span className="font-bold text-emerald-400">TZS 120,000</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-800/50 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-white">Juma Mwita</div>
                        <div className="text-[10px] text-slate-400">Bodaboda SACCO Center</div>
                      </div>
                      <span className="font-bold text-emerald-400">TZS 85,000</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="mobile-frame-demo-btn"
                    onClick={onExploreDemo}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition mt-2 shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5"
                  >
                    <span>Open Live Field Workspace</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section (Grounded, Honest Security Architecture) */}
      <section className="py-20 bg-slate-900/40 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/20">
              {content.security.headingBadge}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-3 text-white">
              {content.security.title}
            </h2>
            <p className="text-slate-400 mt-3 text-sm sm:text-base">
              {content.security.subtitle}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {content.security.pillars.map((sec, idx) => (
              <div
                key={idx}
                id={`security-card-${idx}`}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <Lock className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700">
                      {sec.verificationBadge}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-sm mb-1.5">
                    {sec.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {sec.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Preview Section (Mockup with Clearly Labeled Sample Data) */}
      <section className="py-20 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/20">
              {content.demoPreview.headingBadge}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-3 text-white">
              {content.demoPreview.title}
            </h2>
            <p className="text-slate-400 mt-2 text-sm sm:text-base">
              {content.demoPreview.subtitle}
            </p>
          </div>

          {/* Module Tab Selector */}
          <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 mb-8">
            {[
              { id: 'manager', label: isEn ? 'Manager Dashboard' : 'Dashibodi ya Meneja' },
              { id: 'customer', label: isEn ? 'Customer Profile' : 'Wasifu wa Mteja' },
              { id: 'loan', label: isEn ? 'Loan Details' : 'Taarifa za Mkopo' },
              { id: 'repayment', label: isEn ? 'Repayment Schedule' : 'Ratiba ya Marejesho' },
              { id: 'staff', label: isEn ? 'Staff Management' : 'Usimamizi wa Wafanyakazi' },
              { id: 'reports', label: isEn ? 'Reports' : 'Ripoti za Fedha' },
              { id: 'field', label: isEn ? 'Mobile Field Officer' : 'Afisa wa Nyanjani' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                id={`tab-preview-${tab.id}`}
                onClick={() => setActiveDemoTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeDemoTab === tab.id
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Interactive Preview Container with Explicit Demo Notice */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-white uppercase tracking-wider">
                  Live Preview: {activeDemoTab.toUpperCase().replace('_', ' ')}
                </span>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold self-start sm:self-auto">
                {content.demoPreview.sampleDataNotice}
              </span>
            </div>

            <div className="pt-6">
              {activeDemoTab === 'manager' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-xs text-slate-400">Active Borrowers</div>
                      <div className="text-2xl font-black text-white mt-1">1,842</div>
                      <div className="text-[11px] text-emerald-400 mt-1">↑ +14% this quarter</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-xs text-slate-400">Gross Portfolio</div>
                      <div className="text-2xl font-black text-emerald-400 mt-1">TZS 1.48B</div>
                      <div className="text-[11px] text-slate-400 mt-1">Across 3 branches</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-xs text-slate-400">PAR &gt; 30 Days</div>
                      <div className="text-2xl font-black text-amber-400 mt-1">2.4%</div>
                      <div className="text-[11px] text-emerald-400 mt-1">Well below 5% BOT limit</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-xs text-slate-400">Total Savings Pool</div>
                      <div className="text-2xl font-black text-cyan-400 mt-1">TZS 620M</div>
                      <div className="text-[11px] text-slate-400 mt-1">Compulsory & voluntary</div>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-white">Pending Branch Manager Approvals</div>
                      <div className="text-xs text-slate-400">4 micro-business loans ready for sanctioning</div>
                    </div>
                    <button
                      type="button"
                      onClick={onExploreDemo}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shrink-0"
                    >
                      Review & Approve in Demo
                    </button>
                  </div>
                </div>
              )}

              {activeDemoTab === 'customer' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="w-14 h-14 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xl shrink-0">
                      FR
                    </div>
                    <div>
                      <div className="text-base font-bold text-white">Fatuma Rashid Mwamba</div>
                      <div className="text-xs text-slate-400">
                        NIDA: 19880412-14101-00002-19 • Phone: +255 754 889 012
                      </div>
                      <div className="text-xs text-emerald-400 font-semibold mt-0.5">
                        Group: Umoja Women Artisans • Kariakoo Branch
                      </div>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-xs text-slate-400">Business Activity</div>
                      <div className="text-sm font-semibold text-white mt-1">Fabric & Batik Wholesaler</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-xs text-slate-400">Monthly Net Profit</div>
                      <div className="text-sm font-semibold text-emerald-400 mt-1">TZS 1,850,000</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-xs text-slate-400">KYC Status</div>
                      <div className="text-sm font-semibold text-emerald-400 mt-1">Verified & Approved</div>
                    </div>
                  </div>
                </div>
              )}

              {activeDemoTab === 'loan' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-xs text-slate-400 font-mono">LOAN #LN-2025-084</div>
                      <div className="text-base font-bold text-white">Biashara Boost (Working Capital)</div>
                      <div className="text-xs text-slate-400">Borrower: Juma Hassan Kibona</div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold self-start sm:self-auto">
                      ACTIVE - IN GOOD STANDING
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-4 gap-4">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-xs text-slate-400">Principal Disbursed</div>
                      <div className="text-sm font-bold text-white mt-1">TZS 5,000,000</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-xs text-slate-400">Interest Rate</div>
                      <div className="text-sm font-bold text-white mt-1">3.5% / month flat</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-xs text-slate-400">Tenure</div>
                      <div className="text-sm font-bold text-white mt-1">6 Months (Bi-weekly)</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-xs text-slate-400">Outstanding Balance</div>
                      <div className="text-sm font-bold text-emerald-400 mt-1">TZS 2,125,000</div>
                    </div>
                  </div>
                </div>
              )}

              {activeDemoTab === 'repayment' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-semibold">
                      <tr>
                        <th className="p-3">Installment #</th>
                        <th className="p-3">Due Date</th>
                        <th className="p-3">Principal</th>
                        <th className="p-3">Interest</th>
                        <th className="p-3">Total Due</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      <tr>
                        <td className="p-3 font-mono font-bold">01</td>
                        <td className="p-3">15 Oct 2025</td>
                        <td className="p-3">TZS 833,333</td>
                        <td className="p-3">TZS 175,000</td>
                        <td className="p-3 font-semibold text-white">TZS 1,008,333</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                            PAID (M-Pesa)
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold">02</td>
                        <td className="p-3">15 Nov 2025</td>
                        <td className="p-3">TZS 833,333</td>
                        <td className="p-3">TZS 175,000</td>
                        <td className="p-3 font-semibold text-white">TZS 1,008,333</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                            PAID (M-Pesa)
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold">03</td>
                        <td className="p-3">15 Dec 2025</td>
                        <td className="p-3">TZS 833,333</td>
                        <td className="p-3">TZS 175,000</td>
                        <td className="p-3 font-semibold text-white">TZS 1,008,333</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                            UPCOMING
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {activeDemoTab === 'staff' && (
                <div className="space-y-4">
                  <div className="text-xs text-slate-400">
                    Protected hierarchical employee directory. Privileged roles created only by authorized Managers.
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="font-bold text-white">Baraka Mkumbo</div>
                      <div className="text-xs text-emerald-400 font-semibold">BRANCH MANAGER</div>
                      <div className="text-xs text-slate-400 mt-1">Kariakoo Branch • ID #EMP-002</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="font-bold text-white">Daudi Kibona</div>
                      <div className="text-xs text-teal-400 font-semibold">FIELD & LOAN OFFICER</div>
                      <div className="text-xs text-slate-400 mt-1">Ilala & Kisutu Ward • ID #EMP-014</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="font-bold text-white">Juma Mussa</div>
                      <div className="text-xs text-amber-400 font-semibold">ACCOUNTANT</div>
                      <div className="text-xs text-slate-400 mt-1">Head Office Treasury • ID #EMP-007</div>
                    </div>
                  </div>
                </div>
              )}

              {activeDemoTab === 'reports' && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-sm font-bold text-white mb-1">Bank of Tanzania (BOT) Statutory Return</div>
                      <div className="text-xs text-slate-400">
                        Monthly Microfinance Category II capital adequacy, liquidity float, and non-performing loans (NPL).
                      </div>
                      <div className="mt-3 text-xs font-semibold text-emerald-400">Status: Reconciled & Ready</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-sm font-bold text-white mb-1">Portfolio at Risk (PAR) Aging Analysis</div>
                      <div className="text-xs text-slate-400">
                        Granular breakdown of loans 1-30 days, 31-60 days, 61-90 days, and 90+ days default reserve.
                      </div>
                      <div className="mt-3 text-xs font-semibold text-cyan-400">ECL Provision: 1.2%</div>
                    </div>
                  </div>
                </div>
              )}

              {activeDemoTab === 'field' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-bold text-white">Mobile Route: Kariakoo Cloth Market</div>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                        GPS Active
                      </span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="p-2 rounded bg-slate-900 flex justify-between">
                        <span>1. Subira Bakari (TZS 50,000)</span>
                        <span className="text-emerald-400 font-semibold">Collected (Cash)</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900 flex justify-between">
                        <span>2. Hamisi Salum (TZS 100,000)</span>
                        <span className="text-emerald-400 font-semibold">Collected (M-Pesa)</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900 flex justify-between">
                        <span>3. Asha Omari (TZS 75,000)</span>
                        <span className="text-amber-400 font-semibold">Scheduled 2:30 PM</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/25">
            <Sparkles className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            {content.cta.title}
          </h2>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto">
            {content.cta.subtitle}
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              id="cta-explore-demo-btn"
              onClick={onExploreDemo}
              className="px-8 py-4 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 shadow-xl shadow-emerald-500/30 flex items-center gap-3 transition transform hover:-translate-y-0.5 text-base"
            >
              <Sparkles className="w-5 h-5 text-slate-950" />
              <span>{content.cta.exploreDemo}</span>
            </button>

            <button
              type="button"
              id="cta-signin-btn"
              onClick={onGoToLogin}
              className="px-8 py-4 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 flex items-center gap-3 transition text-base"
            >
              <span>{content.cta.signIn}</span>
              <ArrowRight className="w-5 h-5 text-emerald-400" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-800 bg-slate-950 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-bold text-slate-300">IMARA Finance</span> — {content.brand.tagline}
          </div>
          <div>© {new Date().getFullYear()} IMARA Finance SaaS Microfinance Platform. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};
