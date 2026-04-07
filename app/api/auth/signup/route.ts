import { jsonError } from "@/lib/utils/errors";

export async function POST(request: Request) {
  void request;

  return jsonError(
    403,
    "signup_disabled",
    "Cadastro publico desativado. Solicite a criacao do acesso ao administrador da plataforma.",
  );
}
