import PDFDocument from 'pdfkit';
import { formatINR } from '@community-finance/shared';

export interface ReceiptData {
  receiptNumber: string;
  communityName: string;
  memberName: string;
  memberPhone: string;
  amount: number; // paise
  paymentType: string;
  method: string;
  period?: string;
  eventName?: string;
  paidAt: Date;
  reference?: string;
}

function docToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

const dateFmt = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

/** Payment receipt PDF — A5, print-friendly. */
export async function generateReceiptPdf(data: ReceiptData): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A5', margin: 40 });

  // Header
  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .text(data.communityName, { align: 'center' })
    .moveDown(0.2)
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#666666')
    .text('Payment Receipt', { align: 'center' })
    .moveDown(1);

  doc
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor('#dddddd')
    .stroke()
    .moveDown(1);

  const rows: Array<[string, string]> = [
    ['Receipt No.', data.receiptNumber],
    ['Date', dateFmt.format(data.paidAt)],
    ['Received from', `${data.memberName} (${data.memberPhone})`],
    ['Payment for', data.eventName ?? data.paymentType],
    ...(data.period ? ([['Period', data.period]] as Array<[string, string]>) : []),
    ['Payment mode', data.method],
    ...(data.reference ? ([['Reference', data.reference]] as Array<[string, string]>) : []),
  ];

  doc.fillColor('#000000').fontSize(10);
  for (const [label, value] of rows) {
    const y = doc.y;
    doc.font('Helvetica').fillColor('#666666').text(label, doc.page.margins.left, y, { width: 120 });
    doc
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text(value, doc.page.margins.left + 130, y, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 130,
      });
    doc.moveDown(0.5);
  }

  doc.moveDown(1);

  // Amount box
  const boxY = doc.y;
  const boxWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc
    .roundedRect(doc.page.margins.left, boxY, boxWidth, 50, 6)
    .fillColor('#f4f4f8')
    .fill();
  doc
    .fillColor('#666666')
    .font('Helvetica')
    .fontSize(9)
    .text('AMOUNT RECEIVED', doc.page.margins.left + 16, boxY + 10);
  doc
    .fillColor('#000000')
    .font('Helvetica-Bold')
    .fontSize(16)
    .text(formatINR(data.amount), doc.page.margins.left + 16, boxY + 24);

  doc
    .fontSize(8)
    .font('Helvetica')
    .fillColor('#999999')
    .text(
      'This is a system-generated receipt and does not require a signature.',
      doc.page.margins.left,
      doc.page.height - doc.page.margins.bottom - 20,
      { align: 'center', width: boxWidth }
    );

  return docToBuffer(doc);
}

export interface ReportPdfData {
  communityName: string;
  title: string;
  periodLabel: string;
  generatedAt: Date;
  sections: Array<{
    heading: string;
    rows: Array<[string, string]>;
  }>;
  tables?: Array<{
    heading: string;
    columns: string[];
    rows: string[][];
  }>;
}

/** Multi-section financial report PDF — A4, print-ready. */
export async function generateReportPdf(data: ReportPdfData): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc
    .fontSize(18)
    .font('Helvetica-Bold')
    .text(data.communityName)
    .moveDown(0.1)
    .fontSize(12)
    .font('Helvetica')
    .fillColor('#444444')
    .text(`${data.title} — ${data.periodLabel}`)
    .fontSize(8)
    .fillColor('#999999')
    .text(`Generated ${dateFmt.format(data.generatedAt)}`)
    .moveDown(1);

  for (const section of data.sections) {
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text(section.heading)
      .moveDown(0.3);
    for (const [label, value] of section.rows) {
      const y = doc.y;
      doc.fontSize(9).font('Helvetica').fillColor('#666666').text(label, doc.page.margins.left, y, { width: 220 });
      doc.font('Helvetica-Bold').fillColor('#000000').text(value, doc.page.margins.left + 230, y);
      doc.moveDown(0.35);
    }
    doc.moveDown(0.8);
  }

  for (const table of data.tables ?? []) {
    if (doc.y > doc.page.height - 150) doc.addPage();
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text(table.heading).moveDown(0.4);

    const colWidth = contentWidth / table.columns.length;
    const headerY = doc.y;
    table.columns.forEach((col, i) => {
      doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .fillColor('#666666')
        .text(col.toUpperCase(), doc.page.margins.left + i * colWidth, headerY, { width: colWidth - 8 });
    });
    doc.moveDown(0.5);
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .strokeColor('#dddddd')
      .stroke()
      .moveDown(0.3);

    for (const row of table.rows) {
      if (doc.y > doc.page.height - 80) doc.addPage();
      const y = doc.y;
      row.forEach((cell, i) => {
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#000000')
          .text(cell, doc.page.margins.left + i * colWidth, y, { width: colWidth - 8 });
      });
      doc.moveDown(0.4);
    }
    doc.moveDown(0.8);
  }

  return docToBuffer(doc);
}
