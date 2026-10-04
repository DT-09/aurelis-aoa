import { verifyOutcome } from '../../lib/verifier.js';

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const result = verifyOutcome(body.contract || {}, body.trace || {});
    return Response.json(result, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return Response.json({ ok:false, error:'Invalid verification request', detail:String(error?.message || error) }, { status:400 });
  }
}
