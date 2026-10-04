import test from 'node:test';import assert from 'node:assert/strict';import {verifyOutcome} from '../lib/verifier.js';import {demoScenario} from '../lib/demo.js';
test('passes correct workflow',()=>{const x=demoScenario('pass');const r=verifyOutcome(x.contract,x.trace);assert.equal(r.verdict,'PASS');assert.equal(r.score,100)});
test('catches silent business failure',()=>{const x=demoScenario('silent-failure');const r=verifyOutcome(x.contract,x.trace);assert.equal(r.verdict,'FAIL');assert.ok(r.findings.some(f=>f.code==='OUTCOME_MISMATCH'))});
test('catches wrong business identity across steps',()=>{const x=demoScenario('wrong-order');const r=verifyOutcome(x.contract,x.trace);assert.ok(r.findings.some(f=>f.code==='DATA_LINEAGE_MISMATCH'));assert.equal(r.verdict,'FAIL')});
test('catches duplicate side effect',()=>{const x=demoScenario('duplicate');const r=verifyOutcome(x.contract,x.trace);assert.ok(r.findings.some(f=>f.code==='DUPLICATE_ACTION'));assert.equal(r.verdict,'FAIL')});
test('generates regression case',()=>{const x=demoScenario('wrong-order');const r=verifyOutcome(x.contract,x.trace);assert.ok(r.regression_test.contract);assert.ok(r.regression_test.trigger_trace)});
