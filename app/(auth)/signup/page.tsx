import Link from "next/link";

export default function SignupPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted">
          Cadastro
        </p>
        <h1 className="text-3xl font-semibold text-ink">
          Cadastro desativado
        </h1>
        <p className="text-sm text-muted">
          O onboarding agora e controlado pelo administrador da plataforma.
        </p>
      </header>
      <p className="text-sm text-muted">
        Ja tem acesso?{" "}
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
