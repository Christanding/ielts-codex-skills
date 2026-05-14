export default function IssuesPanel({ issues = [], title = '数据校验问题' }) {
  if (!issues.length) return null;

  return (
    <div className="card mt-6 border-rose-300 bg-rose-50">
      <div className="text-xs uppercase tracking-wider text-rose-700 mb-2">
        {title}（{issues.length}）
      </div>
      <ul className="text-sm space-y-1 max-h-48 overflow-auto">
        {issues.slice(0, 20).map((item, index) => (
          <li key={index} className="flex gap-2">
            <code className="text-rose-700 shrink-0">{item.file}</code>
            <span className="text-rose-900">{item.error}</span>
          </li>
        ))}
      </ul>
      {issues.length > 20 && (
        <div className="text-xs text-rose-700 mt-2">仅显示前 20 条。</div>
      )}
    </div>
  );
}
