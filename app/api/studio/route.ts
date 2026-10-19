import { z } from 'zod';
import { addWord, publicSnapshot, snapshot, startReview, submit } from '../../../lib/server';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const owner=req.headers.get('oai-authenticated-user-id');
 if(!owner)return Response.json({error:'Войдите через ChatGPT, чтобы сохранять результаты.'},{status:401});
 try{return Response.json(publicSnapshot(await snapshot(owner)),{headers:{'Cache-Control':'no-store'}});}
 catch{return Response.json({error:'Не удалось загрузить данные. Попробуйте ещё раз.'},{status:503});}
}
export async function POST(req:Request){
 const owner=req.headers.get('oai-authenticated-user-id');
 if(!owner)return Response.json({error:'Сначала войдите через ChatGPT.'},{status:401});
 const origin=req.headers.get('origin');
 if(origin&&origin!==new URL(req.url).origin)return Response.json({error:'Неверный источник запроса'},{status:403});
 try{const {action,data}=z.object({action:z.enum(['submit','word','repeat']),data:z.unknown().optional()}).parse(await req.json());
 const result=action==='submit'?await submit(owner,data):action==='word'?await addWord(owner,data):await startReview(owner);
 return Response.json(result);
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Ошибка сохранения'},{status:400});}
}
