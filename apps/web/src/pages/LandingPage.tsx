import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, Bot, Gauge, SearchCheck, ShieldCheck, Sparkles, Target } from 'lucide-react';

const features = [
  {
    title: 'SEO Audit',
    job: 'Find the technical and content issues blocking organic growth.',
    icon: SearchCheck,
    bullets: ['Crawl health signals', 'Content and metadata gaps', 'Priority-ranked fixes'],
  },
  {
    title: 'Competitor Intel',
    job: 'See where competitors are winning and what to build next.',
    icon: Target,
    bullets: ['Benchmark visibility', 'Topic and keyword gaps', 'Market-position context'],
  },
  {
    title: 'AI Growth Advisor',
    job: 'Turn raw diagnostics into an executive-ready action plan.',
    icon: Bot,
    bullets: ['Narrative recommendations', 'Impact-focused priorities', 'Clear next actions'],
  },
  {
    title: 'Traffic Insights',
    job: 'Model opportunity across channels while preserving data confidence.',
    icon: Gauge,
    bullets: ['Traffic estimates', 'Engagement patterns', 'Confidence labeling'],
  },
];

export const LandingPage = () => (
  <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
    <section className="relative flex min-h-screen flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(45,212,191,0.22),transparent_28rem),radial-gradient(circle_at_85%_12%,rgba(245,158,11,0.12),transparent_26rem),linear-gradient(135deg,#020617_0%,#07111f_48%,#0f172a_100%)]" />
      <div className="analytics-grid absolute inset-0 opacity-50" />
      <div className="absolute left-1/2 top-24 h-px w-[70vw] -translate-x-1/2 bg-gradient-to-r from-transparent via-teal-300/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-slate-950 to-transparent" />

      <header className="relative z-10 flex items-center justify-between px-5 py-6 sm:px-8 lg:px-12">
        <Link to="/" className="flex items-center gap-3">
          <div className="relative grid size-12 place-items-center overflow-hidden rounded-2xl border border-teal-300/30 bg-slate-950 shadow-lg shadow-teal-500/20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(45,212,191,0.5),transparent_45%),linear-gradient(135deg,rgba(13,148,136,0.55),rgba(15,23,42,0.95))]" />
            <span className="relative font-display text-sm font-extrabold tracking-[-0.08em] text-white">SV</span>
          </div>
          <span className="font-display text-lg font-bold">SEO Vision AI</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-300 md:flex">
          <a href="#features" className="transition hover:text-white">
            Features
          </a>
          <a href="#pricing" className="transition hover:text-white">
            Pricing
          </a>
          <Link to="/login" className="transition hover:text-white">
            Sign in
          </Link>
        </nav>
      </header>

      <div className="relative z-10 flex flex-1 items-center px-5 pb-20 pt-14 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/10 px-4 py-2 text-sm font-semibold text-teal-100"
          >
            <Sparkles className="size-4 text-teal-300" />
            SEO Vision AI
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08 }}
            className="mx-auto max-w-5xl font-display text-5xl font-extrabold leading-[0.98] tracking-[-0.07em] text-balance sm:text-7xl lg:text-8xl"
          >
            AI-powered SEO clarity for teams that need growth, not guesswork.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16 }}
            className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl"
          >
            Audit websites, benchmark competitors, and convert crawl evidence into prioritized actions with clear data
            confidence.
          </motion.p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-teal-400 px-6 text-sm font-bold text-teal-950 shadow-2xl shadow-teal-500/25 transition hover:brightness-110"
            >
              Start Free Audit
              <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-white/14 bg-white/5 px-6 text-sm font-bold text-white backdrop-blur transition hover:border-teal-300/40 hover:bg-teal-300/10"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </section>

    <section id="features" className="relative bg-slate-950 px-5 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-teal-300">Focused modules</p>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-[-0.05em] text-balance sm:text-5xl">
            Each workflow has one job: reveal the next best SEO move.
          </h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.45, delay: index * 0.05 }}
                className="glass rounded-[2rem] p-6"
              >
                <div className="mb-6 grid size-12 place-items-center rounded-2xl bg-teal-300/10 text-teal-300">
                  <Icon className="size-6" />
                </div>
                <h3 className="font-display text-2xl font-bold">{feature.title}</h3>
                <p className="mt-3 text-base leading-7 text-slate-300">{feature.job}</p>
                <ul className="mt-6 space-y-3 text-sm text-slate-300">
                  {feature.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-center gap-3">
                      <span className="size-1.5 rounded-full bg-amber-400" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>

    <section id="pricing" className="relative border-y border-white/10 bg-slate-900/50 px-5 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_0.82fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-amber-300">Pricing preview</p>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-[-0.05em] text-balance sm:text-5xl">
            Start with free audits, then scale into repeatable growth operations.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Free, Starter, Pro, and Enterprise plans map to API usage, saved reporting workflows, and team governance.
          </p>
        </div>
        <div className="glass rounded-[2rem] p-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-5">
            <div>
              <p className="font-display text-2xl font-bold">Free audit</p>
              <p className="mt-1 text-sm text-slate-300">Built for first-pass discovery</p>
            </div>
            <BarChart3 className="size-8 text-teal-300" />
          </div>
          <div className="py-6">
            <span className="font-display text-5xl font-bold">$0</span>
            <span className="text-slate-400"> / start</span>
          </div>
          <Link
            to="/register"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-400 px-6 text-sm font-bold text-teal-950 shadow-xl shadow-teal-500/20 transition hover:brightness-110"
          >
            Launch your first audit
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>

    <footer className="bg-slate-950 px-5 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 font-semibold text-slate-200">
          <ShieldCheck className="size-4 text-teal-300" />
          SEO Vision AI
        </div>
        <p>Copyright {new Date().getFullYear()} SEO Vision AI. Built for sharper organic growth decisions.</p>
      </div>
    </footer>
  </main>
);
