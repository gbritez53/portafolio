/** Emitida: la cobras tu (con tu generador). Recibida: un gasto de la actividad con su IVA soportado. */
export type InvoiceKind = "issued" | "received";

/** Decide si la factura lleva retencion (guia, pag. 04). */
export type CounterpartyType = "company" | "freelancer" | "individual" | "foreign";

export const VAT_RATES = [21, 10, 4, 0] as const;
export const WITHHOLDING_RATES = [0, 7, 15] as const;

export type VatRate = (typeof VAT_RATES)[number];
export type WithholdingRate = (typeof WITHHOLDING_RATES)[number];

/** Solo se registra: la factura se emite fuera del panel. Importes en centimos. */
export interface Invoice {
  id: string;
  kind: InvoiceKind;
  number: string;
  /** YYYY-MM-DD, fecha de la factura (define el trimestre). */
  date: string;
  counterparty: string;
  counterpartyType: CounterpartyType;
  base: number;
  vatRate: VatRate;
  withholdingRate: WithholdingRate;
  /** Solo recibidas: si cuenta como gasto deducible en el 303 y el 130. */
  deductible: boolean;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceDraft = Omit<Invoice, "id" | "createdAt" | "updatedAt">;

export interface AutonomoSettings {
  /** YYYY-MM-DD del alta en Hacienda; define el 7% de inicio de actividad. */
  activityStart: string | null;
  /** Epigrafe del IAE (p. ej. `763`); vacio si todavia no se eligio. */
  epigrafe: string;
  /** Actividad profesional (seccion 2.ª del IAE): sus facturas a empresas llevan retencion. */
  professional: boolean;
  /** Lo que ya tienes en la cuenta aparte para impuestos (centimos). */
  setAside: number;
  /** Modelos ya presentados: `303-2026-3`, `130-2026-3`, `390-2026`, `100-2026`. */
  filed: string[];
  /** Pasos hechos de la hoja de ruta de la guia (1 a 10). */
  roadmapDone: number[];
}

/** Para que sirve el documento guardado en la boveda. */
export type DocumentKind = "invoice" | "receipt" | "tax" | "social" | "other";

/** Archivo cifrado en Vercel Blob. Nombre, tipo y nota solo existen descifrados en el navegador. */
export interface AutonomoDocument {
  id: string;
  name: string;
  /** MIME del archivo original (p. ej. `application/pdf`). */
  type: string;
  /** Bytes del archivo original. */
  size: number;
  kind: DocumentKind;
  /** YYYY-MM-DD: fecha del documento (define en que año se lista). */
  date: string;
  /** Factura registrada a la que pertenece, si la hay. */
  invoiceId: string | null;
  note: string;
  createdAt: string;
}

export type DocumentDraft = Omit<AutonomoDocument, "id" | "createdAt">;
