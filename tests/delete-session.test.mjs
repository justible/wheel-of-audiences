import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../server/classroom.mjs';
function harness(){const data=new Map(),store={async get(k){return data.has(k)?structuredClone(data.get(k)):null;},async setJSON(k,v,o={}){if(o.onlyIfNew&&data.has(k))return {modified:false};data.set(k,structuredClone(v));return {modified:true};},async delete(k){data.delete(k);},async list({prefix}){return {blobs:[...data.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))};}},handler=createHandler(()=>store);return {data,async call(body){const r=await handler(new Request('https://local.test/classroom',{method:'POST',body:JSON.stringify(body)}));return {status:r.status,data:await r.json()};},async read(room){const r=await handler(new Request('https://local.test/classroom?room='+room));return {status:r.status,data:await r.json()};}};}
test('session deletion requires instructor access, closes the link, preserves other sessions, and can be restored',async()=>{
  const {call,read,data}=harness(),selectedKeys=['age','income','education','fandom'],owner='a'.repeat(48);
  const {room,token:admin}=(await call({action:'create',name:'Practice',password:'local-test-only'})).data;
  const other=(await call({action:'create',name:'Keep this class',password:'another-local-password'})).data.room;
  const j=(await call({action:'join',room,owner,name:'Student',selectedKeys})).data;
  const drawn=await call({action:'draw',room,owner,id:j.id,selectedKeys,configVersion:j.state.configVersion,context:'none',challenge:'standard'});
  const waiting=(await call({action:'join',room,owner:'b'.repeat(48),name:'Waiting student',selectedKeys})).data;
  assert.equal((await call({action:'delete-session',room,owner})).status,403);
  assert.equal((await call({action:'delete-session',room,admin})).status,200);
  assert.equal((await read(room)).status,410);
  assert.equal((await read(other)).status,200);
  assert.equal((await call({action:'join',room,owner,name:'Blocked',selectedKeys})).status,410);
  assert.equal((await call({action:'restore-session',room})).status,403);
  assert.equal((await call({action:'login',room,password:'local-test-only'})).data.token,admin);
  const restored=await call({action:'restore-session',room,admin});assert.equal(restored.status,200);
  assert.deepEqual(restored.data.records,[drawn.data.record]);assert.equal(restored.data.queue[0].id,waiting.id);assert.equal(restored.data.locked.length,1);
  assert.ok(data.has(room+'/draws/'+j.id));assert.equal((await read(room)).status,200);
});
test('an in-progress spin blocks session deletion',async()=>{
  const {call,data,read}=harness();const {room,token:admin}=(await call({action:'create',password:'local-test-only'})).data;
  data.set(room+'/draws/pending',{pending:true,id:'pending',time:Date.now()});
  assert.equal((await call({action:'delete-session',room,admin})).status,409);assert.equal((await read(room)).status,200);
});
