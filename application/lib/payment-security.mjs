const encode=new TextEncoder();
export async function validSignature(message,signature,secret){
 if(typeof signature!=='string'||! /^[a-f0-9]{64}$/i.test(signature)||!secret)return false;
 const key=await crypto.subtle.importKey('raw',encode.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const bytes=Uint8Array.from(signature.match(/../g),s=>parseInt(s,16));
 return crypto.subtle.verify('HMAC',key,bytes,encode.encode(message));
}
export function capturedPaymentMatches(payment,order){return payment?.status==='captured'&&payment?.captured===true&&payment?.order_id===order.providerOrderId&&payment?.amount===order.amount&&payment?.currency===order.currency;}
export async function boundedText(request,max=65536){
 if(Number(request.headers.get('content-length'))>max)throw new Error('Payload too large');
 const reader=request.body?.getReader();if(!reader)return '';let length=0;const parts=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>max){await reader.cancel();throw new Error('Payload too large')}parts.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(length);let at=0;for(const p of parts){bytes.set(p,at);at+=p.length}return new TextDecoder().decode(bytes);
}
