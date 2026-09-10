import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function harness(href){
 let request,listener;const queue=[];
 const client={auth:{signInWithOtp:async args=>{request=args;return {error:null};},onAuthStateChange:cb=>{listener=cb;return {};}}};
 const src=readFileSync(new URL('../dist/auth.mjs',import.meta.url),'utf8').replace(/^import .*;\n/,'').replaceAll('export ','');
 const context=vm.createContext({createClient:()=>client,URL,window:{location:{href}},setTimeout:fn=>queue.push(fn)});
 vm.runInContext(src,context);
 return {context,queue,get request(){return request;},emit:session=>listener('SIGNED_IN',session)};
}
test('magic link returns to the client page on Pages and Sites, stripping tokens and query strings',async()=>{
 for(const [input,expected] of [
 ['https://rentas-merata.github.io/training/tools.html?level=base#planner','https://rentas-merata.github.io/training/tools.html'],
 ['https://rentas.aizzuan.chatgpt.site/tools.html#access_token=example','https://rentas.aizzuan.chatgpt.site/tools.html']]){
 const h=harness(input);await h.context.requestEmailLink('runner@example.com',{name:' Runner ',goal:'5k'});
 assert.equal(h.request.options.emailRedirectTo,expected);assert.equal(h.request.options.data.display_name,'Runner');assert.equal(h.request.options.shouldCreateUser,true);
 }
});
test('auth event returns before callback performs database work, avoiding an auth lock',()=>{
 const h=harness('https://rentas-merata.github.io/training/tools.html');let next='not-called';
 h.context.onAuthChange(value=>{next=value;});h.emit({user:{id:'test'}});
 assert.equal(next,'not-called');h.queue.shift()();assert.equal(next.id,'test');
 h.emit(null);h.queue.shift()();assert.equal(next,null);
});
