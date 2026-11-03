const assert = require('node:assert/strict');
const test = require('node:test');
const { Buffer } = require('node:buffer');
const { generateKeyPairSync, sign } = require('node:crypto');
const { main, validateTarget, verifyExpiredSignature, LIVE_PROJECT_REF } = require('./run-manager-verification-hosted.cjs');
const ref = 'abcdefghijklmnopqrst';
function fixture() {
  const url = `https://${ref}.supabase.co`;
  const claims = Buffer.from(JSON.stringify({ iss: `${url}/auth/v1`, exp: 1, sub:'10000000-0000-4000-8000-000000000001' })).toString('base64url');
  return { H13_STAGING_REF:ref, H13_APPROVED_STAGING_REF:ref, H13_STAGING_URL:url, H13_ALLOW_STAGING_MUTATIONS:'I_APPROVE_ISOLATED_H13_TESTS', H13_STAGING_PUBLISHABLE_KEY:'synthetic-public', H13_STAGING_SERVER_KEY:'synthetic-server', H13_STAGING_MANAGEMENT_TOKEN:'synthetic-management', H13_STAGING_EXPIRED_JWT:`synthetic.${claims}.synthetic` };
}
test('hosted runner refuses the real CampusStay reference even with mutation opt-in', async () => {
  let calls=0; const env={...fixture(),H13_STAGING_REF:LIVE_PROJECT_REF,H13_APPROVED_STAGING_REF:LIVE_PROJECT_REF,H13_STAGING_URL:`https://${LIVE_PROJECT_REF}.supabase.co`};
  await assert.rejects(main(['--run'],env,async()=>{calls++;}),/Refuse production/); assert.equal(calls,0);
});
test('hosted runner refuses missing approval, credentials and mismatched target before network work', async () => {
  const variants=[{H13_ALLOW_STAGING_MUTATIONS:''},{H13_APPROVED_STAGING_REF:'different'},{H13_STAGING_MANAGEMENT_TOKEN:''},{H13_STAGING_SERVER_KEY:''},{H13_STAGING_URL:`https://${LIVE_PROJECT_REF}.supabase.co`},{H13_STAGING_URL:`https://${ref}.supabase.co/`},{H13_STAGING_URL:`http://${ref}.supabase.co`}];
  for(const patch of variants){let calls=0; await assert.rejects(main(['--run'],{...fixture(),...patch},async()=>{calls++;})); assert.equal(calls,0);}
});
test('expired-token fixture must be expired and issued by the same staging Auth service', () => {
  for(const claims of [{iss:`https://${LIVE_PROJECT_REF}.supabase.co/auth/v1`,exp:1},{iss:fixture().H13_STAGING_URL+'/auth/v1',exp:Date.now()/1000+3600}]){
    const jwt=`synthetic.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.synthetic`;
    assert.throws(()=>validateTarget({...fixture(),H13_STAGING_EXPIRED_JWT:jwt}),/Expired JWT/);
  }
});
test('only an exact explicit run passes validated staging configuration to the runner', async () => {
  let calls=0; await main(['--run'],fixture(),async(config)=>{calls++;assert.equal(config.ref,ref);assert.equal(config.url,fixture().H13_STAGING_URL);}); assert.equal(calls,1);
  await assert.rejects(main(['--run','--force'],fixture(),async()=>{calls++;})); assert.equal(calls,1);
});
test('expiry test refuses fabricated JWT signatures even if issuer and expiry look correct', () => {
  const {publicKey,privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
  const header=Buffer.from(JSON.stringify({alg:'ES256',kid:'synthetic-signing-key'})).toString('base64url');
  const payload=fixture().H13_STAGING_EXPIRED_JWT.split('.')[1], body=`${header}.${payload}`;
  const signature=sign('sha256',Buffer.from(body),{key:privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url');
  const jwks={keys:[{...publicKey.export({format:'jwk'}),kid:'synthetic-signing-key'}]};
  assert.doesNotThrow(()=>verifyExpiredSignature(`${body}.${signature}`,jwks));
  assert.throws(()=>verifyExpiredSignature(`${body}.fabricated`,jwks),/genuine signature/);
  assert.throws(()=>verifyExpiredSignature(`${body}.${signature}`,{keys:[]}),/genuine signature/);
});
