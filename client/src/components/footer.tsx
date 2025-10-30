import logoProgresso from "/logo-progresso.svg";

export function Footer() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex flex-col items-center gap-4">
          {/* Logo do Grupo Progresso */}
          <img 
            src={logoProgresso} 
            alt="Grupo Progresso" 
            className="h-12 w-auto opacity-60 hover:opacity-100 transition-opacity"
          />
          
          {/* Assinatura do desenvolvedor */}
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-sm text-muted-foreground">
              Desenvolvido por <span className="font-semibold text-foreground">João Vinnycius Matos Monteiro Ferreira</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Big Data no Agronegócio
            </p>
          </div>
          
          {/* Copyright */}
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Grupo Progresso. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
