export const backupColumns = ["record", "key", "value", "name", "email", "phone", "service", "staff", "starts", "ends", "status", "duration", "price", "weekday", "start", "end", "note"] as const;

export type BackupColumn = (typeof backupColumns)[number];
export type BackupRow = Record<BackupColumn, string>;

export function emptyBackupRow(record: string): BackupRow {
  return { record, key: "", value: "", name: "", email: "", phone: "", service: "", staff: "", starts: "", ends: "", status: "", duration: "", price: "", weekday: "", start: "", end: "", note: "" };
}

export function backupCsv(rows: BackupRow[]) {
  const lines = [backupColumns.join(",")];
  for (const row of rows) lines.push(backupColumns.map((column) => csvCell(row[column])).join(","));
  return `${lines.join("\n")}\n`;
}

export function readBackupCsv(text: string) {
  const table = parseCsv(text.replace(/^\uFEFF/, "").trim());
  const header = table[0]?.map((cell) => cell.trim());
  if (!header || header.join(",") !== backupColumns.join(",")) return { error: "header" as const };
  const rows = table.slice(1).filter((row) => row.some((cell) => cell.trim())).map((row) => {
    const record = emptyBackupRow(row[0]?.trim() ?? "");
    backupColumns.forEach((column, index) => { record[column] = row[index]?.trim() ?? ""; });
    return record;
  });
  return { rows };
}

function csvCell(value: string) {
  if (/[",\n\r]/.test(value)) return `"${value.replaceAll("\"", "\"\"")}"`;
  return value;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === "\"" && text[index + 1] === "\"") { cell += "\""; index += 1; }
      else if (char === "\"") quoted = false;
      else cell += char;
      continue;
    }
    if (char === "\"") quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (char !== "\r") cell += char;
  }
  row.push(cell);
  rows.push(row);
  return rows;
}
