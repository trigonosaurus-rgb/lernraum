import { readFile } from 'node:fs/promises';
import { callTool, tools } from './tools.ts';

// Portable CLI bridge: no model SDK, account, network or running web server required.
async function main(){
 const [name,file]=process.argv.slice(2);
 if(name==='list'){console.log(JSON.stringify({tools},null,2));return;}
 if(!name)throw new Error('Usage: node local/teacher.ts <tool> [input.json | -]');
 let args:unknown={};
 if(file==='-'){let text='';for await(const chunk of process.stdin){text+=chunk;if(text.length>2_000_000)throw new Error('Input too large');}args=JSON.parse(text);}
 else if(file)args=JSON.parse((await readFile(file,'utf8')).replace(/^\uFEFF/,''));
 console.log(JSON.stringify(await callTool(name,args),null,2));
}
main().catch(e=>{console.error(JSON.stringify({error:e.message}));process.exitCode=1;});
