import { mkdir, cp, readdir, copyFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { build } from 'esbuild';

const root=process.cwd(), output=join(root,'public');
await mkdir(join(output,'assets'),{recursive:true});
await mkdir(join(output,'data'),{recursive:true});
await mkdir(join(output,'docs'),{recursive:true});
for (const entry of await readdir(root, {withFileTypes:true})) {
  if (entry.isFile() && ['.html','.txt','.ico','.webmanifest','.xml'].includes(extname(entry.name))) {
    await copyFile(join(root,entry.name),join(output,entry.name));
  }
}
for (const folder of ['assets','data','docs']) await cp(join(root,folder),join(output,folder),{recursive:true,force:true});
await build({
  entryPoints: [join(root,'src/account-page.js'),join(root,'src/cloud-auto-sync.js')],
  outdir:join(output,'assets'),
  bundle:true,platform:'browser',format:'esm',splitting:true,chunkNames:'chunks/[name]-[hash]',minify:true,target:['es2022'],
  sourcemap:false,logLevel:'warning',
  define:{'process.env.NODE_ENV':JSON.stringify('production')}
});
console.log('Built static SuccessfulFelons site and bundled managed Neon Auth browser client.');
