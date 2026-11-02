import test from 'node:test';
import assert from 'node:assert/strict';
import {upgradeConfig} from '../server/config.mjs';
test('removing gender preserves customized wheels and clamps the required minimum',()=>{
  const source={catalogVersion:2,required:2,dimensions:[{key:'gender',label:'Gender identity',options:['Original value']},{key:'fandom',label:'Custom fandoms',options:['Instructor surprise']}]};
  const migrated=upgradeConfig(source);
  assert.equal(migrated.dimensions.length,1);assert.equal(migrated.required,1);
  assert.deepEqual(migrated.dimensions[0],source.dimensions[1]);assert.equal(source.dimensions.length,2);
  assert.deepEqual(upgradeConfig(migrated),migrated);
});
