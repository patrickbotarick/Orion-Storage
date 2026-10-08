import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeftRight,
  Boxes,
  ClipboardCheck,
  Map,
  MapPin,
  Menu,
  PackageSearch,
  ScanLine,
  Truck,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { section: "products", to: "/", label: "Produtos", icon: PackageSearch },
  { section: "boxes", to: "/caixas", label: "Caixas", icon: Boxes },
  { section: "locations", to: "/enderecamento", label: "Endereçamento", icon: MapPin },
  { section: "scanner", to: "/scanner", label: "Scanner", icon: ScanLine },
  { section: "movements", to: "/movimentacoes", label: "Movimentações", icon: ArrowLeftRight },
  { section: "receipts", to: "/recebimentos", label: "Recebimentos", icon: Truck },
  { section: "map", to: "/mapa", label: "Mapa", icon: Map },
  { section: "inventories", to: "/inventarios", label: "Inventários", icon: ClipboardCheck },
] as const;

type AppShellProps = {
  section: (typeof NAV_ITEMS)[number]["section"];
  children: ReactNode;
};

export function AppShell({ section, children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 48rem)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  const current = NAV_ITEMS.find((item) => item.section === section)!;
  const SectionIcon = current.icon;

  return (
    <div className="orion-shell min-h-screen bg-bg text-ink">
      <a href="#conteudo-principal" className="orion-skip-link">
        Pular para o conteúdo
      </a>
      <div className="orion-shell-layout md:flex">
        <aside className="orion-desktop-sidebar sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto bg-sidebar text-on-ink md:flex">
          <div className="border-b border-on-ink/15 px-6 py-8">
            <OrionSignature />
          </div>
          <Navigation section={section} />
          <SignatureFooter />
        </aside>
        <div className="min-w-0 flex-1">
          <div className="orion-mobile-header flex items-center justify-between gap-4 bg-sidebar px-4 py-4 text-on-ink md:hidden">
            <OrionSignature />
            <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
              <Dialog.Trigger asChild>
                <button
                  type="button"
                  aria-label="Abrir navegação"
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-control border border-on-ink/30 text-on-ink hover:bg-steel-800"
                >
                  <Menu className="size-5" aria-hidden="true" />
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-graphite-950/60" />
                <Dialog.Content
                  className="fixed inset-y-0 left-0 z-50 flex w-80 max-w-full flex-col overflow-y-auto bg-sidebar text-on-ink shadow-dialog"
                  aria-describedby={undefined}
                >
                  <div className="flex items-center justify-between gap-4 border-b border-on-ink/15 p-6">
                    <Dialog.Title className="min-w-0 break-words text-heading-3 font-semibold">
                      Navegação
                    </Dialog.Title>
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        aria-label="Fechar navegação"
                        className="flex min-h-11 min-w-11 items-center justify-center rounded-control text-on-ink hover:bg-steel-800"
                      >
                        <X className="size-5" aria-hidden="true" />
                      </button>
                    </Dialog.Close>
                  </div>
                  <div className="px-6 pt-6">
                    <OrionSignature />
                  </div>
                  <Navigation section={section} onNavigate={() => setMenuOpen(false)} />
                  <SignatureFooter />
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
          <div className="flex min-h-16 items-center gap-3 border-b border-line bg-surface px-4 py-4 md:px-8">
            <SectionIcon className="size-5 shrink-0 text-accent" aria-hidden="true" />
            <p className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm">
              <span className="text-muted">Operação</span>
              <span className="text-muted" aria-hidden="true">
                /
              </span>
              <span className="min-w-0 break-words font-semibold">{current.label}</span>
            </p>
          </div>
          <main
            id="conteudo-principal"
            data-section={section}
            tabIndex={-1}
            className="orion-page-content min-w-0 px-4 py-6 md:px-8 md:py-8"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

// Temporary typographic signature; replace here when the final logo is approved.
function OrionSignature() {
  return (
    <div className="min-w-0">
      <p className="text-heading-2 font-bold tracking-tight">
        Orion <span className="font-medium">Storage</span>
      </p>
      <p className="mt-1 text-xs text-on-ink-muted">Controle de estoque físico</p>
    </div>
  );
}

function SignatureFooter() {
  return (
    <footer className="mt-auto px-6 pt-8 pb-6">
      <p className="border-t border-on-ink/15 pt-4 text-xs leading-relaxed text-on-ink-muted">
        Controle físico.
        <br />
        Visibilidade total.
      </p>
    </footer>
  );
}

function Navigation({
  section,
  onNavigate,
}: Pick<AppShellProps, "section"> & { onNavigate?: () => void }) {
  return (
    <nav aria-label="Seções" className="flex flex-col gap-2 px-4 py-6">
      <p className="px-3 pb-2 text-xs font-medium tracking-wide text-on-ink-muted uppercase">
        Estoque e operações
      </p>
      {NAV_ITEMS.map(({ section: itemSection, to, label, icon: Icon }) => {
        const selected = section === itemSection;
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            aria-current={selected ? "page" : undefined}
            className={[
              "flex min-h-11 items-center gap-3 rounded-control border-l-4 px-3 py-3 text-sm font-medium transition-colors duration-150",
              selected
                ? "border-on-ink bg-accent text-accent-fg"
                : "border-transparent text-on-ink hover:bg-steel-800",
            ].join(" ")}
          >
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 wrap-anywhere">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
