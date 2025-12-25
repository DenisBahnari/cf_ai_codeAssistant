import { AssistantDO } from "./AssistantDO";

export { AssistantDO };

export default {
	/**
	 * This is the standard fetch handler for a Cloudflare Worker
	 *
	 * @param request - The request submitted to the Worker from the client
	 * @param env - The interface to reference bindings declared in wrangler.jsonc
	 * @param ctx - The execution context of the Worker
	 * @returns The response to be sent back to the client
	 */
	async fetch(request, env, ctx): Promise<Response> {

		const id = env.MY_DURABLE_OBJECT.idFromName("default-session")
		const stub = env.MY_DURABLE_OBJECT.get(id);

		return await stub.fetch(request);
	},

} satisfies ExportedHandler<Env>;