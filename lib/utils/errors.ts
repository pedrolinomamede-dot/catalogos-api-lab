import { NextResponse } from "next/server";

export type JsonErrorDetails =
  | Record<string, unknown>
  | string[]
  | { [key: string]: string[] | undefined };

export function jsonError(
  status: number,
  code: string,
  message: string,
  details?: JsonErrorDetails,
) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        details,
      },
    },
    { status },
  );
}
