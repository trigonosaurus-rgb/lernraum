import { createInterface } from 'node:readline';
import { callTool, tools } from './tools.ts';
const lines=createInterface({input:process.stdin,crlfDelay:Infinity});
// MCP stdio uses one UTF-8 JSON-RPC message per line. Keep all diagnostics off stdout.
for await(const line of lines){
 let id:unknown=null;
 try{
  if(line.length>2_000_000)throw new Error('Request too large');
  const message=JSON.parse(line);id=message.id;
  if(!message.method||message.jsonrpc!=='2.0')throw new Error('Invalid request');
  if(id===undefined)continue;
  let result:unknown;
  switch(message.method){
  case 'initialize': result={protocolVersion:['2025-11-25','2025-06-18','2025-03-26','2024-11-05'].includes(message.params?.protocolVersion)?message.params.protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'lernraum-local',version:'0.2.0'},instructions:'Call get_teacher_instructions and get_learning_progress before planning lessons. This server stores data only on this computer.'};break;
  case 'ping':result={};break;
  case 'tools/list':result={tools};break;
  case 'tools/call':try{result={content:[{type:'text',text:JSON.stringify(await callTool(message.params.name,message.params.arguments||{}))}]};}catch(e){result={isError:true,content:[{type:'text',text:(e as Error).message}]};}break;
  default:process.stdout.write(JSON.stringify({jsonrpc:'2.0',id,error:{code:-32601,message:'Method not found'}})+'\n');continue;
  }
  process.stdout.write(JSON.stringify({jsonrpc:'2.0',id,result})+'\n');
 }catch(e){process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:id??null,error:{code:-32600,message:(e as Error).message}})+'\n');}
}
