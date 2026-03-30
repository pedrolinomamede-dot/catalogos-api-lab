"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import styles from "./catalog.module.css";

type SearchBarProps = {
  initialQuery?: string;
};

export function SearchBar({ initialQuery = "" }: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);

  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = value.trim();

    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }

    params.set("page", "1");

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <form className={styles.searchBar} onSubmit={handleSubmit}>
      <input
        className={styles.searchInput}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Buscar produtos"
        aria-label="Buscar produtos"
      />
      <button className={styles.searchButton} type="submit">
        Buscar
      </button>
    </form>
  );
}
