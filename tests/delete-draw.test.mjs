import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../server/classroom.mjs';
function harness(){const data=new Map(),store={async get(k){return data.get(k)?structuredClone(data.get(k)):null;},async setJSON(k,v,o={}){if(o.onlyIfNew&&data.has(k))return {modified:false};data.set(k,structuredClone(v));return {modified:true};},async delete(k){data.delete(k);},async list({prefix}){return {blobs:[...data.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))};}},handler=createHandler(()=>store);return {data,async call(body){const r=await handler(new Request('https://local.test/classroom',{method:'POST',body:JSON.stringify(body)}));return {status:r.status,data:await r.json()};}};}
test('only instructors can delete a chosen older draw, release its combination, and preserve other draws and queue places',async()=>{
  const {call,data}=harness(),selectedKeys=['fandom'];
  const config={catalogVersion:3,required:1,dimensions:[{key:'fandom',label:'Fandom',options:['A','B']}]};
  const {room,token:admin}=(await call({action:'create',password:'local-test-only',config})).data;
  const join=async(owner,name)=>call({action:'join',room,owner,name,selectedKeys});
  const draw=async(owner,j)=>call({action:'draw',room,owner,id:j.data.id,configVersion:j.data.state.configVersion,selectedKeys,context:'none',challenge:'standard'});
  const ownerA='a'.repeat(48),ownerB='b'.repeat(48),ownerC='c'.repeat(48);
  const a=await join(ownerA,'First'),first=await draw(ownerA,a);
  const b=await join(ownerB,'Second'),second=await draw(ownerB,b);
  const c=await join(ownerC,'Waiting');
  assert.equal((await call({action:'delete-draw',room,id:a.data.id})).status,403);
  assert.equal((await call({action:'delete-draw',room,id:a.data.id,owner:ownerA})).status,403);
  const removed=await call({action:'delete-draw',room,id:a.data.id,admin});
  assert.equal(removed.status,200);assert.deepEqual(removed.data.records.map(r=>r.id),[second.data.record.id]);
  assert.deepEqual(removed.data.queue.map(q=>q.id),[c.data.id]);assert.equal(removed.data.locked.length,1);
  assert.ok(data.has(room+'/draws/'+a.data.id),'original snapshot is retained behind the deletion marker');
  const reused=await draw(ownerC,c);assert.equal(reused.status,200);assert.equal(reused.data.record.audienceId,first.data.record.audienceId);
  assert.equal((await call({action:'delete-draw',room,id:a.data.id,admin})).status,404);
});
test('deleting a draw from an older lock period never releases a newer claim',async()=>{
  const {call}=harness(),selectedKeys=['fandom'],owner='a'.repeat(48);
  const config={catalogVersion:3,required:1,dimensions:[{key:'fandom',label:'Fandom',options:['Only choice']}]};
  const {room,token:admin}=(await call({action:'create',password:'local-test-only',config})).data;
  const make=async()=>{const j=await call({action:'join',room,owner,name:'Student',selectedKeys});return call({action:'draw',room,owner,id:j.data.id,configVersion:j.data.state.configVersion,selectedKeys,context:'none',challenge:'standard'});};
  const earlier=await make();await call({action:'unlock',room,admin});const current=await make();
  const removed=await call({action:'delete-draw',room,id:earlier.data.record.id,admin});
  assert.equal(removed.status,200);assert.equal(removed.data.locked.length,1);assert.equal(removed.data.records[0].id,current.data.record.id);
});
