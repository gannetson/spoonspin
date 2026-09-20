import { describe, expect, it } from "vitest";
import { deflateRawSync } from "node:zlib";
import { readWorkbook } from "./xlsxReader.ts";

/** Build a real (tiny) xlsx in memory so the test exercises the zip path. */
function makeXlsx(files: Record<string, string>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const nameBuf = Buffer.from(name, "utf8");
    const raw = Buffer.from(content, "utf8");
    const deflated = deflateRawSync(raw);

    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt32LE(0, 14); // crc, unchecked by the reader
    local.writeUInt32LE(deflated.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    nameBuf.copy(local, 30);

    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(deflated.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);

    locals.push(local, deflated);
    centrals.push(central);
    offset += local.length + deflated.length;
  }

  const centralBuf = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(centrals.length, 8);
  eocd.writeUInt16LE(centrals.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, centralBuf, eocd]);
}

const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';

describe("readWorkbook", () => {
  it("reads sheet names and shared-string cells", () => {
    const book = makeXlsx({
      "xl/workbook.xml": `<workbook ${NS}><sheets><sheet name="Data" sheetId="1"/></sheets></workbook>`,
      "xl/sharedStrings.xml": `<sst ${NS}><si><t>Land</t></si><si><t>Raïnaraï</t></si></sst>`,
      "xl/worksheets/sheet1.xml": `<worksheet ${NS}><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row></sheetData></worksheet>`,
    });
    const wb = readWorkbook(book);
    expect(wb.sheetNames).toEqual(["Data"]);
    expect(wb.sheet("Data")).toEqual([["Land", "Raïnaraï"]]);
  });

  it("reads files written with a namespace prefix", () => {
    // Excel writes <sheet>; other generators write <x:sheet> against the same
    // schema. Assuming the plain form yields a silently empty workbook.
    const x = 'xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
    const book = makeXlsx({
      "xl/workbook.xml": `<x:workbook ${x}><x:sheets><x:sheet name="Restaurants NL" sheetId="1"/></x:sheets></x:workbook>`,
      "xl/worksheets/sheet1.xml": `<x:worksheet ${x}><x:sheetData><x:row r="1"><x:c r="A1" t="inlineStr"><x:is><x:t>Algerije</x:t></x:is></x:c></x:row></x:sheetData></x:worksheet>`,
    });
    const wb = readWorkbook(book);
    expect(wb.sheetNames).toEqual(["Restaurants NL"]);
    expect(wb.sheet()).toEqual([["Algerije"]]);
  });

  it("puts values in the right column when empty cells are omitted", () => {
    const book = makeXlsx({
      "xl/workbook.xml": `<workbook ${NS}><sheets><sheet name="S" sheetId="1"/></sheets></workbook>`,
      "xl/worksheets/sheet1.xml": `<worksheet ${NS}><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>a</t></is></c><c r="D1" t="inlineStr"><is><t>d</t></is></c></row></sheetData></worksheet>`,
    });
    expect(readWorkbook(book).sheet("S")).toEqual([["a", "", "", "d"]]);
  });

  it("decodes entities and joins split runs", () => {
    const book = makeXlsx({
      "xl/workbook.xml": `<workbook ${NS}><sheets><sheet name="S" sheetId="1"/></sheets></workbook>`,
      "xl/sharedStrings.xml": `<sst ${NS}><si><r><t>Keuken </t></r><r><t>&amp; regio</t></r></si></sst>`,
      "xl/worksheets/sheet1.xml": `<worksheet ${NS}><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row></sheetData></worksheet>`,
    });
    expect(readWorkbook(book).sheet("S")).toEqual([["Keuken & regio"]]);
  });

  it("names the sheets it does have when asked for one it does not", () => {
    const book = makeXlsx({
      "xl/workbook.xml": `<workbook ${NS}><sheets><sheet name="Only" sheetId="1"/></sheets></workbook>`,
      "xl/worksheets/sheet1.xml": `<worksheet ${NS}><sheetData/></worksheet>`,
    });
    expect(() => readWorkbook(book).sheet("Missing")).toThrow(/Only/);
  });

  it("rejects something that is not a zip", () => {
    expect(() => readWorkbook(Buffer.from("not a spreadsheet"))).toThrow(/zip/i);
  });
});
