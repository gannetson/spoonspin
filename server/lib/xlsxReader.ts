/**
 * Minimal .xlsx reader — enough to pull rows out of a worksheet, no dependency.
 *
 * Importers for hand-maintained spreadsheets need to run wherever the app runs,
 * including production, so this avoids adding a parser package for what is a
 * zip of XML. It reads the central directory, inflates the members it needs,
 * and resolves both shared and inline strings.
 *
 * It deliberately does not handle formulas, styles, dates or ZIP64 — a
 * curated listings sheet is text, and anything richer belongs in a real
 * dependency rather than half-supported here.
 */

import { inflateRawSync } from "node:zlib";

type ZipEntry = { name: string; offset: number; method: number; size: number };

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;

function findEndOfCentralDirectory(buffer: Buffer): number {
  // The EOCD sits at the end, after a comment of up to 64KB.
  const earliest = Math.max(0, buffer.length - 0x10000 - 22);
  for (let i = buffer.length - 22; i >= earliest; i -= 1) {
    if (buffer.readUInt32LE(i) === EOCD_SIGNATURE) return i;
  }
  throw new Error("Not a zip file (no end-of-central-directory record).");
}

function readEntries(buffer: Buffer): Map<string, ZipEntry> {
  const eocd = findEndOfCentralDirectory(buffer);
  const count = buffer.readUInt16LE(eocd + 10);
  let pointer = buffer.readUInt32LE(eocd + 16);
  const entries = new Map<string, ZipEntry>();

  for (let i = 0; i < count; i += 1) {
    if (buffer.readUInt32LE(pointer) !== CENTRAL_SIGNATURE) break;
    const method = buffer.readUInt16LE(pointer + 10);
    const compressedSize = buffer.readUInt32LE(pointer + 20);
    const nameLength = buffer.readUInt16LE(pointer + 28);
    const extraLength = buffer.readUInt16LE(pointer + 30);
    const commentLength = buffer.readUInt16LE(pointer + 32);
    const localOffset = buffer.readUInt32LE(pointer + 42);
    const name = buffer.toString("utf8", pointer + 46, pointer + 46 + nameLength);
    entries.set(name, { name, offset: localOffset, method, size: compressedSize });
    pointer += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function readFile(buffer: Buffer, entry: ZipEntry): string {
  // Name and extra lengths in the local header can differ from the central one.
  const nameLength = buffer.readUInt16LE(entry.offset + 26);
  const extraLength = buffer.readUInt16LE(entry.offset + 28);
  const start = entry.offset + 30 + nameLength + extraLength;
  const raw = buffer.subarray(start, start + entry.size);
  if (entry.method === 0) return raw.toString("utf8");
  if (entry.method === 8) return inflateRawSync(raw).toString("utf8");
  throw new Error(`Unsupported zip compression method ${entry.method}`);
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 16)),
    )
    .replace(/&amp;/g, "&");
}

/**
 * Build a regex for an element, tolerating a namespace prefix.
 *
 * Excel writes `<sheet>`, but files produced by other tools write `<x:sheet>`
 * against the same schema — this sheet is one of them, and assuming the plain
 * form silently yields an empty workbook.
 */
function tag(name: string, body: string): RegExp {
  return new RegExp(
    `<(?:\\w+:)?${name}(?=[\\s/>])([^>]*)(?:/>|>(${body})</(?:\\w+:)?${name}>)`,
    "g",
  );
}

function elements(xml: string, name: string): { attrs: string; body: string }[] {
  const out: { attrs: string; body: string }[] = [];
  for (const match of xml.matchAll(tag(name, "[\\s\\S]*?"))) {
    out.push({ attrs: match[1] ?? "", body: match[2] ?? "" });
  }
  return out;
}

/** Concatenate every <t> inside a fragment, which is how runs are split. */
function textOf(fragment: string): string {
  return elements(fragment, "t")
    .map((element) => decodeXmlText(element.body))
    .join("");
}

function parseSharedStrings(xml: string | undefined): string[] {
  if (!xml) return [];
  return elements(xml, "si").map((element) => textOf(element.body));
}

/** Column letters to a 0-based index: A -> 0, AB -> 27. */
function columnIndex(reference: string): number {
  const letters = /^([A-Z]+)/.exec(reference)?.[1] ?? "";
  let index = 0;
  for (const letter of letters) {
    index = index * 26 + (letter.charCodeAt(0) - 64);
  }
  return index - 1;
}

export type SheetRows = string[][];

function parseSheet(xml: string, shared: string[]): SheetRows {
  const rows: SheetRows = [];
  for (const row of elements(xml, "row")) {
    const cells: string[] = [];
    for (const cell of elements(row.body, "c")) {
      const attrs = cell.attrs;
      const body = cell.body;
      const reference = /r="([A-Z]+\d+)"/.exec(attrs)?.[1];
      const type = /t="([^"]+)"/.exec(attrs)?.[1];

      let value = "";
      if (type === "inlineStr") {
        value = textOf(body);
      } else {
        const raw = decodeXmlText(elements(body, "v")[0]?.body ?? "");
        value = type === "s" ? (shared[Number(raw)] ?? "") : raw;
      }

      // Excel omits empty cells, so place each value at its own column.
      const index = reference ? columnIndex(reference) : cells.length;
      while (cells.length < index) cells.push("");
      cells[index] = value;
    }
    rows.push(cells);
  }
  return rows;
}

export type Workbook = {
  sheetNames: string[];
  sheet(name?: string): SheetRows;
};

export function readWorkbook(buffer: Buffer): Workbook {
  const entries = readEntries(buffer);
  const get = (name: string) => {
    const entry = entries.get(name);
    return entry ? readFile(buffer, entry) : undefined;
  };

  const shared = parseSharedStrings(get("xl/sharedStrings.xml"));
  const workbookXml = get("xl/workbook.xml");
  if (!workbookXml) throw new Error("Not an xlsx file (no xl/workbook.xml).");

  // Worksheet order in workbook.xml matches sheet1.xml, sheet2.xml, …
  const sheetNames = elements(workbookXml, "sheet")
    .map((element) => /name="([^"]*)"/.exec(element.attrs)?.[1])
    .filter((name): name is string => Boolean(name))
    .map(decodeXmlText);

  return {
    sheetNames,
    sheet(name?: string): SheetRows {
      const index = name ? sheetNames.indexOf(name) : 0;
      if (index < 0) {
        throw new Error(
          `Sheet "${name}" not found. Available: ${sheetNames.join(", ") || "(none)"}`,
        );
      }
      const xml = get(`xl/worksheets/sheet${index + 1}.xml`);
      if (!xml) throw new Error(`Sheet "${sheetNames[index]}" has no worksheet XML.`);
      return parseSheet(xml, shared);
    },
  };
}
