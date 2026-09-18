import fs from 'fs';
import pg from 'pg';

async function main() {
  const envText = fs.readFileSync('.env', 'utf-8');
  let dbUrl = envText.split('\n').find(l => l.startsWith('DATABASE_URL='))?.replace('DATABASE_URL=', '').trim();
  if (dbUrl) dbUrl = dbUrl.replace(/^"/, '').replace(/"$/, '');
  
  const pool = new pg.Pool({ connectionString: dbUrl });
  const afzalId = 'b1e142fe-c8be-4e35-b38e-a052f0a0857f';
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Payments
    const payRes = await client.query('DELETE FROM payments WHERE invoice_id NOT IN (SELECT id FROM invoices WHERE client_id = $1) RETURNING id', [afzalId]);
    console.log(`Deleted ${payRes.rowCount} payments`);
    
    // Invoice items
    const itemRes = await client.query('DELETE FROM invoice_items WHERE invoice_id NOT IN (SELECT id FROM invoices WHERE client_id = $1) RETURNING id', [afzalId]);
    console.log(`Deleted ${itemRes.rowCount} invoice items`);
    
    // Invoices
    const invRes = await client.query('DELETE FROM invoices WHERE client_id != $1 RETURNING id', [afzalId]);
    console.log(`Deleted ${invRes.rowCount} invoices`);
    
    // Services
    const srvRes = await client.query('DELETE FROM services RETURNING id');
    console.log(`Deleted ${srvRes.rowCount} services`);
    
    // Clients
    const clRes = await client.query('DELETE FROM clients WHERE id != $1 RETURNING id', [afzalId]);
    console.log(`Deleted ${clRes.rowCount} clients`);
    
    // Verify Afzal Hossain is intact
    const afzalCheck = await client.query('SELECT * FROM clients WHERE id = $1', [afzalId]);
    if (afzalCheck.rowCount !== 1) {
      throw new Error("Afzal Hossain client row missing!");
    }
    const afzalInv = await client.query('SELECT * FROM invoices WHERE client_id = $1', [afzalId]);
    if (afzalInv.rowCount !== 1) {
      throw new Error("Afzal Hossain invoice missing!");
    }
    const afzalPay = await client.query('SELECT amount FROM payments WHERE invoice_id = $1', [afzalInv.rows[0].id]);
    if (afzalPay.rowCount !== 2) {
      throw new Error("Afzal Hossain payments missing!");
    }
    const totalPay = afzalPay.rows.reduce((sum, r) => sum + Number(r.amount), 0);
    if (totalPay !== 1520) {
      throw new Error(`Afzal Hossain payment amount mismatch! Found ${totalPay}`);
    }
    
    console.log("Verification passed: Afzal Hossain and 1520 payment intact.");
    
    await client.query('COMMIT');
    console.log("Transaction COMMITTED.");
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("ERROR! Transaction ROLLBACK.", err);
  } finally {
    client.release();
    await pool.end();
  }
}
main();
