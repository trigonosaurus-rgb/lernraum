import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { writeFileSync, renameSync, readFileSync, unlinkSync } from 'node:fs';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { resolve, extname, sep } from 'node:path';
import { z } from 'zod';
import { addWord, publicSnapshot, snapshot, startReview, submit } from '../lib/server.ts';
import { LOCAL_OWNER, projectRoot, dataDirectory, sqlite } from './database.ts';
const port=Number(process.env.LERNRAUM_PORT||4177);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid port');
const root=resolve(projectRoot,'dist-local');
const origin=`http://127.0.0.1:${port}`;
const controlToken=randomBytes(32).toString('hex');
const controlFile=resolve(dataDirectory,'server-control.json');
const allowedHosts=new Set([`127.0.0.1:${port}`,`localhost:${port}`]);
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 const json=(body:unknown,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
 if(!allowedHosts.has(req.headers.host||'')){json({error:'Local host only'},403);return;}
 if(req.headers.origin&&!['http://'+req.headers.host].includes(req.headers.origin)){json({error:'Cross-origin access is not allowed'},403);return;}
 try{
  const pathname=new URL(req.url||'/',origin).pathname;
  if(pathname==='/api/health'){json({app:'lernraum-local',version:'0.2.0',storage:'sqlite',local:true});return;}
  if(pathname==='/api/shutdown'&&req.method==='POST'){
   const token=req.headers['x-lernraum-control'];
   if(typeof token!=='string'||token.length!==controlToken.length||!timingSafeEqual(Buffer.from(token),Buffer.from(controlToken))){json({error:'Invalid control token'},403);return;}
   json({ok:true});setImmediate(shutdown);return;
  }
  if(pathname==='/api/teacher-prompt'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/markdown; charset=utf-8','Content-Disposition':'attachment; filename="TEACHER_PROMPT.md"','Cache-Control':'no-store'});res.end(await readFile(resolve(projectRoot,'TEACHER_PROMPT.md')));return;}
  if(pathname==='/api/studio'){
   if(req.method==='GET'){json(publicSnapshot(await snapshot(LOCAL_OWNER)));return;}
   if(req.method!=='POST'){json({error:'Method not allowed'},405);return;}
   if(!req.headers['content-type']?.startsWith('application/json')){json({error:'JSON required'},415);return;}
   let input='';for await(const chunk of req){input+=chunk;if(input.length>2_000_000){json({error:'Request too large'},413);return;}}
   const {action,data}=z.object({action:z.enum(['submit','word','repeat']),data:z.unknown().optional()}).parse(JSON.parse(input));
   json(action==='submit'?await submit(LOCAL_OWNER,data):action==='word'?await addWord(LOCAL_OWNER,data):await startReview(LOCAL_OWNER));return;
  }
  if(!['GET','HEAD'].includes(req.method||'')){json({error:'Method not allowed'},405);return;}
  const path=resolve(root,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));
  if(!path.startsWith(root+sep)){json({error:'Not found'},404);return;}
  try{if(!(await stat(path)).isFile())throw new Error();const bytes=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'none'"});res.end(req.method==='HEAD'?undefined:bytes);}catch{json({error:'Файл не найден. Сначала выполните npm run build.'},404);}
 }catch(e){json({error:(e as Error).message},400);}
});
server.on('error',e=>{console.error(e.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{
 const temporary=controlFile+'.'+process.pid+'.tmp';
 writeFileSync(temporary,JSON.stringify({pid:process.pid,origin,controlToken}));renameSync(temporary,controlFile);
 console.log(`Lernraum: ${origin}`);
});
function shutdown(){server.close(()=>{
 try{const record=JSON.parse(readFileSync(controlFile,'utf8'));if(record.pid===process.pid)unlinkSync(controlFile);}catch{}
 sqlite.close();process.exit();
});server.closeIdleConnections();}
process.on('SIGINT',shutdown);
process.on('SIGTERM',shutdown);
