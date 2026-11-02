import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../cloudflare/import-browser-state.js',import.meta.url),'utf8');
const storage=initial=>{const map=new Map(Object.entries(initial||{}));return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),map};};
function importState(data,initial={}){
  const local=storage(initial),session=storage(),location={hash:'#browser-migration='+encodeURIComponent(JSON.stringify(data)),pathname:'/wheel-of-audiences/',search:'?room='+'a'.repeat(24)};
  let cleaned;
  vm.runInNewContext(source,{location,localStorage:local,sessionStorage:session,history:{replaceState:(_a,_b,url)=>{cleaned=url;}},console:{warn(){}}});
  return {local,session,cleaned};
}
test('old-site browser transfer preserves queue ownership and templates without overwriting newer settings',()=>{
  const result=importState({version:1,local:[['audience-owner-room','owner-token'],['audience-wheel-template-v1','older'],['wheel-audiences-v2','local-snapshots'],['unrelated','ignore']],session:[['audience-admin-room','instructor-token']]},{'audience-wheel-template-v1':'newer'});
  assert.equal(result.local.getItem('audience-owner-room'),'owner-token');
  assert.equal(result.local.getItem('audience-wheel-template-v1'),'newer');
  assert.equal(result.local.getItem('wheel-audiences-v2'),'local-snapshots');
  assert.equal(result.local.getItem('unrelated'),null);
  assert.equal(result.session.getItem('audience-admin-room'),'instructor-token');
  assert.equal(result.cleaned,'/wheel-of-audiences/?room='+'a'.repeat(24));
});
test('invalid browser transfer is discarded and removed from the URL',()=>{
  const result=importState({version:9,local:[['audience-owner-room','invalid']],session:[]});
  assert.equal(result.local.map.size,0);assert.ok(!result.cleaned.includes('browser-migration'));
});
