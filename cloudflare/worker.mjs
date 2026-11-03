import {DurableObject} from 'cloudflare:workers';
import {createHandler} from '../server/classroom.mjs';

export function allowedOrigin(request,env){
  const origin=request.headers.get('Origin');
  return origin&&(env.ALLOWED_ORIGINS||'').split(',').includes(origin)?origin:null;
}
function cors(response,origin){
  const headers=new Headers(response.headers);
  if(origin)headers.set('Access-Control-Allow-Origin',origin);
  headers.set('Vary','Origin');
  headers.set('Access-Control-Allow-Headers','Content-Type, X-Audience-Owner');
  headers.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  headers.set('Access-Control-Max-Age','86400');
  headers.set('Cache-Control','no-store');
  return new Response(response.body,{status:response.status,headers});
}

export default {
  async fetch(request,env){
    const url=new URL(request.url),origin=allowedOrigin(request,env);
    if(url.pathname==='/health')return Response.json({service:'wheel-of-audiences',storage:'durable',version:1});
    if(request.headers.has('Origin')&&!origin)return new Response('Origin not allowed',{status:403});
    if(request.method==='OPTIONS')return cors(new Response(null,{status:204}),origin);
    if(!['/classroom','/events','/migration'].includes(url.pathname))return new Response('Not found',{status:404});
    const stub=env.CLASSROOMS.get(env.CLASSROOMS.idFromName('audience-classrooms-v1'));
    // Only this public router applies CORS. The room handler retains its same-origin check.
    const headers=new Headers(request.headers);headers.delete('Origin');headers.delete('X-Audience-Migration');
    if(url.pathname==='/migration'){
      if(!env.MIGRATION_KEY||request.headers.get('Authorization')!=='Bearer '+env.MIGRATION_KEY)return new Response('Not found',{status:404});
      headers.delete('Authorization');headers.set('X-Audience-Migration','authorized');
    }
    const response=await stub.fetch(new Request(request,{headers}));
    return response.status===101?response:cors(response,origin);
  }
};

export class Classrooms extends DurableObject {
  constructor(ctx,env){
    super(ctx,env);this.ctx=ctx;this.env=env;
    this.handler=createHandler(()=>({
      get:async key=>(await ctx.storage.get(key))??null,
      setJSON:async(key,value,options={})=>{
        if(options.onlyIfNew&&(await ctx.storage.get(key))!==undefined)return {modified:false};
        await ctx.storage.put(key,value);return {modified:true};
      },
      delete:key=>ctx.storage.delete(key),
      list:async({prefix})=>({blobs:[...(await ctx.storage.list({prefix})).keys()].map(key=>({key}))})
    }));
  }
  async fetch(request){
    const url=new URL(request.url);
    if(url.pathname==='/events'){
      const room=url.searchParams.get('room');
      if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket'||!/^[a-f0-9]{24}$/.test(room||''))return new Response('Invalid subscription',{status:400});
      if(!await this.ctx.storage.get(room+'/room'))return new Response('Class not found',{status:404});
      const pair=new WebSocketPair();this.ctx.acceptWebSocket(pair[1],[room]);
      return new Response(null,{status:101,webSocket:pair[0]});
    }
    // Serialize complete operations, including claims and snapshots, across devices.
    return this.ctx.blockConcurrencyWhile(async()=>{
      if(url.pathname==='/migration')return this.migration(request);
      let room=url.searchParams.get('room'),action;
      if(request.method==='POST'){
        if(Number(request.headers.get('content-length')||0)>300000)return Response.json({error:'Request too large.'},{status:413});
        const body=await request.clone().text();
        if(body.length>300000)return Response.json({error:'Request too large.'},{status:413});
        try{const data=JSON.parse(body);room=data.room;action=data.action;}catch{return Response.json({error:'Invalid request.'},{status:400});}
      }
      const response=await this.handler(request);
      if(response.ok&&request.method==='POST'&&room&&action!=='find-sessions'){
        for(const socket of this.ctx.getWebSockets(room))try{socket.send('changed');}catch{}
      }
      return response;
    });
  }
  async migration(request){
    // Temporary deployment-only secret; removed once imported data is verified.
    // The public router checks its current secret binding and strips caller-supplied markers.
    // This avoids keeping a rotated secret in a long-lived object's environment.
    if(request.headers.get('X-Audience-Migration')!=='authorized')return new Response('Not found',{status:404});
    if(request.method==='GET')return Response.json({entries:[...(await this.ctx.storage.list()).entries()]});
    if(request.method!=='POST')return new Response('Method not allowed',{status:405});
    const {entries}=await request.json();
    if(!Array.isArray(entries)||entries.some(e=>!Array.isArray(e)||e.length!==2||!/^([a-f0-9]{24})\//.test(e[0])))return new Response('Invalid archive',{status:400});
    if((await this.ctx.storage.list({limit:1})).size)return new Response('Import requires empty storage',{status:409});
    await this.ctx.storage.transaction(async txn=>{for(const [key,value] of entries)await txn.put(key,value);});
    return Response.json({imported:entries.length});
  }
  webSocketMessage(){}
  webSocketClose(socket,code,reason){socket.close(code===1005?1000:code,reason);}
  webSocketError(socket){socket.close(1011,'Reconnect');}
}
