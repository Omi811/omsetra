import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {guessMapping} from './import-preview.mjs';
export async function pdfTable(buffer:ArrayBuffer){
 const pdfjs=await import('pdfjs-dist');
 pdfjs.GlobalWorkerOptions.workerSrc=pdfWorkerUrl;
 const task=pdfjs.getDocument({data:new Uint8Array(buffer),useSystemFonts:true,stopAtErrors:true});
 const timeout=setTimeout(()=>{void task.destroy()},20000);
 try{const pdf=await task.promise;if(pdf.numPages>25)throw new Error('PDF limit is 25 pages. Export a shorter date range.');const rows:string[][]=[];let headers:{text:string;x:number}[]=[];let raw='';
 for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){const page=await pdf.getPage(pageNumber);const content=await page.getTextContent();const lines:{y:number;items:{text:string;x:number}[]}[]=[];for(const item of content.items){if(!('str' in item)||!item.str.trim())continue;const y=item.transform[5],x=item.transform[4];let line=lines.find(l=>Math.abs(l.y-y)<3);if(!line){line={y,items:[]};lines.push(line)}line.items.push({text:item.str.trim(),x})}lines.sort((a,b)=>b.y-a.y);
 for(const line of lines){const items=line.items.sort((a,b)=>a.x-b.x);const texts=items.map(i=>i.text);raw+=`Page ${pageNumber}: ${texts.join(' | ')}\n`;const mapping=guessMapping(texts,'bank');if(mapping.date>=0&&mapping.credit>=0&&mapping.narration>=0){headers=items;if(!rows.length)rows.push(texts);continue}if(!headers.length)continue;const cols=headers.map(()=>'');for(const item of items){let index=0;for(let i=0;i<headers.length;i++)if(item.x>=headers[i].x-12)index=i;cols[index]+=(cols[index]?' ':'')+item.text}if(/^\d{1,4}[-/ ]/.test(cols[mapping.date>=0?mapping.date:guessMapping(headers.map(h=>h.text),'bank').date]||''))rows.push(cols);else if(rows.length>1&&cols.every((v,i)=>!v||i===guessMapping(headers.map(h=>h.text),'bank').narration)){const n=guessMapping(headers.map(h=>h.text),'bank').narration;rows[rows.length-1][n]+=' '+cols[n]}if(rows.length>501)throw new Error('PDF preview limit is 500 statement rows.')}page.cleanup()}
 if(rows.length<2)throw new Error('No readable bank table found. Scanned PDFs, password-protected files and unfamiliar layouts need a searchable table export or Excel/CSV.');return {sheets:[{name:'PDF bank table',rows,formulas:false}],raw:raw.slice(0,100000)};
 }finally{clearTimeout(timeout);await task.destroy()}
}
