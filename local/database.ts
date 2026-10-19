import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const dataDirectory=resolve(process.env.LERNRAUM_DATA_DIR||resolve(projectRoot,'data'));
mkdirSync(dataDirectory,{recursive:true});
const filename=resolve(dataDirectory,'lernraum.sqlite');
export const sqlite=new DatabaseSync(filename);
sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
sqlite.exec(`CREATE TABLE IF NOT EXISTS records (owner TEXT NOT NULL, kind TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL, created TEXT NOT NULL, PRIMARY KEY(owner,kind,id));
 CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
sqlite.prepare('INSERT OR IGNORE INTO app_meta(key,value) VALUES (?,?)').run('schema_version','1');

// Create one consistent backup per day before the first change. No data is sent anywhere.
let backupDay='';
export function backupBeforeWrite(){
 const day=new Date().toISOString().slice(0,10);if(backupDay===day)return;
 const folder=resolve(dataDirectory,'backups');mkdirSync(folder,{recursive:true});
 const target=resolve(folder,`lernraum-${new Date().toISOString().slice(0,10)}.sqlite`);
 if(!existsSync(target)&&Number((sqlite.prepare('SELECT count(*) AS n FROM records').get() as {n:number}).n)>0)sqlite.prepare('VACUUM INTO ?').run(target);
 backupDay=day;
}
export const database={prepare(sql:string){return {bind(...values:string[]){return {
 async all<T>(){return {results:sqlite.prepare(sql).all(...values) as T[]};},
 async run(){backupBeforeWrite();return sqlite.prepare(sql).run(...values);},
};}};}};
export const LOCAL_OWNER='local';
