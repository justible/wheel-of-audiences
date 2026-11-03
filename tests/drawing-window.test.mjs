import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,twoMonths,LEGACY_DRAW_CLOSES_AT} from '../server/classroom.mjs';
function harness(){const data=new Map(),store={async get(k){return data.has(k)?structuredClone(data.get(k)):null;},async setJSON(k,v,o={}){if(o.onlyIfNew&&data.has(k))return {modified:false};data.set(k,structuredClone(v));return {modified:true};},async delete(k){data.delete(k);},async list({prefix}){return {blobs:[...data.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))};}},handler=createHandler(()=>store);return {data,async call(body){const response=await handler(new Request('https://local.test/classroom',{method:'POST',body:JSON.stringify(body)}));return {status:response.status,data:await response.json()};},read(room,extra=''){return handler(new Request('https://local.test/classroom?room='+room+extra));}};}
test('new classes close new joins and spins after two calendar months while preserving queue, profiles, and exports',async()=>{
const original=Date.now;let now=Date.UTC(2026,10,3,20);Date.now=()=>now;
try{const {call,read,data}=harness();const {room,token:admin}=(await call({action:'create',password:'local-window-pass'})).data;const initial=await (await read(room)).json();assert.equal(initial.drawClosesAt,twoMonths(now));assert.equal(initial.drawingOpen,true);
const selectedKeys=['age','income','education','fandom'],owner='a'.repeat(48);let joined=(await call({action:'join',room,owner,name:'Absent student',selectedKeys})).data;const drawn=(await call({action:'draw',room,owner,id:joined.id,selectedKeys,configVersion:joined.state.configVersion,context:'none',challenge:'standard'})).data.record;joined=(await call({action:'join',room,owner,name:'Queued before close',selectedKeys})).data;
now=initial.drawClosesAt;assert.equal((await call({action:'join',room,owner,name:'Too late',selectedKeys})).status,409);assert.equal((await call({action:'draw',room,owner,id:joined.id,selectedKeys,configVersion:joined.state.configVersion,context:'none',challenge:'standard'})).status,409);
const closed=await (await read(room)).json();assert.equal(closed.drawingOpen,false);assert.deepEqual(closed.records,[drawn]);assert.equal(closed.queue.length,1);assert.ok((await (await read(room,'&format=csv')).text()).includes('Absent student'));
assert.equal((await call({action:'unlock',room,admin})).status,200);assert.equal((await call({action:'join',room,owner,name:'Still too late',selectedKeys})).status,409);assert.equal(data.get(room+'/room').drawClosesAt,initial.drawClosesAt);
}finally{Date.now=original;}
});
test('existing classes have a fixed make-up deadline through January 3 Central, unaffected by visits or lock expiry',async()=>{
const original=Date.now;let now=LEGACY_DRAW_CLOSES_AT-1;Date.now=()=>now;
try{const {call,read,data}=harness();const {room}=(await call({action:'create',password:'local-legacy-pass'})).data;const old=data.get(room+'/room');delete old.drawClosesAt;old.created=Date.UTC(2026,10,2);data.set(room+'/room',old);
let s=await (await read(room)).json();assert.equal(s.drawClosesAt,LEGACY_DRAW_CLOSES_AT);assert.equal(s.drawingOpen,true);const selectedKeys=['age','income','education','fandom'],owner='b'.repeat(48);const j=(await call({action:'join',room,owner,name:'Last-minute student',selectedKeys})).data;assert.equal((await call({action:'draw',room,owner,id:j.id,selectedKeys,configVersion:j.state.configVersion,context:'none',challenge:'standard'})).status,200);
now=LEGACY_DRAW_CLOSES_AT+86400000;s=await (await read(room)).json();assert.equal(s.drawingOpen,false);assert.equal(s.drawClosesAt,LEGACY_DRAW_CLOSES_AT);assert.equal(s.records.length,1);assert.equal((await call({action:'join',room,owner,name:'Late',selectedKeys})).status,409);
now=twoMonths(LEGACY_DRAW_CLOSES_AT)+86400000;s=await (await read(room)).json();assert.equal(s.locked.length,0);assert.equal(s.drawingOpen,false);assert.equal(s.records.length,1);assert.equal(s.drawClosesAt,LEGACY_DRAW_CLOSES_AT);
}finally{Date.now=original;}
});
