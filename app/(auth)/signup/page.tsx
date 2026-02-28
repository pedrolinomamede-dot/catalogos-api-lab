import Link from "next/link";
import { Suspense } from "react";

import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted">
          Cadastro
        </p>
        <h1 className="text-3xl font-semibold text-ink">
          Criar conta no painel
        </h1>
        <p className="text-sm text-muted">
          Informe os dados da sua distribuidora para começar.
        </p>
      </header>
      <Suspense fallback={<div>Carregando...</div>}>
        <SignupForm />
      </Suspense>
      <p className="text-sm text-muted">
        Ja tem conta?{" "}
        <Link
          className="font-medium text-accent-strong hover:underline"
          href="/login"
        >
          Entrar
        </Link>
      </p>
    </section>
  );
}
