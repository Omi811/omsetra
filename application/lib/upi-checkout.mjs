// Presentation configuration only. Server payment-readiness checks remain authoritative.
export function upiCheckoutConfig(method='upi'){
 if(!['upi','all'].includes(method))throw new Error('Choose UPI or all payment methods.');
 return {display:{blocks:{omsetra_upi:{name:'Pay via UPI',instruments:[{method:'upi'}]}},sequence:['block.omsetra_upi'],preferences:{show_default_blocks:method==='all'}}};
}
