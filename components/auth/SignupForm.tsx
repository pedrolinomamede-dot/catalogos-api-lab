"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const slugRegex = /^[a-z0-9-]+$/i;

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [brandName, setBrandName] = useState("");
  const [brandSlug, setBrandSlug] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSlugError(null);
    setPasswordError(null);

    if (!slugRegex.test(brandSlug)) {
      setSlugError("Slug invalido. Use letras, numeros e hifen.");
      return;
    }

    if (password.length < 8) {
      setPasswordError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const payload: {
        brandName: string;
        brandSlug: string;
        email: string;
        password: string;
        name?: string;
      } = {
        brandName,
        brandSlug,
        email,
        password,
      };

      if (name.trim()) {
        payload.name = name.trim();
      }

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = "Nao foi possivel criar conta.";
        try {
          const data = await response.json();
          if (typeof data?.message === "string") {
            message = data.message;
          } else if (typeof data?.error === "string") {
            message = data.error;
          }
        } catch {
          const text = await response.text();
          if (text) {
            message = text;
          }
        }
        setError(message);
        return;
      }

      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.ok) {
        router.replace(callbackUrl);
        return;
      }

      setError("Conta criada, mas falha no login automatico. Tente logar.");
    } catch {
      setError("Nao foi possivel criar conta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="brandName" className="text-sm font-medium text-ink">
          Nome da marca
        </label>
        <Input
          id="brandName"
          name="brandName"
          type="text"
          value={brandName}
          onChange={(event) => setBrandName(event.target.value)}
          placeholder="Ipe Distribuidora"
          required
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="brandSlug" className="text-sm font-medium text-ink">
          Slug da marca
        </label>
        <Input
          id="brandSlug"
          name="brandSlug"
          type="text"
          value={brandSlug}
          onChange={(event) => setBrandSlug(event.target.value)}
          placeholder="ipe-distribuidora"
          required
        />
        {slugError ? (
          <p className="text-xs text-accent-strong">{slugError}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium text-ink">
          Nome (opcional)
        </label>
        <Input
          id="name"
          name="name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Admin"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-ink">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@exemplo.com"
          required
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-ink">
          Senha
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Minimo 8 caracteres"
          required
        />
        {passwordError ? (
          <p className="text-xs text-accent-strong">{passwordError}</p>
        ) : null}
      </div>
      {error ? <p className="text-sm text-accent-strong">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Criando conta..." : "Criar conta"}
      </Button>
    </form>
  );
}
