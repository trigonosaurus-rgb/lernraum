import { z } from 'zod';
export const levels = ['A1','A2','B1','B2','C1','C2'] as const;
export const aspects = ['grammar','vocabulary','reading','writing'] as const;
export const aspectNames = {grammar:'Грамматика', vocabulary:'Словарный запас', reading:'Чтение', writing:'Письмо'};
export const criteria: Record<string,string[]> = {
 grammar:['Порядок слов','Формы и согласование','Времена и модальность','Связь предложений','Предлоги и управление'],
 vocabulary:['Значение в контексте','Активное воспроизведение','Сочетаемость слов','Точность выбора','Перенос в новый контекст'],
 reading:['Основная мысль','Конкретная информация','Логика и связи','Выводы из текста','Позиция автора'],
 writing:['Решение задачи','Связность текста','Грамматическая точность','Лексическая точность','Регистр и оформление'],
};
export const levelDescriptions: Record<string,string> = {A1:'Простые слова, фразы и личная информация',A2:'Повседневные ситуации и короткие связные сообщения',B1:'Знакомые темы, связный текст, объяснение причин и мнений',B2:'Подробные тексты, аргументация и сопоставление позиций',C1:'Сложные тексты, гибкое выражение смысла и точный регистр',C2:'Тонкие смысловые оттенки, сложная структура и высокая точность'};
const wordSchema = z.object({term:z.string().min(1).max(100),translation:z.string().min(1).max(200),lemma:z.string().max(100).optional(),example:z.string().max(500).optional()});
export const taskSchema = z.object({
 id:z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/), type:z.enum(['choice','cloze','order','correction','reading','writing','recall']),
 level:z.enum(levels), aspect:z.enum(aspects), criterion:z.number().int().min(0).max(4),
 prompt:z.string().min(1).max(4000), instruction:z.string().max(1000).optional(),
 options:z.array(z.string().max(500)).min(2).max(8).optional(), answers:z.array(z.string().min(1).max(2000)).max(20).optional(),
 tokens:z.array(z.string().max(100)).min(2).max(30).optional(), text:z.string().max(15000).optional(), glossary:z.array(wordSchema).max(200).optional(),
 explanation:z.string().min(1).max(3000),hint:z.string().max(1000).optional(),word:wordSchema.optional(),
 minWords:z.number().int().min(1).max(500).optional(), topicId:z.string().max(80).optional(),
}).superRefine((t,c)=>{
 if(t.type!=='writing'&&!t.answers?.length)c.addIssue({code:'custom',message:'Нужен ключ ответа'});
 if(['choice','reading'].includes(t.type)&&(!t.options||!t.answers?.every(a=>t.options!.includes(a))))c.addIssue({code:'custom',message:'Ответ должен быть среди вариантов'});
 if(t.type==='order'&&!t.tokens)c.addIssue({code:'custom',message:'Нужны слова для сборки'});
 if(t.type==='reading'&&!t.text)c.addIssue({code:'custom',message:'Нужен текст'});
 if(t.type==='recall'&&!t.word)c.addIssue({code:'custom',message:'Нужно слово'});
 if(t.type==='writing'&&t.aspect!=='writing')c.addIssue({code:'custom',message:'Свободное письмо относится к writing'});
});
export const lessonSchema=z.object({id:z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),title:z.string().min(1).max(200),description:z.string().max(1000),purpose:z.enum(['diagnostic','practice','checkpoint']),tasks:z.array(taskSchema).min(1).max(60)}).superRefine((l,c)=>{if(new Set(l.tasks.map(t=>t.id)).size!==l.tasks.length)c.addIssue({code:'custom',message:'ID заданий должны быть уникальны'});});
export type Task=z.infer<typeof taskSchema>;
export type Lesson=z.infer<typeof lessonSchema>;
export type Attempt={id:string;lessonId:string;taskId:string;type:Task['type'];level:string;aspect:string;criterion:number;answer:string;at:string;day:string;ms:number;hint:boolean;score:number|null;correct:boolean|null;word?:Task['word'];topicId?:string;review?:Review;};
export const reviewSchema=z.object({attemptId:z.string(),rubric:z.object({task:z.number().int().min(0).max(4),coherence:z.number().int().min(0).max(4),grammar:z.number().int().min(0).max(4),vocabulary:z.number().int().min(0).max(4)}),evidence:z.object({task:z.string().min(5).max(1500),coherence:z.string().min(5).max(1500),grammar:z.string().min(5).max(1500),vocabulary:z.string().min(5).max(1500)}),feedback:z.string().min(10).max(5000),corrected:z.string().max(5000)});
export type Review=z.infer<typeof reviewSchema>;
export type Word={term:string;translation:string;lemma?:string;example?:string;added:string;};
export const roadmapSchema=z.object({topics:z.array(z.object({id:z.string().min(1).max(80),title:z.string().min(1).max(200),level:z.enum(levels),aspect:z.enum(aspects),criterion:z.number().int().min(0).max(4),reason:z.string().max(1000),prerequisites:z.array(z.string()).max(10)})).max(100)}).superRefine((r,c)=>{const ids=r.topics.map(t=>t.id);if(new Set(ids).size!==ids.length||r.topics.some(t=>t.prerequisites.some(p=>!ids.includes(p)||p===t.id)))c.addIssue({code:'custom',message:'Проверьте уникальные ID и зависимости'});const visiting=new Set<string>(),done=new Set<string>();const visit=(id:string):boolean=>{if(visiting.has(id))return false;if(done.has(id))return true;visiting.add(id);if(r.topics.find(t=>t.id===id)?.prerequisites.some(p=>!visit(p)))return false;visiting.delete(id);done.add(id);return true;};if(ids.some(id=>!visit(id)))c.addIssue({code:'custom',message:'Цикл зависимостей'});});
export type Roadmap=z.infer<typeof roadmapSchema>;
export type Snapshot={lessons:Lesson[];attempts:Attempt[];words:Word[];roadmap:Roadmap;};
export const emptySnapshot:Snapshot={lessons:[],attempts:[],words:[],roadmap:{topics:[]}};
export function dayKey(date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
export function normalize(s:string){return s.trim().normalize('NFC').replace(/\s+/g,' ').replace(/[.!?]+$/,'');}
export function scoreAnswer(task:Task,answer:string){return task.type==='writing'?null:task.answers!.some(a=>normalize(a)===normalize(answer))?1:0;}
export function evidence(attempts:Attempt[],level:string,aspect:string,criterion:number){
 const all=attempts.filter(a=>!a.lessonId.startsWith('review-')&&a.level===level&&a.aspect===aspect&&a.criterion===criterion&&a.score!==null).sort((a,b)=>a.at.localeCompare(b.at));
 const seen=new Set<string>();const unique=all.filter(a=>{const k=a.lessonId+':'+a.taskId+':'+a.day;if(seen.has(k))return false;seen.add(k);return !a.hint;}).slice(-10);
 const days=new Set(unique.map(a=>a.day)).size,items=new Set(unique.map(a=>a.lessonId+':'+a.taskId)).size;
 const accuracy=unique.length?unique.reduce((s,a)=>s+a.score!,0)/unique.length:0;
 const delayed=unique.some(a=>a.score!>=.8&&all.some(b=>!b.hint&&b.at<a.at&&Date.parse(a.at)-Date.parse(b.at)>=48*3600000));
 const score=Math.round(100*accuracy*Math.min(items/5,1)*Math.min(days/3,1)*(delayed?1:.7));
 return {score:unique.length?score:null,accuracy,items,days,delayed,n:unique.length};
}
export function wordState(word:Word,attempts:Attempt[],now=Date.now()){
 const rows=attempts.filter(a=>(a.word?.lemma||a.word?.term)===(word.lemma||word.term)&&a.type==='recall'&&a.score!==null).sort((a,b)=>a.at.localeCompare(b.at));
 let interval=0,ease=2.3,streak=0,lastDay='',streakStart='';let consecutiveDays:string[]=[];
 for(const a of rows){if(a.correct&&!a.hint){if(a.day!==lastDay||streak===0){streak++;if(streak===1)streakStart=a.at;consecutiveDays.push(a.day);interval=streak===1?1:streak===2?3:Math.min(180,Math.max(1,Math.round(interval*ease)));ease=Math.min(2.7,ease+(a.ms<12000?.05:0));}}else{interval=0;streak=0;consecutiveDays=[];streakStart='';ease=Math.max(1.3,ease-.2);}lastDay=a.day;}
 const last=rows.at(-1);const due=last?Date.parse(last.at)+(interval?interval*86400000:600000):Date.parse(word.added);
 const known=streak>=3&&new Set(consecutiveDays).size>=3&&!!last&&Date.parse(last.at)-Date.parse(streakStart)>=7*86400000;
 return {interval,streak,due,known,status:known?'Устойчиво знаю':rows.length?'Учу':'Новое',overdue:due<=now,n:rows.length};
}
