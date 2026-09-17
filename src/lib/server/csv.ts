export function formatCsv(rows: (string | number | boolean | null | undefined)[][]): string {
  const csv = rows
    .map((row) =>
      row
        .map((val) => {
          if (val === null || val === undefined) return "";
          const str = String(val);
          // Quote strings containing quotes, commas, or newlines
          if (str.includes('"') || str.includes(",") || str.includes("\n")) {
            return `"${str.replaceAll('"', '""')}"`;
          }
          return str;
        })
        .join(",")
    )
    .join("\n");

  // Prefix with UTF-8 BOM to ensure Excel opens Bengali text properly
  return "\uFEFF" + csv;
}
