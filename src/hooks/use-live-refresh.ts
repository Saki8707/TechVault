"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const DEFAULT_INTERVAL_MS = 20000;

// Ne osvezavaj dok korisnik aktivno nesto unosi - da ne izgubi otkucano/otvoren editor.
const PAUSE_ON_PATH = [/\/novi$/, /\/izmeni$/];

/**
 * Periodicno poziva router.refresh() da ponovo izvrsi server komponente na trenutnoj
 * ruti (bez punog reload-a i bez gubitka stanja klijentskih komponenti) - koristi se
 * umesto WebSocket-a za "zivo" osvezavanje lista (kategorije, clanci, pretraga, tagovi).
 * Pauzira se kad tab nije aktivan ili kad je korisnik na /novi ili /izmeni ruti.
 */
export function useLiveRefresh(intervalMs = DEFAULT_INTERVAL_MS) {
  const router = useRouter();
  const pathname = usePathname();
  const pausedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = PAUSE_ON_PATH.some((re) => re.test(pathname));
  }, [pathname]);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return;
      if (pausedRef.current) return;
      router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, router]);
}
