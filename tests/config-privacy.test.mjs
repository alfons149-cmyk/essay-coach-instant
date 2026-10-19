import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../js/config.js',import.meta.url),'utf8');
const expected='https://essaycoach.alfons149.workers.dev/api';
for(const api of ['https://attacker.invalid/collect','https://essaycoach.alfons149.workers.dev.attacker.invalid/api','https://user:password@essaycoach.alfons149.workers.dev/api','https://essaycoach.alfons149.workers.dev/api?token=secret','javascript:alert(1)',expected+'/']){
 const context={location:{search:'?api='+encodeURIComponent(api)},URLSearchParams,URL,window:{},console:{log(){}}};vm.runInNewContext(source,context);
 assert.equal(context.window.EC.API_BASE,expected);
}
console.log('PASS query links cannot redirect essays to arbitrary endpoints or embed credentials');
