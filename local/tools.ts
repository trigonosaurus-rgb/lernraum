import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createLesson, progress, reviewWriting, setRoadmap } from '../lib/server.ts';
import { LOCAL_OWNER, projectRoot } from './database.ts';
import { tools as definitions } from './tool-definitions.ts';
export const tools=[{name:'get_teacher_instructions',description:'Read the model-independent teaching instructions and data contract before teaching this learner.',inputSchema:{type:'object',properties:{},additionalProperties:false}},...definitions];
export async function callTool(name:string,args:unknown={}){
 switch(name){
 case 'get_teacher_instructions':return {instruction:readFileSync(resolve(projectRoot,'TEACHER_PROMPT.md'),'utf8'),protocol:readFileSync(resolve(projectRoot,'TEACHING.md'),'utf8')};
 case 'get_learning_progress':return progress(LOCAL_OWNER);
 case 'create_lesson':return createLesson(LOCAL_OWNER,args);
 case 'review_writing':return reviewWriting(LOCAL_OWNER,args);
 case 'set_learning_roadmap':return setRoadmap(LOCAL_OWNER,args);
 default:throw new Error('Неизвестный инструмент: '+name);
 }
}
