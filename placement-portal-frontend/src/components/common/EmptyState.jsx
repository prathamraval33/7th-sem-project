import { Inbox } from "lucide-react";

export default function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 px-6 py-12 text-center animate-slide-up">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-neutral-400 mb-1">
        <Icon size={26} />
      </div>
      <h3 className="font-heading text-base font-semibold text-neutral-800">{title}</h3>
      {description && <p className="max-w-sm text-sm text-neutral-500">{description}</p>}
      {action && <div className="mt-3 animate-scale-in">{action}</div>}
    </div>
  );
}
