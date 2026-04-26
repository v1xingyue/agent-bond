import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  Lock, ChevronRight, ArrowRight, Sparkles,
  Shield, BrainCircuit, Database,
  Zap, Droplets, KeyRound, Activity,
  Wallet, Gauge
} from 'lucide-react';

/* ─── Hash Router Helper ───────────────────────────────────── */
export function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const handler = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return hash;
}

/* ─── Animated Counter ─────────────────────────────────────── */
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 1200;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ─── Reusable Components ──────────────────────────────────── */
function GradientText({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`bg-gradient-to-r from-solana-purple via-solana-blue to-solana-green bg-clip-text text-transparent ${className}`}>{children}</span>;
}

function GlassCard({ children, className = '', glow = false }: { children: React.ReactNode; className?: string; glow?: boolean }) {
  return (
    <div className={`relative rounded-2xl border border-subtle bg-subtle-faint backdrop-blur-xl overflow-hidden ${glow ? 'glow-purple' : ''} ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center mb-16">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-xs font-medium text-solana-purple tracking-widest uppercase mb-3">
        {subtitle}
      </motion.div>
      <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-3xl md:text-4xl font-bold text-text-primary">
        {title}
      </motion.h2>
    </div>
  );
}

/* ─── Background Grid ──────────────────────────────────────── */
function GridBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <div className="absolute inset-0" style={{
        backgroundImage: `linear-gradient(rgba(153,69,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(153,69,255,0.03) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-solana-purple/10 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-solana-green/5 rounded-full blur-[150px]" />
    </div>
  );
}

/* ─── Floating Particles ───────────────────────────────────── */
function Particles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
  }));
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-solana-purple/30"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [0, -100, 0], opacity: [0, 0.6, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  LANDING PAGE — 按 PPT 叙事逻辑重构                         */
/* ═══════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const hash = useHashRoute();
  const showDemo = hash === '#/demo';
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

  /* ─── Slide 1: Hero ─────────────────────────────────────── */
  const Hero = () => (
    <motion.section style={{ opacity: heroOpacity, scale: heroScale }} className="relative min-h-screen flex items-center justify-center px-6 pt-20">
      <div className="max-w-5xl mx-auto text-center relative z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-solana-purple/10 border border-solana-purple/20 text-xs font-medium text-solana-purple">
            <Sparkles className="w-3.5 h-3.5" />
            Solana Native · Trust Primitive
          </span>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} className="text-5xl md:text-7xl lg:text-8xl font-bold text-text-primary leading-tight mb-6">
          Agent Bond<br />
          <GradientText>羁绊协议</GradientText>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
          基于 Solana 的 AI Agent 链上身份与信任证明原语<br className="hidden md:block" />
          让每一次交互都成为可验证的信任积累
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="#/demo" className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-solana-purple to-solana-blue text-white font-semibold shadow-lg shadow-solana-purple/25 hover:shadow-solana-purple/40 transition-all">
            进入 Demo
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <a href="#problem" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-subtle text-text-primary font-semibold hover:bg-subtle transition-colors">
            了解机制
          </a>
        </motion.div>
      </div>
    </motion.section>
  );

  /* ─── Slide 2: 信任荒漠 ─────────────────────────────────── */
  const Problem = () => (
    <section id="problem" className="relative py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <SectionTitle title="三方交互的致命诘问：信任荒漠" subtitle="The Trust Desert" />

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl mx-auto text-center mb-16">
          <GlassCard glow className="p-8 md:p-12">
            <div className="text-4xl md:text-5xl font-light text-text-primary mb-6 leading-relaxed">
              "我凭什么相信这个 <span className="text-solana-purple font-semibold">Agent</span> 发起的请求，<br />
              真的代表了用户的<span className="text-solana-green font-semibold">真实意愿</span>？"
            </div>
            <p className="text-sm text-text-secondary">
              用户 ↔ AI Agent ↔ 服务方，三方之间没有任何可验证的信任锚点
            </p>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );

  /* ─── Slide 3: 旧迷信死胡同 ─────────────────────────────── */
  const Comparison = () => (
    <section className="relative py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <SectionTitle title="抛弃旧迷信：为什么现存的信任代理机制走向死胡同？" subtitle="Why Current Mechanisms Fail" />

        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Table Header */}
            <div className="grid grid-cols-4 gap-0 mb-2">
              <div className="p-4" />
              <div className="p-4 text-center">
                <div className="w-10 h-10 mx-auto rounded-xl bg-red-500/10 flex items-center justify-center mb-2">
                  <Lock className="w-5 h-5 text-red-400" />
                </div>
                <div className="text-sm font-semibold text-text-primary">API Key 授权</div>
                <div className="text-xs text-text-muted">静态凭证</div>
              </div>
              <div className="p-4 text-center">
                <div className="w-10 h-10 mx-auto rounded-xl bg-yellow-500/10 flex items-center justify-center mb-2">
                  <BrainCircuit className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="text-sm font-semibold text-text-primary">AI 上下文确认</div>
                <div className="text-xs text-text-muted">记忆依赖</div>
              </div>
              <div className="p-4 text-center rounded-t-xl bg-solana-green/5 border border-solana-green/20 border-b-0">
                <div className="w-10 h-10 mx-auto rounded-xl bg-solana-green/20 flex items-center justify-center mb-2">
                  <Shield className="w-5 h-5 text-solana-green" />
                </div>
                <div className="text-sm font-semibold text-solana-green">Agent Bond</div>
                <div className="text-xs text-solana-green/70">链上交易记录</div>
              </div>
            </div>

            {/* Row 1 */}
            <div className="grid grid-cols-4 gap-0 border-t border-subtle-faint">
              <div className="p-4 flex items-center text-sm font-medium text-text-muted">授权维度</div>
              <div className="p-4 text-center text-sm text-text-secondary">静态、一次性授权</div>
              <div className="p-4 text-center text-sm text-text-secondary">模糊、不可量化</div>
              <div className="p-4 text-center text-sm text-solana-green font-medium bg-solana-green/5 border-x border-solana-green/20">动态、基于真实投入</div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-4 gap-0 border-t border-subtle-faint">
              <div className="p-4 flex items-center text-sm font-medium text-text-muted">防篡改性</div>
              <div className="p-4 text-center text-sm text-text-secondary">极易泄露与滥用</div>
              <div className="p-4 text-center text-sm text-text-secondary">存在幻觉与操纵风险</div>
              <div className="p-4 text-center text-sm text-solana-green font-medium bg-solana-green/5 border-x border-solana-green/20">链上不可篡改</div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-4 gap-0 border-t border-subtle-faint">
              <div className="p-4 flex items-center text-sm font-medium text-text-muted">实时意愿</div>
              <div className="p-4 text-center text-sm text-text-secondary">无法反映状态变更</div>
              <div className="p-4 text-center text-sm text-text-secondary">缺乏硬性执行准则</div>
              <div className="p-4 text-center text-sm text-solana-green font-medium bg-solana-green/5 border-x border-solana-green/20 rounded-b-xl border-b">实时状态映射</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  /* ─── Slide 4: 信任的尽头是成本 ─────────────────────────── */
  const CoreMechanism = () => (
    <section className="relative py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <SectionTitle title="信任的尽头是成本：从「记忆」转向「交易记录」" subtitle="From Memory to Transaction" />

        <div className="grid md:grid-cols-4 gap-4 mb-12">
          {[
            { icon: Droplets, title: '高频微支付', desc: 'x402', color: '#9945FF', bg: 'bg-solana-purple/10' },
            { icon: Zap, title: '利益一致性', desc: 'Aligned Incentives', color: '#00C2FF', bg: 'bg-solana-blue/10' },
            { icon: Activity, title: '羁绊加深', desc: 'Bond Deepening', color: '#A855F7', bg: 'bg-purple-500/10' },
            { icon: KeyRound, title: '绝对代表权', desc: 'Absolute Proxy', color: '#14F195', bg: 'bg-solana-green/10' },
          ].map((item, i) => (
            <motion.div key={item.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <GlassCard className="p-6 h-full text-center group hover:border-subtle transition-all">
                <div className={`w-14 h-14 mx-auto rounded-2xl ${item.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-6 h-6" style={{ color: item.color }} />
                </div>
                <h4 className="font-semibold text-text-primary mb-1">{item.title}</h4>
                <p className="text-xs text-text-muted">{item.desc}</p>
                {i < 3 && (
                  <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 text-text-muted/30">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                )}
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <GlassCard glow className="p-8 text-center max-w-3xl mx-auto">
            <div className="text-lg md:text-xl text-text-primary leading-relaxed">
              <span className="text-solana-purple font-semibold">核心假设</span>：用户在 Agent 层面投入的<span className="text-solana-green font-semibold">真金白银</span>，<br className="hidden md:block" />
              是其代表权最真实的背书。
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );

  /* ─── Slide 5: 三位一体架构 ─────────────────────────────── */
  const Architecture = () => (
    <section className="relative py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <SectionTitle title="三位一体：基于 Solana 的信任引擎架构" subtitle="Trust Engine Architecture" />

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Wallet,
              title: '付费授权 (x402)',
              desc: '每一次授权 = 一次高频微额链上支付',
              detail: 'Solana 单笔交易费 \u003c $0.001，让按次付费成为现实',
              color: '#9945FF',
            },
            {
              icon: Database,
              title: '羁绊状态 (PDA)',
              desc: '实时记录交互维度与沉淀资金',
              detail: 'BondState: owner · agent · interaction_count · cumulative_amount',
              color: '#00C2FF',
            },
            {
              icon: Gauge,
              title: '极速查询',
              desc: '秒级确认信任等级',
              detail: '链上状态实时可读，Agent 服务方可即时验证用户羁绊等级',
              color: '#14F195',
            },
          ].map((item, i) => (
            <motion.div key={item.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}>
              <GlassCard className="p-8 h-full text-center group hover:border-subtle transition-all">
                <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: `${item.color}15` }}>
                  <item.icon className="w-7 h-7" style={{ color: item.color }} />
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-3">{item.title}</h3>
                <p className="text-sm text-text-secondary mb-4">{item.desc}</p>
                <p className="text-xs text-text-muted leading-relaxed">{item.detail}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );

  /* ─── Slide 6: 状态流转机制 ─────────────────────────────── */
  const StateFlow = () => (
    <section className="relative py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <SectionTitle title="状态流转机制：花费如何被量化为信任？" subtitle="State Flow Mechanism" />

        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <GlassCard glow className="p-6 font-mono text-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-text-muted">lib.rs</span>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>
              </div>
              <pre className="text-text-secondary overflow-x-auto">
{`struct BondState {
    owner: Pubkey,
    agent: Pubkey,
    interaction_count: u64,
    cumulative_amount: u64,
}`}
              </pre>
              <div className="mt-4 pt-4 border-t border-subtle-faint text-xs text-text-muted">
                PDA 不是静态存储，而是一个动态的、由高频微支付驱动的"信任蓄水池"。
              </div>
            </GlassCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-4">
            {[
              { step: '01', title: '用户发起 Skill 调用', desc: '选择 Agent，确认支付金额' },
              { step: '02', title: 'x402 链上微支付', desc: 'SOL 实时划转至协议 Treasury' },
              { step: '03', title: 'PDA 状态更新', desc: 'interaction_count +1, cumulative_amount += cost' },
              { step: '04', title: '羁绊等级重算', desc: '实时映射到新的信任阈值与权限' },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-solana-purple/10 flex items-center justify-center shrink-0 text-xs font-bold text-solana-purple">
                  {item.step}
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary text-sm">{item.title}</h4>
                  <p className="text-xs text-text-secondary">{item.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );

  /* ─── Slide 7: Agent 进阶生命周期 ─────────────────────────── */
  const LifeCycle = () => {
    const phases = [
      { name: '陌生', desc: '用户购买 Agent。无法执行敏感操作。', color: '#94A3B8', width: '25%' },
      { name: '磨合', desc: '数据抓取、市场分析。x402 产生高频微支付，羁绊值上升。', color: '#A855F7', width: '40%' },
      { name: '信任', desc: '信任达成。可代表用户执行核心决策。', color: '#14F195', width: '35%' },
    ];

    return (
      <section className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionTitle title="Agent 进阶生命周期：量变引起质变" subtitle="Lifecycle: Quantity to Quality" />

          <div className="relative">
            {/* Curve visualization */}
            <div className="hidden md:block relative h-64 mb-8">
              <svg viewBox="0 0 800 200" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="curveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#94A3B8" stopOpacity="0.3" />
                    <stop offset="40%" stopColor="#A855F7" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#14F195" stopOpacity="0.5" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 180 Q 100 170 200 150 Q 300 120 400 90 Q 500 50 600 30 Q 700 10 800 5"
                  fill="none"
                  stroke="url(#curveGrad)"
                  strokeWidth="3"
                />
                {/* Dashed threshold line */}
                <line x1="0" y1="60" x2="800" y2="60" stroke="white" strokeOpacity="0.1" strokeDasharray="6 6" />
                <text x="400" y="50" fill="rgba(255,255,255,0.3)" fontSize="12" textAnchor="middle">敏感操作解锁阈值</text>
              </svg>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {phases.map((phase, i) => (
                <motion.div key={phase.name} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}>
                  <GlassCard className="p-6 h-full group hover:border-subtle transition-all">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: phase.color }} />
                      <span className="text-sm font-semibold" style={{ color: phase.color }}>阶段 {['一', '二', '三'][i]}：{phase.name}</span>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">{phase.desc}</p>
                    <div className="mt-4 h-1 rounded-full bg-subtle overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: phase.width }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.2 + 0.3, duration: 1 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: phase.color }}
                      />
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  };

  /* ─── Slide 8: 终局愿景 ─────────────────────────────────── */
  const Vision = () => (
    <section className="relative py-24 px-6">
      <div className="max-w-5xl mx-auto text-center">
        <SectionTitle title="终局愿景：不可篡改的链上数字分身" subtitle="The Ultimate Vision" />

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12">
          <GlassCard glow className="p-10 md:p-16 max-w-4xl mx-auto">
            <div className="text-2xl md:text-4xl font-light text-text-primary leading-relaxed mb-8">
              让 AI 不再只是工具，<br />
              而是你在数字空间中<br />
              <GradientText className="font-semibold">最忠诚、可被证明的数字分身</GradientText>
            </div>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-solana-purple to-transparent mx-auto mb-8" />
            <p className="text-sm md:text-base text-text-secondary leading-relaxed max-w-2xl mx-auto">
              羁绊协议将物理世界的真实信用，通过高频微交易不可篡改地锚定在数字空间。<br />
              <span className="text-solana-purple font-medium">这不是代码的胜利，这是确权范式的转移。</span>
            </p>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
          <a href="#/demo" className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-solana-purple to-solana-blue text-white font-semibold shadow-lg shadow-solana-purple/25 hover:shadow-solana-purple/40 transition-all">
            启动 Demo
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </motion.div>
      </div>
    </section>
  );

  /* ─── Stats Bar ─────────────────────────────────────────── */
  const Stats = () => (
    <section className="relative py-12 px-6 border-y border-subtle-faint">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: '合约大小', value: 126, suffix: 'KB' },
            { label: '羁绊等级', value: 6, suffix: '级' },
            { label: '单次 Gas', value: 0.001, suffix: ' SOL', isDecimal: true },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl md:text-3xl font-bold text-text-primary">
                {stat.isDecimal ? stat.value : <Counter target={stat.value} />}
                <span className="text-solana-purple">{stat.suffix}</span>
              </div>
              <div className="text-xs text-text-muted mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  /* ─── Footer ─────────────────────────────────────────────── */
  const Footer = () => (
    <footer className="relative py-12 px-6 border-t border-subtle-faint">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-solana-green animate-pulse" />
          <span className="text-sm font-medium text-text-primary">Agent Bond Protocol</span>
        </div>
        <div className="flex items-center gap-6 text-xs text-text-muted">
          <span>Program: <span className="font-mono text-text-secondary">FcwjKm...QHGN</span></span>
          <span>Network: <span className="text-solana-green">Devnet</span></span>
        </div>
        <div className="text-xs text-text-muted">
          © 2025 Agent Bond Protocol
        </div>
      </div>
    </footer>
  );

  /* ─── Render ─────────────────────────────────────────────── */
  if (showDemo) return null;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-sans relative overflow-x-hidden">
      <GridBackground />
      <Particles />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 border-b border-subtle-faint bg-bg-secondary/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-solana-green animate-pulse" />
            <span className="text-sm font-medium text-text-primary">Agent Bond Protocol</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#problem" className="hidden md:block text-xs text-text-muted hover:text-text-primary transition-colors">信任荒漠</a>
            <a href="#architecture" className="hidden md:block text-xs text-text-muted hover:text-text-primary transition-colors">架构</a>
            <a href="#/demo" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-gradient-to-r from-solana-purple to-solana-blue hover:opacity-90 transition-opacity">
              Launch Demo
              <ChevronRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </nav>

      <Hero />
      <Stats />
      <Problem />
      <Comparison />
      <CoreMechanism />
      <Architecture />
      <StateFlow />
      <LifeCycle />
      <Vision />
      <Footer />
    </div>
  );
}
