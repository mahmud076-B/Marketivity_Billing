import fs from 'fs';
import pg from 'pg';

async function main() {
  const envText = fs.readFileSync('.env', 'utf-8');
  let dbUrl = envText.split('\n').find(l => l.startsWith('DATABASE_URL='))?.replace('DATABASE_URL=', '').trim();
  if (dbUrl) dbUrl = dbUrl.replace(/^"/, '').replace(/"$/, '');
  
  const pool = new pg.Pool({ connectionString: dbUrl });
  try {
    const clients = await pool.query('SELECT id, name, is_sample FROM clients');
    const invoices = await pool.query('SELECT id, invoice_number, client_id FROM invoices');
    const invoiceItems = await pool.query('SELECT id, invoice_id, service_id, amount FROM invoice_items');
    const payments = await pool.query('SELECT id, invoice_id, amount FROM payments');
    const services = await pool.query('SELECT id, name FROM services');
    
    console.log("=== PRE-CLEANUP AUDIT ===");
    console.log(`Total Clients: ${clients.rows.length}`);
    console.log(`Total Invoices: ${invoices.rows.length}`);
    console.log(`Total Invoice Items: ${invoiceItems.rows.length}`);
    console.log(`Total Payments: ${payments.rows.length}`);
    console.log(`Total Services: ${services.rows.length}`);
    
    const afzal = clients.rows.find(c => c.name === 'Afzal Hossain');
    if (!afzal) {
      console.log("ERROR: Afzal Hossain not found!");
      return;
    }
    
    console.log("\n--- AFZAL HOSSAIN RECORDS ---");
    console.log("Client ID:", afzal.id);
    
    const afzalInvoices = invoices.rows.filter(i => i.client_id === afzal.id);
    console.log(`Invoices for Afzal: ${afzalInvoices.length}`);
    
    const afzalInvoiceIds = afzalInvoices.map(i => i.id);
    const afzalItems = invoiceItems.rows.filter(item => afzalInvoiceIds.includes(item.invoice_id));
    console.log(`Invoice Items for Afzal: ${afzalItems.length}`);
    
    const afzalServiceIds = [...new Set(afzalItems.map(i => i.service_id).filter(id => id != null))];
    console.log(`Services used by Afzal: ${afzalServiceIds.length}`);
    
    const afzalPayments = payments.rows.filter(p => afzalInvoiceIds.includes(p.invoice_id));
    console.log(`Payments for Afzal: ${afzalPayments.length}`);
    console.log("Payment amounts:", afzalPayments.map(p => p.amount));
    
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
