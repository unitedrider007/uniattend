export function formatPercentage(value: number): string {
  if (value === undefined || value === null || isNaN(value)) return "0.0%";
  return `${value.toFixed(1)}%`;
}

export function getAttendanceCategory(percentage: number): "SAFE" | "WARNING" | "CRITICAL" {
  if (percentage >= 85) return "SAFE";
  if (percentage >= 80) return "WARNING";
  return "CRITICAL";
}

export function formatDate(dateString: string): string {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch {
    return dateString;
  }
}
