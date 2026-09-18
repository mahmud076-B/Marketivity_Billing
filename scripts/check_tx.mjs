import fs from 'fs';
import pg from 'pg';

async function main() {
  const envText = fs.readFileSync('.env', 'utf-8');
  let dbUrl = envText.split('\n').find(l => l.startsWith('DATABASE_URL='))?.replace('DATABASE_URL=', '').trim();
  if (dbUrl) dbUrl = dbUrl.replace(/^"/, '').replace(/"$/, '');
  
  const pool = new pg.Pool({ connectionString: dbUrl });
  try {
    const transactions = await pool.query('SELECT id, description, amount FROM transactions');
    console.log(`Total Transactions: ${transactions.rows.length}`);
    
    // find transaction related to Afzal's payments?
    // transactions don't have invoice_id. But they might be linked to receipt/payment?
    // Let's see the schema
    const schema = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions'");
    console.log("Transaction columns:", schema.rows.map(r => r.column_name).join(', '));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
