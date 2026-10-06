import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Boxes } from "lucide-react";

type AppShellProps = {
  section: "products" | "boxes" | "locations" | "scanner" | "movements";
  children: ReactNode;
};

export function AppShell({ section, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="md:flex">
        <aside className="bg-ink text-on-ink md:min-h-screen md:w-56 md:shrink-0">
          <div className="flex items-center gap-3 px-4 py-5">
            <span className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-fg">
              <Boxes className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-wide">ORION STORAGE</p>
              <p className="text-xs text-on-ink-muted">Estoque físico</p>
            </div>
          </div>
          <nav className="flex flex-col gap-1 px-3 pb-4" aria-label="Seções">
            <ShellLink to="/" current={section === "products"}>
              Produtos
            </ShellLink>
            <ShellLink to="/caixas" current={section === "boxes"}>
              Caixas
            </ShellLink>
            <ShellLink to="/enderecamento" current={section === "locations"}>
              Endereçamento
            </ShellLink>
            <ShellLink to="/scanner" current={section === "scanner"}>
              Scanner
            </ShellLink>
            <ShellLink to="/movimentacoes" current={section === "movements"}>
              Movimentações
            </ShellLink>
          </nav>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}

function ShellLink({
  to,
  current,
  children,
}: {
  to: "/" | "/caixas" | "/enderecamento" | "/scanner" | "/movimentacoes";
  current: boolean;
  children: string;
}) {
  return (
    <Link
      to={to}
      aria-current={current ? "page" : undefined}
      className={`flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors duration-200 ${
        current ? "bg-accent text-accent-fg" : "text-on-ink hover:bg-on-ink/10"
      }`}
    >
      {children}
    </Link>
  );
}
