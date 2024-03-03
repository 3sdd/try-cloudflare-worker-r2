/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	AUTH_KEY_SECRET:string
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;
}

const ALLOW_LIST=['cat-pic.jpg']

const hasValidHeader=(request: Request,env:Env)=>{
	return request.headers.get('X-Custom-Auth-Key') === env.AUTH_KEY_SECRET;
}

function authorizeRequest(request:Request, env:Env, key: string){
	switch(request.method){
		case 'PUT':
		case 'DELETE':
			return hasValidHeader(request,env)
		case 'GET':
			return ALLOW_LIST.includes(key)
		default:
			return false;
	}
}
export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url=new URL(request.url);
		const key=url.pathname.slice(1)

		if(!authorizeRequest(request,env,key)){
			return new Response('Forbidden',{status:403})
		}
		switch(request.method){
			case 'PUT':
				const obj=await env.MY_BUCKET.put(key,request.body,{
					httpMetadata:request.headers
				});
        return new Response(`Put ${key} successfully!`,{
					headers:{
						'etag':obj.httpEtag
					}
				});
			case 'GET':
				const object=await env.MY_BUCKET.get(key)

				if(object===null){
					return new Response('Object not found',{status:404})
				}

				const headers=new Headers();
				object.writeHttpMetadata(headers)
				headers.set('etag',object.httpEtag)

				return new Response(object.body,{
					headers,
				})


			case 'DELETE':
				await env.MY_BUCKET.delete(key)
				return new Response('Deleted');
			default:
				return new Response('Method Not Allowed',{
					status:405,
					headers:{
						Allow:'PUT, GET, DELETE'
					}
				})

		}
	},
};
