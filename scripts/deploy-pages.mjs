#!/usr/bin/env node
/** Explicit static publication for a source-validated preview; no workflow token. */
import { mkdtemp, cp, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const args=process.argv.slice(2),at=args.indexOf('--repo'),repo=at<0?null:args[at+1];
if(!repo||!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/.test(repo))throw new Error('Pass --repo https://github.com/OWNER/REPOSITORY.git explicitly.');
const run=(command,parameters,cwd=root)=>{
  const result=spawnSync(command,parameters,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  if(result.status!==0)throw new Error(result.stderr||result.stdout||`${command} failed.`);
  return result.stdout.trim();
};
await access(resolve(root,'dist/showcase/index.html'));
const revision=run('git',['rev-parse','HEAD']);
const directory=await mkdtemp(join(tmpdir(),'annora-pages-'));
try{
  await cp(resolve(root,'dist'),directory,{recursive:true});
  await writeFile(join(directory,'.nojekyll'),'');
  await writeFile(join(directory,'release.json'),JSON.stringify({sourceRevision:revision,builtAt:new Date().toISOString(),sourceRepository:repo.replace(/\.git$/,'')},null,2)+'\n');
  run('git',['init','--initial-branch=gh-pages'],directory);
  run('git',['add','.'],directory);
  run('git',['commit','-m',`Publish validated showcase ${revision.slice(0,7)}`],directory);
  run('git',['remote','add','origin',repo],directory);
  // Extend existing publication history when present; no force push is needed.
  const existing=run('git',['-c','credential.helper=','-c','credential.helper=!gh auth git-credential','ls-remote','--heads','origin','gh-pages'],directory);
  if(existing){
    run('git',['-c','credential.helper=','-c','credential.helper=!gh auth git-credential','fetch','origin','gh-pages'],directory);
    run('git',['reset','--soft','FETCH_HEAD'],directory);
    run('git',['commit','--allow-empty','-m',`Publish validated showcase ${revision.slice(0,7)}`],directory);
  }
  console.log(run('git',['-c','credential.helper=','-c','credential.helper=!gh auth git-credential','push','origin','HEAD:gh-pages'],directory)||`Published ${revision.slice(0,7)} to ${repo}.`);
}finally{await rm(directory,{recursive:true,force:true});}
