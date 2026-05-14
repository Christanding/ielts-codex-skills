import { Inbox } from 'lucide-react';

export default function Empty({ children }) {
  return (
    <div className="card text-center text-slate-400 py-12">
      <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-white text-slate-400">
        <Inbox size={18} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <div className="text-sm">{children || '还没有数据。跑对应 skill 写一些数据再回来。'}</div>
    </div>
  );
}
