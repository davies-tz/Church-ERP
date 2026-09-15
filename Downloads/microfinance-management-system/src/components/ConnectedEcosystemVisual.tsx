import React, { useState } from 'react';
import {
  Smartphone,
  Building2,
  Store,
  Users,
  CreditCard,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  Layers,
  Sparkles
} from 'lucide-react';
import { Language, formatTZS } from '../lib/i18n';

interface ConnectedEcosystemVisualProps {
  language: Language;
  onExploreDemo: () => void;
}

interface EcosystemElement {
  id: string;
  name: string;
  swName: string;
  role: string;
  swRole: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
  swTag: string;
  tagColor: string;
  detail: string;
  swDetail: string;
  metric: string;
  swMetric: string;
  status: string;
  swStatus: string;
}

export const ConnectedEcosystemVisual: React.FC<ConnectedEcosystemVisualProps> = ({
  language,
  onExploreDemo,
}) => {
  const isEn = language === 'en';
  const [selectedNode, setSelectedNode] = useState<string>('field');

  const nodes: EcosystemElement[] = [
    {
      id: 'field',
      name: 'Field Officer Mobile',
      swName: 'Afisa wa Nyanjani kwa Simu',
      role: 'Market Collections & Biometrics',
      swRole: 'Makusanyo Masokoni na Biometrika',
      icon: Smartphone,
      tag: 'Offline-First',
      swTag: 'Bila Mtandao',
      tagColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      detail: 'Operates in rural markets with indexed local cache and automatic data synchronization.',
      swDetail: 'Hufanya kazi masokoni na vijijini kwa kuhifadhi data kwenye simu na kujisawazisha.',
      metric: '22 Market Collections Today',
      swMetric: 'Makusanyo 22 Sokoni Leo',
      status: 'Auto-Syncing',
      swStatus: 'Inajisawazisha',
    },
    {
      id: 'business',
      name: 'Small Business Owner',
      swName: 'Mjasiriamali wa Biashara Ndogo',
      role: 'Working Capital & Inventory',
      swRole: 'Mtaji wa Kazi na Bidhaa',
      icon: Store,
      tag: 'Biashara Boost',
      swTag: 'Biashara Boost',
      tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      detail: 'Fabric wholesaler at Kariakoo Market. Disbursed loan funded 3x inventory turnover.',
      swDetail: 'Mfanyabiashara wa vitenge Kariakoo. Mkopo umeongeza mauzo mara tatu.',
      metric: 'TZS 5,000,000 Loan',
      swMetric: 'Mkopo wa TZS 5,000,000',
      status: 'On-Time Repaying',
      swStatus: 'Inalipa kwa Wakati',
    },
    {
      id: 'community',
      name: 'Community Savings',
      swName: 'Akiba za Jamii na Vikundi',
      role: 'Solidarity Guarantee Pool',
      swRole: 'Mfuko wa Dhamana za Vikundi',
      icon: Users,
      tag: 'Social Collateral',
      swTag: 'Dhamana ya Jamii',
      tagColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      detail: 'Group of 20 women entrepreneurs providing cross-guarantees and pooled savings reserve.',
      swDetail: 'Kikundi cha wajasiriamali 20 wanawake wakidhaminiana na kuweka akiba za kila wiki.',
      metric: 'TZS 18,400,000 Group Pool',
      swMetric: 'Salio la Kikundi TZS 18,400,000',
      status: 'Compulsory & Voluntary',
      swStatus: 'Amana za Lazima na Hiari',
    },
    {
      id: 'payment',
      name: 'Digital Repayment',
      swName: 'Marejesho ya Kidijitali',
      role: 'Instant Mobile Money Gateway',
      swRole: 'Lango la Pesa za Simu Papo Hapo',
      icon: CreditCard,
      tag: 'M-Pesa & Airtel',
      swTag: 'M-Pesa & Airtel',
      tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      detail: 'Direct C2B push notifications with automatic ledger allocation to fees, interest and principal.',
      swDetail: 'Miamala ya papo hapo ikigawanywa kiotomatiki kwenye ada, riba, na mkopo halisi.',
      metric: 'TZS 1,008,333 Received',
      swMetric: 'TZS 1,008,333 Imepokelewa',
      status: 'Automated Post',
      swStatus: 'Imepostiwa Kiotomatiki',
    },
    {
      id: 'processing',
      name: 'Loan Processing',
      swName: 'Uchakataji wa Mkopo',
      role: 'Underwriting & Appraisal',
      swRole: 'Tathmini na Uidhinishaji',
      icon: Layers,
      tag: 'Automated Engine',
      swTag: 'Mfumo wa Kiotomatiki',
      tagColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      detail: 'Debt-to-income calculated at 31.4%. Verified against credit bureau and KYC records.',
      swDetail: 'Uwiano wa deni na kipato (DTI) ni 31.4%. Umehifadhiwa na kukaguliwa.',
      metric: 'Credit Score: 84/100',
      swMetric: 'Alama ya Mkopo: 84/100',
      status: 'Manager Sanctioned',
      swStatus: 'Imeidhinishwa na Meneja',
    },
    {
      id: 'growth',
      name: 'Financial Growth',
      swName: 'Ukuaji wa Kifedha',
      role: 'Portfolio at Risk & Arrears',
      swRole: 'Udhibiti wa Madeni na PAR',
      icon: TrendingUp,
      tag: 'IFRS 9 & BOT',
      swTag: 'IFRS 9 & BOT',
      tagColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      detail: 'Healthy gross portfolio with PAR > 30 contained under 2.4%, outperforming regulatory caps.',
      swDetail: 'Jalada lenye afya ya kifedha, PAR ya zaidi ya siku 30 ikiwa chini ya 2.4%.',
      metric: '99.8% Recovery Rate',
      swMetric: 'Kiwango cha 99.8% Makusanyo',
      status: 'Sub-3% PAR Target',
      swStatus: 'Chini ya Kikomo cha BOT',
    },
    {
      id: 'branches',
      name: 'Connected Branches',
      swName: 'Matawi Yaliyounganishwa',
      role: 'Regional Operations Hubs',
      swRole: 'Vituo vya Kikanda vya Uendeshaji',
      icon: Building2,
      tag: 'Multi-Branch',
      swTag: 'Matawi Mengi',
      tagColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      detail: 'Kariakoo Central, Arusha City, and Mwanza Lakeside hubs linked to central database.',
      swDetail: 'Matawi ya Kariakoo, Arusha, na Mwanza yameunganishwa kwenye seva kuu.',
      metric: '3 Branches • 28 Staff',
      swMetric: 'Matawi 3 • Wafanyakazi 28',
      status: 'Replicating Live',
      swStatus: 'Yapo Mtandaoni',
    },
  ];

  const activeElement = nodes.find((n) => n.id === selectedNode) || nodes[0];

  return (
    <div className="relative rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-2xl backdrop-blur-xl overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              {isEn ? 'Connected Financial Ecosystem' : 'Mtandao wa Kifedha Uliounganishwa'}
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white mt-1">
            {isEn ? 'Unified Operations Architecture' : 'Muundo Jumuishi wa Uendeshaji'}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-emerald-400" />
            <span>{isEn ? 'PostgreSQL Core Active' : 'PostgreSQL Ipo Mtandaoni'}</span>
          </span>
        </div>
      </div>

      {/* Center Core Banner */}
      <div className="relative z-10 mt-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-950/80 to-teal-950/60 border border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-white">IMARA Secure Cloud Infrastructure</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                TLS 1.3
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {isEn
                ? 'Central double-entry ledger coordinating all mobile and branch endpoints with real-time audit trails.'
                : 'Leja kuu ya hesabu mbili ikiratibu shughuli zote za simu na matawi kwa usalama thabiti.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono shrink-0">
          <div className="text-right">
            <div className="text-emerald-400 font-bold">{formatTZS(1480000000, language)}</div>
            <div className="text-[10px] text-slate-400">{isEn ? 'Portfolio in Cloud' : 'Jalada kwenye Wingu'}</div>
          </div>
        </div>
      </div>

      {/* Ecosystem Node Grid */}
      <div className="relative z-10 mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {nodes.map((node) => {
          const isSelected = selectedNode === node.id;
          const IconComponent = node.icon;

          return (
            <button
              key={node.id}
              type="button"
              id={`node-${node.id}`}
              onClick={() => setSelectedNode(node.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                isSelected
                  ? 'bg-slate-800/90 border-emerald-400/80 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400/50'
                  : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 group-hover:text-emerald-400'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${node.tagColor}`}>
                  {isEn ? node.tag : node.swTag}
                </span>
              </div>

              <div className="font-bold text-xs text-white truncate">
                {isEn ? node.name : node.swName}
              </div>
              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                {isEn ? node.role : node.swRole}
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                <span className="font-semibold text-emerald-400 truncate">
                  {isEn ? node.metric : node.swMetric}
                </span>
                <span className="text-slate-400 text-[9px] shrink-0 font-mono">
                  {isEn ? node.status : node.swStatus}
                </span>
              </div>
            </button>
          );
        })}

        {/* Quick Link Card into Interactive Demo */}
        <div
          onClick={onExploreDemo}
          className="p-3.5 rounded-2xl border border-dashed border-emerald-500/40 bg-emerald-950/20 hover:bg-emerald-950/40 text-left transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="font-bold text-xs text-white group-hover:text-emerald-300 transition-colors">
              {isEn ? 'Explore Interactive Demo' : 'Fungua Jaribio Halisi'}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {isEn ? 'Launch full manager & field workspace.' : 'Ingia kwenye mfumo kamili wa mfano.'}
            </p>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 mt-2">
            <span>{isEn ? 'Open Demo' : 'Fungua Sasa'}</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* Selected Node Detailed Inspector */}
      <div className="relative z-10 mt-6 p-4 rounded-2xl bg-slate-950/90 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {isEn ? 'Operational Node Selected:' : 'Kipengele Kilichochaguliwa:'}
            </span>
            <span className="text-xs font-bold text-emerald-400">
              {isEn ? activeElement.name : activeElement.swName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{isEn ? 'Status:' : 'Hali:'}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{isEn ? activeElement.status : activeElement.swStatus}</span>
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 mt-3 leading-relaxed">
          {isEn ? activeElement.detail : activeElement.swDetail}
        </p>

        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-900 text-xs">
          <div>
            <span className="text-[11px] text-slate-400">{isEn ? 'Key Metric' : 'Kipimo Kikuu'}</span>
            <div className="font-bold text-white mt-0.5">{isEn ? activeElement.metric : activeElement.swMetric}</div>
          </div>
          <div>
            <span className="text-[11px] text-slate-400">{isEn ? 'Operational Mode' : 'Mfumo wa Kazi'}</span>
            <div className="font-bold text-emerald-400 mt-0.5">{isEn ? activeElement.tag : activeElement.swTag}</div>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-[11px] text-slate-400">{isEn ? 'Institutional Role' : 'Wadhifa wa Taasisi'}</span>
            <div className="font-bold text-slate-200 mt-0.5 truncate">{isEn ? activeElement.role : activeElement.swRole}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
