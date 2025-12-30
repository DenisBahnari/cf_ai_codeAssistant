import { AssistantDO } from "./AssistantDO";
import { DB } from "./DB";

export { AssistantDO };
export { DB };

export default {
	async fetch(request, env, ctx): Promise<Response> {

		const url = new URL(request.url);

		if (request.method === "GET" && url.pathname === "/") {
			return env.ASSETS.fetch(request);
		}

		if (request.method === "GET" && url.pathname === "/session") {
			const sessionId = await request.text();
			const response = await DB.getSession(env, sessionId);
			console.log(response);
			if (response.status === "success") {
				return new Response(JSON.stringify(response.session))
			} else {
				return new Response("Failed Operation", {status: 500});
			}
		}

		if (request.method === "GET" && url.pathname === "/all_sessions") {
			const response = await DB.getAllSessions(env);
			console.log(response);
			if (response.status === "success") {
				return new Response(JSON.stringify(response.session))
			} else {
				return new Response("Failed Operation", {status: 500});
			}
		}

		if (request.method === "POST" && url.pathname === "/session") {
			const sessionName = await request.text();
			const response = await DB.createSession(env, sessionName);
			if (response.status === "success") {
				return new Response(response.sessionId)
			} else {
				return new Response("Failed Operation", {status: 500});
			}
		}

		if (request.method === "DELETE" && url.pathname == "/session") {
			const sessionId = await request.text();
			const response = await DB.deleteSession(env, sessionId);
			const id = env.MY_DURABLE_OBJECT.idFromName(sessionId);
			const stub = env.MY_DURABLE_OBJECT.get(id);
			await stub.fetch("https://do/_destroy", { method: "DELETE" });
			if (response.status === "success") {
				return new Response(response.sessionId)
			} else {
				return new Response("Failed Operation", {status: 500});
			}
		}

		if (request.method === "POST" && url.pathname == "/all_messages") {
			const sessionId = await request.text();
			const response = await DB.getAllMessages(env, sessionId);
			if (response.status === "success") {
				return new Response(JSON.stringify(response.messages))
			} else {
				return new Response("Failed Operation", {status: 500});
			}
		}

		if (request.method === "DELETE" && url.pathname == "/all_messages") {
			const sessionId = await request.text();
			const response = await DB.deleteAllMessages(env, sessionId);
			if (response.status === "success") {
				return new Response(response.messageId);
			} else {
				return new Response("Failed Operation", {status: 500});
			}
		}

		if (request.method === "POST" && url.pathname === "/chat") {
			const sessionId = await request.headers.get("x-session-id");
			if (sessionId != null) {
				console.log(sessionId);
				const id = env.MY_DURABLE_OBJECT.idFromName(sessionId)
				const stub = env.MY_DURABLE_OBJECT.get(id);

				return await stub.fetch(request);
			} else {
				return new Response("Null Session Id", {status: 500})
			}
		}

		return new Response("Not Found", {status: 404});
	},

} satisfies ExportedHandler<Env>;