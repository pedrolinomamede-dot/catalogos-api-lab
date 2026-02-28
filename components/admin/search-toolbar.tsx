"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";

type SearchToolbarProps = {
  placeholder?: string;
  queryKey?: string;
};

export function SearchToolbar({
  placeholder = "Buscar...",
  queryKey = "query",
}: SearchToolbarProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const currentValue = searchParams.get(queryKey) ?? "";
  const [value, setValue] = useState(currentValue);

  useEffect(() => {
    setValue(currentValue);
  }, [currentValue]);

  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const nextValue = value.trim();

      if (nextValue) {
        params.set(queryKey, nextValue);
      } else {
        params.delete(queryKey);
      }

      const nextQuery = params.toString();
      if (nextQuery === searchParams.toString()) {
        return;
      }

      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    }, 300);

    return () => clearTimeout(handle);
  }, [pathname, queryKey, router, searchParams, value]);

  return (
    <div className="flex w-full items-center gap-3">
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="max-w-sm"
      />
    </div>
  );
}

