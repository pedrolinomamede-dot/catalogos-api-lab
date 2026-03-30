import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted">
          Acesso
        </p>
        <h1 className="text-3xl font-semibold text-ink">Entrar no painel</h1>
        <p className="text-sm text-muted">
          Use seu email e senha para acessar o dashboard.
        </p>
      </header>
      <Suspense fallback={<div>Carregando...</div>}>
        <LoginForm />
      </Suspense>
      <p className="text-sm text-muted">
        Ainda nao tem conta?{" "}
        <Link
          className="font-medium text-accent-strong hover:underline"
          href="/signup"
        >
          Criar conta
        </Link>
      </p>
    </section>
  );
}
