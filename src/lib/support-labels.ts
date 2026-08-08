import type { TicketStatus, TicketCategory, TicketPriority } from "@prisma/client";

export const STATUS_LABEL: Record<TicketStatus, string> = {
  NEW: "Novo",
  IN_PROGRESS: "U obradi",
  RESOLVED: "Rešeno",
  CLOSED: "Zatvoreno",
};

export const STATUS_OPTIONS: TicketStatus[] = ["NEW", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  ACCOUNT: "Problem sa nalogom",
  ARTICLE: "Problem sa dodatnim fajlom",
  SEARCH: "Problem sa pretragom",
  DISPLAY: "Problem sa prikazom",
  SYSTEM_ERROR: "Greška u sistemu",
  SUGGESTION: "Predlog",
  OTHER: "Ostalo",
};

export const CATEGORY_OPTIONS: TicketCategory[] = [
  "ACCOUNT",
  "ARTICLE",
  "SEARCH",
  "DISPLAY",
  "SYSTEM_ERROR",
  "SUGGESTION",
  "OTHER",
];

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  LOW: "Nizak",
  NORMAL: "Normalan",
  HIGH: "Visok",
};

export const PRIORITY_OPTIONS: TicketPriority[] = ["LOW", "NORMAL", "HIGH"];
