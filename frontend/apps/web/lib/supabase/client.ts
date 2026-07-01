// A autenticação do painel deixou de usar o Supabase Auth no browser.
// Login/logout agora passam pelas rotas /api/auth/* (ver lib/auth.ts), que
// falam com a Neon server-side. Este arquivo permanece apenas como marcador;
// nada deve importá-lo.
export {}
