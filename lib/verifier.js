function same(a,b){return JSON.stringify(a)===JSON.stringify(b)}
function val(obj,path){return path.split('.').reduce((x,k)=>x==null?undefined:x[k],obj)}

export function verifyOutcome(contract = {}, trace = {}) {
  const events = Array.isArray(trace.events) ? [...trace.events].sort((a,b)=>(a.seq??0)-(b.seq??0)) : [];
  const findings=[]; const evidence=[];
  const required=Array.isArray(contract.required_actions)?contract.required_actions:[];
  const forbidden=Array.isArray(contract.forbidden_actions)?contract.forbidden_actions:[];
  const add=(severity,code,title,detail,ev=[])=>{const item={severity,code,title,detail,evidence:ev};findings.push(item);evidence.push(...ev)};
  const calls=events.filter(e=>e.type==='tool_call'||e.tool).filter(e=>e.tool);

  for(const action of required){
    const matches=calls.filter(e=>e.tool===action);
    if(!matches.length) add('critical','MISSING_REQUIRED_ACTION',`Required action missing: ${action}`,`The contract requires ${action}, but no matching tool call appears in the trace.`);
    else evidence.push({code:'REQUIRED_ACTION_PRESENT',action,seq:matches[0].seq});
  }
  for(const action of forbidden){const matches=calls.filter(e=>e.tool===action);if(matches.length)add('critical','FORBIDDEN_ACTION',`Forbidden action executed: ${action}`,`The contract explicitly forbids ${action}.`,matches.map(e=>({seq:e.seq,tool:e.tool})))}

  const sideEffecting=Array.isArray(contract.single_execution_actions)?contract.single_execution_actions:required;
  for(const action of sideEffecting){const matches=calls.filter(e=>e.tool===action);if(matches.length>1)add('high','DUPLICATE_ACTION',`Duplicate action: ${action}`,`The action occurred ${matches.length} times although the contract permits one occurrence.`,matches.map(e=>({seq:e.seq,tool:e.tool,arguments:e.arguments})))}

  const errors=events.filter(e=>e.type==='error'||e.status==='error'||e.result?.error||e.result?.ok===false);
  for(const e of errors)add('high','EXECUTION_ERROR',`Execution error at step ${e.seq??'?'}`,`The trace contains an error signal, even if the agent later claimed success.`,[{seq:e.seq,type:e.type,tool:e.tool,error:e.error||e.result?.error||e.result}]);

  if(Array.isArray(contract.order)&&contract.order.length>1){
    const positions=new Map();for(const action of contract.order){const e=calls.find(x=>x.tool===action);if(e)positions.set(action,e.seq)}
    for(let i=0;i<contract.order.length-1;i++){const a=contract.order[i],b=contract.order[i+1];if(positions.has(a)&&positions.has(b)&&positions.get(a)>positions.get(b))add('high','ORDER_VIOLATION',`Workflow order violated: ${a} → ${b}`,`${a} occurred after ${b}.`,[{before:a,after:b,seqA:positions.get(a),seqB:positions.get(b)}])}
  }

  // Cross-step identity/data lineage checks: the same business object must survive the workflow.
  const links=Array.isArray(contract.consistency_links)?contract.consistency_links:[];
  for(const link of links){
    const from=calls.find(e=>e.tool===link.from_tool); const to=calls.find(e=>e.tool===link.to_tool);
    if(!from||!to) continue;
    const left=val(from,link.from_path); const right=val(to,link.to_path);
    if(!same(left,right)) add('critical','DATA_LINEAGE_MISMATCH',`Business identity changed: ${link.label||link.from_tool+' → '+link.to_tool}`,`Expected ${link.from_path} to equal ${link.to_path}, but observed ${JSON.stringify(left)} versus ${JSON.stringify(right)}.`,[{from:{tool:from.tool,seq:from.seq,path:link.from_path,value:left},to:{tool:to.tool,seq:to.seq,path:link.to_path,value:right}}]);
  }

  const expected=contract.expected_result&&typeof contract.expected_result==='object'?contract.expected_result:{};
  const actual=trace.final_result&&typeof trace.final_result==='object'?trace.final_result:{};
  for(const [key,v] of Object.entries(expected))if(!same(actual[key],v))add('critical','OUTCOME_MISMATCH',`Business outcome mismatch: ${key}`,`Expected ${JSON.stringify(v)} but observed ${JSON.stringify(actual[key])}.`,[{field:key,expected:v,observed:actual[key]}]);

  const requiredResultFields=Array.isArray(contract.required_result_fields)?contract.required_result_fields:[];
  for(const key of requiredResultFields)if(actual[key]===undefined||actual[key]===null)add('high','MISSING_OUTCOME_EVIDENCE',`Required outcome evidence missing: ${key}`,`The verifier cannot independently establish ${key} from the supplied final result.`,[{field:key}]);

  const claimed=['success','completed','complete'].includes(String(trace.claimed_status||'').toLowerCase());
  if(claimed&&findings.length)add('critical','CLAIMED_SUCCESS_UNVERIFIED','Agent claimed success, but verification found a contradiction.','A success claim is not accepted when the business contract or evidence disagrees.',[{claimed_status:trace.claimed_status}]);

  const critical=findings.filter(f=>f.severity==='critical').length;
  const high=findings.filter(f=>f.severity==='high').length;
  const medium=findings.filter(f=>f.severity==='medium').length;
  const verdict=findings.length===0?'PASS':critical?'FAIL':'PARTIAL';
  const score=Math.max(0,100-critical*28-high*12-medium*5);
  const businessRisk=critical>=2?'HIGH':critical===1||high>=2?'MEDIUM':'LOW';
  const nextStep=verdict==='PASS'?'Release candidate: preserve this trace as a regression baseline.':businessRisk==='HIGH'?'Block acceptance until the failed business contract is corrected and retested.':'Fix the flagged workflow condition, then rerun the generated regression case.';
  return {ok:true,verifier_version:'1.1.0',run_id:trace.run_id||null,workflow:contract.workflow||'unnamed',verdict,score,business_risk:businessRisk,next_step:nextStep,summary:verdict==='PASS'?'The supplied evidence satisfies the workflow contract.':`Independent verification found ${findings.length} issue(s) that prevent unconditional acceptance.`,counts:{events:events.length,findings:findings.length,critical,high,medium},findings,evidence,regression_test:{id:`REG-${String(trace.run_id||'RUN').replace(/[^A-Za-z0-9]/g,'').slice(0,18)}-${Date.now().toString(36).toUpperCase()}`,purpose:'Prevent recurrence of this verified failure.',contract,trigger_trace:trace}}
}
