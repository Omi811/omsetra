import {test} from 'node:test';
import assert from 'node:assert/strict';
import {upiCheckoutConfig} from '../lib/upi-checkout.mjs';
import {merchantPaymentReady} from '../lib/launch-readiness.mjs';
test('UPI uses provider checkout instruments without VPA collection or payment URLs',()=>{const c=upiCheckoutConfig('upi');assert.deepEqual(c.display.blocks.omsetra_upi.instruments,[{method:'upi'}]);assert.equal(c.display.preferences.show_default_blocks,false);assert.equal(upiCheckoutConfig('all').display.preferences.show_default_blocks,true);assert.throws(()=>upiCheckoutConfig('collect'));assert.doesNotMatch(JSON.stringify(c),/upi:\/\/|vpa|secret|pin/i)});
test('selecting UPI cannot activate a merchant while platform payments are disabled',()=>{const b={policiesConfirmed:1,terms:'t'.repeat(50),privacy:'p'.repeat(50),refunds:'r'.repeat(50)},c={status:'connected',mode:'live'};const e={PLATFORM_PAYMENTS_ENABLED:'false',RAZORPAY_PARTNER_APPROVED:'false'};for(const method of ['upi','all']){upiCheckoutConfig(method);assert.equal(merchantPaymentReady(e,b,c),false)}});
