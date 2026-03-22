const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const DISPLAY_DATE_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;

function buildDate(year, month, day) {
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

export function parseFlexibleDate(value) {
  if (value instanceof Date) {
    return buildDate(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  const raw = String(value || "").trim();
  if (!raw) return null;

  const isoMatch = raw.match(ISO_DATE_REGEX);
  if (isoMatch) {
    return buildDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const displayMatch = raw.match(DISPLAY_DATE_REGEX);
  if (displayMatch) {
    return buildDate(Number(displayMatch[3]), Number(displayMatch[2]), Number(displayMatch[1]));
  }

  return null;
}

export function toStorageDate(value) {
  const date = parseFlexibleDate(value);
  if (!date) return "";

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toDisplayDate(value) {
  const date = parseFlexibleDate(value);
  if (!date) return "";

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function isValidDateValue(value) {
  return Boolean(toStorageDate(value));
}

export function attachDateInputFormatting(input) {
  if (!input) return;

  input.addEventListener("blur", () => {
    const formatted = toDisplayDate(input.value);
    if (formatted) input.value = formatted;
  });
}
