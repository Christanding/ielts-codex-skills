import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import {
  BookOpen,
  Headphones,
  Home,
  Mic,
  PenLine,
  SpellCheck,
} from 'lucide-react';

const NAV = [
  { to: '/',          label: '首页',    Icon: Home },
  { to: '/writing',   label: '写作',    Icon: PenLine },
  { to: '/reading',   label: '阅读',    Icon: BookOpen },
  { to: '/listening', label: '听力',    Icon: Headphones },
  { to: '/vocab',     label: '词汇',    Icon: SpellCheck },
  { to: '/speaking',  label: '口语',    Icon: Mic },
];

export default function Layout({ children }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 z-30 bg-[#181511] p-4 text-white lg:min-h-screen lg:p-6">
        <div className="mb-4 flex items-end justify-between gap-4 lg:mb-7 lg:block">
          <div className="display-en text-[11px] uppercase tracking-[0.18em] text-slate-400">IELTS</div>
          <div className="display-en mt-1 text-[22px] font-semibold leading-tight">Study Desk <span className="font-sans text-sm font-normal text-slate-400">V1.0</span></div>
          <div className="mt-2 hidden h-px w-12 bg-[#b8663a] lg:block" />
        </div>
        <nav className="nav-scroll -mx-1 flex gap-2 overflow-x-auto pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0" aria-label="主导航">
          {NAV.map((item) => {
            const Icon = item.Icon;
            return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'group flex shrink-0 items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8663a]',
                  isActive
                    ? 'bg-white/10 text-white shadow-[inset_0_-3px_0_#b8663a] lg:shadow-[inset_3px_0_0_#b8663a]'
                    : 'text-slate-300 hover:bg-white/8 hover:text-white'
                )
              }
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-current/15 bg-white/5 transition-colors group-hover:bg-white/10">
                <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
              </span>
              <span className="whitespace-nowrap">{item.label}</span>
            </NavLink>
            );
          })}
        </nav>
      </aside>
      <main className="max-w-[1440px] p-4 md:p-6 lg:p-8">{children}</main>
    </div>
  );
}
