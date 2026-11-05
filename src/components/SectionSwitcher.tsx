import { BriefcaseBusiness, KeyRound, ShoppingBasket, Users, Wallet } from "lucide-react";

export type AppSection = "clients" | "passwords" | "finances" | "shopping" | "autonomo";

interface SectionSwitcherProps {
  activeSection: AppSection;
  onChange: (section: AppSection) => void;
}

const options = [
  { id: "clients" as const, label: "Clientes", icon: Users },
  { id: "passwords" as const, label: "Contraseñas", icon: KeyRound },
  { id: "finances" as const, label: "Gastos", icon: Wallet },
  { id: "shopping" as const, label: "Súper", icon: ShoppingBasket },
  { id: "autonomo" as const, label: "Autónomo", icon: BriefcaseBusiness },
];

const activeColors: Record<AppSection, string> = {
  clients: "bg-[#c9f568] shadow-[0_7px_18px_rgba(201,245,104,0.3)]",
  passwords: "bg-[var(--ink)] shadow-[0_7px_18px_rgba(23,25,23,0.22)]",
  finances: "bg-[#ffb26b] shadow-[0_7px_18px_rgba(255,140,50,0.28)]",
  shopping: "bg-[#a7e8bd] shadow-[0_7px_18px_rgba(90,190,130,0.28)]",
  autonomo: "bg-[#8fd3ff] shadow-[0_7px_18px_rgba(80,170,230,0.28)]",
};

const activeText: Record<AppSection, string> = {
  clients: "text-[#171917]",
  passwords: "text-[var(--paper)]",
  finances: "text-[#171917]",
  shopping: "text-[#171917]",
  autonomo: "text-[#171917]",
};

const activePositions: Record<AppSection, string> = {
  clients: "translate-x-0",
  passwords: "translate-x-full",
  finances: "translate-x-[200%]",
  shopping: "translate-x-[300%]",
  autonomo: "translate-x-[400%]",
};

export function SectionSwitcher({ activeSection, onChange }: SectionSwitcherProps) {
  return (
    <nav
      aria-label="Secciones del panel"
      className="relative mx-auto grid min-h-[58px] w-full max-w-[760px] grid-cols-5 rounded-[24px] border border-[var(--line)] bg-[var(--surface-muted)]/85 p-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.85),0_10px_28px_rgba(23,25,23,0.08)] backdrop-blur-xl sm:rounded-full"
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-1.5 left-1.5 w-[calc((100%-12px)/5)] rounded-[18px] transition-[transform,background-color,box-shadow] duration-300 ease-out sm:rounded-full ${activeColors[activeSection]} ${activePositions[activeSection]}`}
      />

      {options.map(({ id, label, icon: Icon }) => {
        const isActive = activeSection === id;

        return (
          <button
            key={id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(id)}
            className={`relative z-10 flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[18px] px-0.5 text-[10.5px] leading-tight sm:min-h-11 sm:flex-row sm:gap-2 font-extrabold sm:px-3 sm:text-sm transition-colors duration-300 active:scale-[0.98] sm:rounded-full ${
              isActive ? activeText[id] : "text-[var(--ink)]"
            }`}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.2} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
