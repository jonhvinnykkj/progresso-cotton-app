import logoProgresso from "/logo-progresso.svg";

export function Footer() {
  return (
    <footer className="relative border-t border-border/50 bg-background">
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col items-center gap-6">
          {/* Logo do Grupo Progresso */}
          <img
            src={logoProgresso}
            alt="Grupo Progresso"
            className="h-10 w-auto opacity-40 hover:opacity-70 transition-opacity duration-300"
          />

          {/* Assinatura do desenvolvedor */}
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-sm text-muted-foreground">
              Desenvolvido por{" "}
              <span className="font-medium text-foreground/80">
                João Vinnycius Matos Monteiro Ferreira
              </span>
            </p>
            <p className="text-xs text-muted-foreground/60">
              Big Data no Agronegócio
            </p>
          </div>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground/50">
            © {new Date().getFullYear()} Grupo Progresso. Todos os direitos
            reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
