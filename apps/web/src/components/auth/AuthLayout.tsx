import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, LineChart, ShieldCheck, Sparkles } from 'lucide-react';

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export const AuthLayout = ({ title, subtitle, children }: AuthLayoutProps) => (
  <main className="mesh-bg grid min-h-screen grid-cols-1 overflow-hidden text-[rgb(var(--foreground))] lg:grid-cols-[1.08fr_0.92fr]">
    <section className="relative hidden min-h-screen border-r border-white/10 px-10 py-8 lg:flex lg:flex-col">
      <Link to="/" className="flex items-center gap-3">
        <div className="relative grid size-12 place-items-center overflow-hidden rounded-2xl border border-teal-300/30 bg-slate-950 shadow-lg shadow-teal-500/20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(45,212,191,0.45),transparent_45%),linear-gradient(135deg,rgba(13,148,136,0.55),rgba(15,23,42,0.95))]" />
          <span className="relative font-display text-sm font-extrabold tracking-[-0.08em] text-white">SV</span>
        </div>
        <div>
          <p className="font-display text-lg font-bold">SEO Vision AI</p>
          <p className="text-xs font-medium text-[rgb(var(--muted-foreground))]">Audit smarter. Grow faster.</p>
        </div>
      </Link>

      <div className="relative z-10 mt-auto max-w-2xl pb-12">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-400/10 px-3 py-1 text-xs font-semibold text-teal-200">
          <Sparkles className="size-3.5" />
          Premium SEO intelligence workspace
        </div>
        <h1 className="max-w-xl font-display text-5xl font-bold leading-tight text-balance">
          Turn every crawl into a clear growth system.
        </h1>
        <p className="mt-5 max-w-lg text-lg leading-8 text-slate-300">
          Technical signals, market context, and AI guidance come together in one operator-grade cockpit.
        </p>
        <div className="mt-8 grid max-w-xl grid-cols-2 gap-4">
          <div className="glass-subtle rounded-3xl p-5">
            <LineChart className="mb-4 size-6 text-teal-300" />
            <p className="font-display text-xl font-semibold">Signal-first</p>
            <p className="mt-2 text-sm text-slate-300">Verified crawl data stays separated from estimates.</p>
          </div>
          <div className="glass-subtle rounded-3xl p-5">
            <ShieldCheck className="mb-4 size-6 text-amber-300" />
            <p className="font-display text-xl font-semibold">Decision-ready</p>
            <p className="mt-2 text-sm text-slate-300">Prioritized fixes map directly to business impact.</p>
          </div>
        </div>
      </div>
      <div className="analytics-grid pointer-events-none absolute inset-0 opacity-70" />
    </section>

    <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-3 lg:hidden">
          <div className="grid size-11 place-items-center rounded-2xl bg-slate-950 text-sm font-extrabold text-white shadow-lg shadow-teal-500/20">
            SV
          </div>
          <span className="font-display text-lg font-bold">SEO Vision AI</span>
        </Link>
        <div className="glass rounded-[2rem] p-6 shadow-2xl sm:p-8">
          <div className="mb-8">
            <Link
              to="/"
              className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-[rgb(var(--primary))]"
            >
              Back to home
              <ArrowUpRight className="size-4" />
            </Link>
            <h1 className="font-display text-3xl font-bold">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted-foreground))]">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </section>
  </main>
);
