import { Loader2 } from "lucide-react";

export default function Loader({ fullPage = false, label = "Loading..." }) {
  const content = (
    <div className="flex items-center gap-2 text-neutral-500">
      <Loader2 size={18} className="animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );

  if (fullPage) {
    return <div className="flex min-h-[50vh] items-center justify-center">{content}</div>;
  }

  return content;
}
