import PDFDocument from 'pdfkit';
import { Readable } from 'stream';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

interface InvoiceData {
  schoolName: string;
  schoolAddress: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  amount: number;
  planName: string;
  studentLimit: number;
  period: string;
}

interface ReceiptData {
  receiptNumber: string;
  receiptDate: Date;
  studentName: string;
  studentId: string;
  feeType: string;
  amount: number;
  paymentMethod: string;
  schoolName: string;
}

export async function generateInvoicePDF(invoiceData: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
    doc.moveDown();

    // School info
    doc.fontSize(12).font('Helvetica-Bold').text(invoiceData.schoolName);
    doc.fontSize(10).font('Helvetica').text(invoiceData.schoolAddress);
    doc.moveDown();

    // Invoice details
    doc
      .fontSize(10)
      .text(`Invoice Number: ${invoiceData.invoiceNumber}`, { width: 250 })
      .text(`Invoice Date: ${invoiceData.invoiceDate.toLocaleDateString()}`, { width: 250 })
      .text(`Due Date: ${invoiceData.dueDate.toLocaleDateString()}`, { width: 250 });

    doc.moveDown();

    // Table Header
    doc.fontSize(11).font('Helvetica-Bold');
    const tableTop = doc.y;
    doc.text('Description', 50);
    doc.text('Amount', 350);

    doc.moveTo(40, tableTop + 20).lineTo(550, tableTop + 20).stroke();

    // Table Row
    doc.fontSize(10).font('Helvetica');
    doc.text(`${invoiceData.planName} Plan - ${invoiceData.period}`, 50);
    doc.text(`$${invoiceData.amount.toFixed(2)}`, 350);

    doc.moveDown();
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();

    // Total
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text(`Total Due: $${invoiceData.amount.toFixed(2)}`, { align: 'right', width: 500 });

    doc.moveDown();
    doc.fontSize(10).font('Helvetica');
    doc.text('Payment Terms: Due within 30 days', { align: 'center' });
    doc.text('Please remit payment to the account provided in your email.', {
      align: 'center',
    });

    doc.end();
  });
}

export async function generateReceiptPDF(receiptData: ReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('RECEIPT', { align: 'center' });
    doc.fontSize(12).text(receiptData.schoolName, { align: 'center' });
    doc.moveDown();

    // Receipt info
    doc.fontSize(10).font('Helvetica');
    doc.text(`Receipt #: ${receiptData.receiptNumber}`);
    doc.text(`Date: ${receiptData.receiptDate.toLocaleDateString()}`);
    doc.moveDown();

    // Student info
    doc.text(`Student: ${receiptData.studentName}`);
    doc.text(`Student ID: ${receiptData.studentId}`);
    doc.moveDown();

    // Payment details
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('Payment Details');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Fee Type: ${receiptData.feeType}`);
    doc.text(`Amount Paid: $${receiptData.amount.toFixed(2)}`);
    doc.text(`Payment Method: ${receiptData.paymentMethod}`);
    doc.moveDown();

    // Footer
    doc.fontSize(9).text('Thank you for your payment!', { align: 'center' });
    doc.text('This receipt is valid proof of payment.', { align: 'center' });

    doc.end();
  });
}

export async function storeInvoicePDF(
  schoolId: string,
  invoiceId: string,
  pdfBuffer: Buffer
): Promise<string> {
  // In a production system, you would upload to S3 or similar
  // For now, we'll store the PDF URL in the database
  try {
    const filename = `invoice-${invoiceId}-${Date.now()}.pdf`;

    await db.query(
      'UPDATE invoices SET pdf_url = $1 WHERE id = $2',
      [`/files/invoices/${filename}`, invoiceId]
    );

    logger.info('Invoice PDF stored', { invoiceId, schoolId });
    return `/files/invoices/${filename}`;
  } catch (error) {
    logger.error('Failed to store invoice PDF', { error, invoiceId });
    throw error;
  }
}

export async function storeReceiptPDF(
  schoolId: string,
  paymentId: string,
  receiptId: string,
  pdfBuffer: Buffer
): Promise<string> {
  try {
    const filename = `receipt-${receiptId}-${Date.now()}.pdf`;

    await db.query(
      'UPDATE student_payments SET receipt_url = $1 WHERE id = $2',
      [`/files/receipts/${filename}`, paymentId]
    );

    logger.info('Receipt PDF stored', { paymentId, receiptId, schoolId });
    return `/files/receipts/${filename}`;
  } catch (error) {
    logger.error('Failed to store receipt PDF', { error, paymentId });
    throw error;
  }
}
