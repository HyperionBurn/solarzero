import PdfPrinter from "pdfmake";
import path from "path";

const fontsDir = path.join(__dirname, "fonts");

const fonts = {
  Roboto: {
    normal: path.join(fontsDir, "Roboto-Regular.ttf"),
    bold: path.join(fontsDir, "Roboto-Medium.ttf"),
  },
};

const printer = new PdfPrinter(fonts);

export interface ProposalData {
  proposalId: string;
  buildingName?: string | null;
  buildingAddress: string;
  buildingType: string;
  roofAreaM2: number;
  systemSizeKwp: number;
  panelCount: number;
  annualProduction: number;
  totalCostAed: number;
  annualSavingsAed: number;
  paybackYears: number;
  npv25yrAed: number;
  co2OffsetTons: number;
  dewaTariffAed: number;
  dataSource: string;
  ghiAnnual: number;
}

/**
 * Generate a proposal PDF buffer from assessment data.
 * Uses pdfmake to create a professional A4 document.
 */
export async function generateProposalPdf(data: ProposalData): Promise<Buffer> {
  const docDefinition = {
    pageSize: "A4" as const,
    pageMargins: [48, 48, 48, 32] as [number, number, number, number],
    content: [
      // Header
      {
        columns: [
          {
            text: "SolarZero",
            style: "header",
            width: "*",
          },
          {
            text: "Confidential",
            style: "badge",
            width: "auto",
            alignment: "right" as const,
          },
        ],
        columnGap: 16,
      },
      { text: "Solar Assessment Report", style: "subtitle" },
      { text: "\n" },

      // Building address
      ...(data.buildingName?.trim()
        ? [
            {
              text: data.buildingName.trim(),
              style: "address",
            },
            {
              text: data.buildingAddress,
              style: "addressSubtitle",
            },
          ]
        : [
            {
              text: data.buildingAddress,
              style: "address",
            },
          ]),
      { text: "\n" },

      // Building Overview
      { text: "Building Overview", style: "sectionHeader" },
      {
        columns: [
          {
            width: "*",
            table: {
              body: [
                [
                  { text: "Building Type", style: "tableHeader" },
                  { text: data.buildingType, style: "tableValue" },
                ],
                [
                  { text: "Roof Area", style: "tableHeader" },
                  { text: `${Math.round(data.roofAreaM2)} m²`, style: "tableValue" },
                ],
              ],
            },
            layout: "lightHorizontalLines",
          },
        ],
      },
      { text: "\n" },

      // Solar Assessment Results
      { text: "Solar Assessment Results", style: "sectionHeader" },
      {
        columns: [
          {
            width: "*",
            table: {
              body: [
                [
                  { text: "System Size", style: "tableHeader" },
                  { text: `${data.systemSizeKwp.toFixed(1)} kWp`, style: "tableValue" },
                ],
                [
                  { text: "Solar Panels", style: "tableHeader" },
                  { text: `${data.panelCount}`, style: "tableValue" },
                ],
                [
                  { text: "Annual Production", style: "tableHeader" },
                  { text: `${Math.round(data.annualProduction).toLocaleString()} kWh`, style: "tableValue" },
                ],
                [
                  { text: "Source GHI", style: "tableHeader" },
                  { text: `${Math.round(data.ghiAnnual)} kWh/m²/yr`, style: "tableValue" },
                ],
                [
                  { text: "Total Cost", style: "tableHeader" },
                  { text: `AED ${Math.round(data.totalCostAed).toLocaleString()}`, style: "tableValue" },
                ],
                [
                  { text: "Annual Savings", style: "tableHeader" },
                  { text: `AED ${Math.round(data.annualSavingsAed).toLocaleString()}`, style: "tableValue" },
                ],
                [
                  { text: "Payback Period", style: "tableHeader" },
                  { text: `${data.paybackYears.toFixed(1)} years`, style: "tableValue" },
                ],
                [
                  { text: "NPV (25 years)", style: "tableHeader" },
                  { text: `AED ${Math.round(data.npv25yrAed).toLocaleString()}`, style: "tableValue" },
                ],
                [
                  { text: "CO₂ Offset", style: "tableHeader" },
                  { text: `${data.co2OffsetTons.toFixed(1)} tons/yr`, style: "tableValue" },
                ],
                [
                  { text: "Data Source", style: "tableHeader" },
                  { text: data.dataSource, style: "tableValue" },
                ],
              ],
            },
            layout: "lightHorizontalLines",
          },
        ],
      },
      { text: "\n" },

      // DEWA Note
      {
        text: [
          { text: "DEWA Tariff: ", bold: true },
          `Based on DEWA slab tariff at AED ${data.dewaTariffAed.toFixed(2)}/kWh. `,
          "Actual savings may vary based on consumption patterns and tariff structure. ",
          "This is an estimate based on satellite irradiance data and industry-standard performance models.",
        ],
        style: "note",
      },

      // Footer
      { text: "\n\n" },
      {
        columns: [
          { text: "Powered by SolarZero", style: "footer" },
          {
            text: `Confidential — Generated ${new Date().toLocaleDateString("en-AE")}`,
            style: "footer",
            alignment: "right" as const,
          },
        ],
      },
    ],
    styles: {
      header: {
        fontSize: 28,
        bold: true,
        color: "#0d9488",
      },
      badge: {
        fontSize: 12,
        bold: true,
        color: "#0d9488",
        background: "#f0fdfa",
        margin: [6, 4, 6, 4] as [number, number, number, number],
      },
      subtitle: {
        fontSize: 14,
        color: "#64748b",
        margin: [0, 4, 0, 0] as [number, number, number, number],
      },
      address: {
        fontSize: 18,
        bold: true,
        margin: [0, 16, 0, 16] as [number, number, number, number],
      },
      addressSubtitle: {
        fontSize: 12,
        color: "#64748b",
        margin: [0, -8, 0, 16] as [number, number, number, number],
      },
      sectionHeader: {
        fontSize: 18,
        bold: true,
        color: "#0d9488",
        margin: [0, 16, 0, 8] as [number, number, number, number],
      },
      tableHeader: {
        fontSize: 11,
        bold: true,
        color: "#64748b",
        margin: [8, 6, 8, 6] as [number, number, number, number],
      },
      tableValue: {
        fontSize: 14,
        bold: true,
        color: "#0f172a",
        alignment: "right" as const,
        margin: [8, 6, 8, 6] as [number, number, number, number],
      },
      note: {
        fontSize: 12,
        color: "#0d9488",
        background: "#f0fdfa",
        margin: [12, 8, 12, 8] as [number, number, number, number],
        border: [false, false, false, false] as [boolean, boolean, boolean, boolean],
      },
      footer: {
        fontSize: 10,
        color: "#94a3b8",
      },
    },
    defaultStyle: {
      font: "Roboto",
    },
  };

  return new Promise((resolve, reject) => {
    try {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks: Buffer[] = [];

      pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
      pdfDoc.on("error", reject);

      pdfDoc.end();
    } catch (err) {
      reject(err);
    }
  });
}
