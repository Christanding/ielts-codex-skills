export default function PageHeader({ title, subtitle, hint }) {
  return (
    <div className="mb-6 border-b border-slate-200/80 pb-5">
      <h1 className="display-zh text-[30px] leading-tight tracking-normal text-[#241f1a]">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
      {hint && (
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-500">{hint}</p>
      )}
    </div>
  );
}
