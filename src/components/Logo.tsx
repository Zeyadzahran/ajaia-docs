import { NotePencilIcon } from "@phosphor-icons/react/ssr";

export function Logo() {
  return (
    <span className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-ink-900">
      <NotePencilIcon size={22} weight="duotone" className="text-brand-600" />
      Ajaia Docs
    </span>
  );
}
