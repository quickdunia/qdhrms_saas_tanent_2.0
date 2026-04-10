import { format } from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: Date | string | null | undefined, pattern = "dd MMM yyyy") {
  if (!value) {
    return "-";
  }

  return format(new Date(value), pattern);
}

export function formatDateTime(
  value: Date | string | null | undefined,
  pattern = "dd MMM yyyy, hh:mm a",
) {
  if (!value) {
    return "-";
  }

  return format(new Date(value), pattern);
}

export function formatCurrency(
  value: number | string | null | undefined,
  currency = "INR",
  locale = "en-IN",
) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function titleCase(input: string) {
  return input
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function getSearchParamValue(
  value: string | string[] | undefined,
  fallback = "",
) {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

export function isFeedbackStatus(value: string | undefined | null) {
  return value === "success" || value === "error";
}

export function resolveFilterStatus(
  feedbackStatus: string | undefined,
  explicitFilter?: string | string[] | undefined,
) {
  const filterValue = getSearchParamValue(explicitFilter);

  if (filterValue) {
    return filterValue;
  }

  return isFeedbackStatus(feedbackStatus) ? "" : feedbackStatus ?? "";
}

export function buildRedirectUrl(
  path: string,
  params: Record<string, string | undefined | null>,
) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value);
    }
  });

  const query = search.toString();

  return query ? `${path}?${query}` : path;
}

export function parseFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export function isTruthyFormValue(value: unknown) {
  return value === "on" || value === "true" || value === true || value === "1";
}

export function parseJsonString<T>(value: string | undefined | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
