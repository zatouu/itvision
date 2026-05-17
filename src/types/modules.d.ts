declare module 'pdf-parse' {
  interface PDFParseResult {
    text: string
    numpages: number
    numrender: number
    info: Record<string, unknown>
    metadata: Record<string, unknown>
    version: string
  }
  function pdfParse(buffer: Buffer): Promise<PDFParseResult>
  export = pdfParse
}

declare module 'xlsx' {
  export interface WorkSheet {}
  export interface WorkBook {
    SheetNames: string[]
    Sheets: Record<string, WorkSheet>
  }
  export function read(data: Buffer | string, opts?: any): WorkBook
  export const utils: {
    sheet_to_json<T = any>(worksheet: WorkSheet, opts?: any): T[]
  }
}
