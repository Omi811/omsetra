import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {paise,isoDate,readCsv,parseBank,parseInvoices,suggestMatches,receiptXml} from '../lib/reconciliation.mjs';
const invoice={id:'i1',number:'INV-101',customer:'Acme Software LLP',netAmount:1000000,gstAmount:180000,grossAmount:1180000,issuedDate:'2026-10-01',dueDate:'2026-10-15',reference:'UTR123456'};
const credit={id:'c1',date:'2026-10-16',narration:'NEFT INV-101',amount:1180000,reference:'UTR123456',counterparty:'Acme Software LLP'};
test('CSV parser preserves quoted Indian amounts, embedded commas and newlines',()=>{
 const rows=readCsv('Date,Narration,Credit,Debit\r\n16/10/2026,"NEFT, Acme", "11,800.00",0\r\n'.replace(', "',',"'));assert.equal(rows[0].credit,'11,800.00');assert.equal(paise(rows[0].credit),1180000);assert.equal(readCsv('a,b\n"line\none",two')[0].a,'line\none');assert.equal(isoDate('29/02/2024'),'2024-02-29');assert.throws(()=>isoDate('29/02/2025'));assert.throws(()=>isoDate('2026-13-01'));assert.throws(()=>paise('-1'));assert.throws(()=>paise('0.001'));assert.throws(()=>readCsv('a,a\n1,2'));assert.throws(()=>readCsv('a,b\n1'));assert.throws(()=>readCsv('a,b\n"unclosed,2'));
});
test('bank aliases extract credits and ignore debit-only rows without inventing counterparties',()=>{
 const result=parseBank('Txn Date,Description,Deposit Amt.,Withdrawal Amt.,Chq./Ref.No.\n16/10/2026,NEFT ACME,11800,0,UTR123456\n17/10/2026,SUPPLIER PAYMENT,0,300,DEBITREF');assert.equal(result.records.length,1);assert.equal(result.skipped,1);assert.equal(result.records[0].amount,1180000);assert.equal(result.records[0].counterparty,'');assert.throws(()=>parseBank('Date,Narration,Credit,Currency\n2026-10-01,FOREX,100,USD'),/Only INR/);assert.equal(result.records[0].reference,'UTR123456');assert.throws(()=>parseBank('Date,Narration,Credit,Debit\n2026-10-01,AMBIGUOUS,10,20'));
});
test('invoice import retains pre-GST and GST components exactly',()=>{
 const [i]=parseInvoices('Invoice Number,Customer,Net Amount,GST Amount,Invoice Date,Due Date\nINV-101,Acme,10000,1800,2026-10-01,2026-10-15');assert.equal(i.netAmount,1000000);assert.equal(i.grossAmount,1180000);assert.throws(()=>parseInvoices('Invoice Number,Customer,Net Amount,GST Amount,Invoice Date,Due Date\nX,A,0,0,2026-10-01,2026-10-15'));
});
test('exact identity and amount produce suggestions; amount alone never auto-matches',()=>{
 assert.equal(suggestMatches([invoice],[credit],[]).queue[0].bucket,'auto');assert.equal(suggestMatches([invoice],[{...credit,narration:'Unidentified',reference:'',counterparty:''}],[]).queue[0].bucket,'unmatched');assert.equal(suggestMatches([invoice],[{...credit,date:'2026-09-01'}],[]).queue[0].bucket,'review');assert.equal(suggestMatches([invoice],[{...credit,amount:500000}],[]).queue[0].bucket,'review');
});
test('TDS hints use pre-GST base and always require review',()=>{
 for(const rate of [1,2,10]){const q=suggestMatches([invoice],[{...credit,amount:invoice.grossAmount-invoice.netAmount*rate/100}],[]).queue[0];assert.equal(q.bucket,'review');assert.equal(q.candidates[0].tdsRate,rate);assert.equal(q.candidates[0].tdsAmount,invoice.netAmount*rate/100)}
 // Omitting GST is not automatically interpreted as a valid TDS deduction.
 assert.equal(suggestMatches([invoice],[{...credit,amount:980000}],[]).queue[0].candidates[0].tdsRate,0);
});
test('competing invoices and credits are demoted; approved receipts cannot be reused',()=>{
 const duplicate={...invoice,id:'i2',number:'INV-102'};assert.equal(suggestMatches([invoice,duplicate],[credit],[]).queue[0].bucket,'review');const competing=suggestMatches([invoice],[credit,{...credit,id:'c2'}],[]);assert.ok(competing.queue.every(q=>q.bucket==='review'));const a={invoiceId:'i1',creditId:'c1',cashAmount:500000,tdsAmount:0};const r=suggestMatches([invoice],[credit,{...credit,id:'c2',amount:680000}], [a]);assert.equal(r.queue.length,1);assert.equal(r.openInvoices[0].remaining,680000);assert.equal(r.queue[0].bucket,'auto');
});
test('Tally receipt XML is balanced, escaped and has stable receipt identity',()=>{
 const xml=receiptXml({name:'Demo & Co',bankLedger:'Bank <One>',tdsLedger:'TDS Receivable'},[{id:'receipt-1',invoiceId:'i1',creditId:'c1',cashAmount:1160000,tdsAmount:20000}],[{...invoice,customer:'Acme & Sons'}],[{...credit,amount:1160000}]);assert.match(xml,/Demo &amp; Co/);assert.match(xml,/Bank &lt;One&gt;/);assert.match(xml,/Acme &amp; Sons/);assert.match(xml,/REMOTEID="receipt-1"/);const amounts=[...xml.matchAll(/<ALLLEDGERENTRIES.LIST>[\s\S]*?<AMOUNT>([-\d.]+)<\/AMOUNT>/g)].map(m=>Math.round(Number(m[1])*100));assert.equal(amounts.length,3);assert.equal(amounts.reduce((a,b)=>a+b,0),0);assert.match(xml,/<BILLTYPE>Agst Ref<\/BILLTYPE>/);assert.throws(()=>receiptXml({name:'X',bankLedger:'B',tdsLedger:'T'},[{invoiceId:'missing'}],[],[]));
});
test('database rejects duplicate or cross-tenant allocation, overpayment and audit tampering',()=>{
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');db.exec(readFileSync(new URL('../drizzle/0003_misty_xavin.sql',import.meta.url),'utf8'));
 for(const id of ['a','b'])db.prepare('INSERT INTO reconciliation_organizations VALUES (?,?,?,?,?,?,?,?)').run(id,'owner-'+id,'Company '+id,'GSTIN-'+id,'Bank','TDS','v1','now');
 db.prepare('INSERT INTO reconciliation_invoices VALUES (?,?,?,?,?,?,?,?,?,?,?)').run('i1','a','INV-1','Customer',10000,1800,11800,'2026-10-01','2026-10-15','','now');
 for(const [id,org] of [['c1','a'],['c2','a'],['c-b','b']])db.prepare('INSERT INTO reconciliation_credits VALUES (?,?,?,?,?,?,?,?,?,?)').run(id,org,'Bank','2026-10-16',10000,'NEFT','','Customer',id,'now');
 const allocate=db.prepare('INSERT INTO reconciliation_allocations VALUES (?,?,?,?,?,?,?,?,?)');allocate.run('a1','a','i1','c1',10000,0,'owner-a','Reviewed correctly','now');assert.throws(()=>allocate.run('dup','a','i1','c1',10000,0,'owner-a','Duplicate','now'));assert.throws(()=>allocate.run('excess','a','i1','c2',10000,0,'owner-a','Overpayment','now'));assert.throws(()=>allocate.run('cross','a','i1','c-b',10000,0,'owner-a','Wrong tenant','now'));
 db.prepare('INSERT INTO reconciliation_audit VALUES (?,?,?,?,?,?,?)').run('event','a','owner-a','approved','{"allocation":null}','{"id":"a1"}','2026-10-22T00:00:00Z');assert.throws(()=>db.exec("UPDATE reconciliation_audit SET previous_state='changed'"),/append-only/);assert.throws(()=>db.exec('DELETE FROM reconciliation_audit'),/append-only/);assert.equal(db.prepare('SELECT count(*) n FROM reconciliation_audit').get().n,1);db.close();
});
