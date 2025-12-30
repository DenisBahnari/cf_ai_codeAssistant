export class DB {

    static async createSession(env: Env, sessionName: string) {
        try {
            const id = crypto.randomUUID();
            await env.assistant_sessions.prepare(`
                INSERT INTO sessions (id, session_name, assistant_name, programming_language)
                VALUES (?, ?, ?, ?)
            `).bind(id, sessionName, "Rob", "Python").run();
            return {status: "success", sessionId: id};
        } catch (err) {
            console.error("Failed to insert session in DB:", err ?? "");
            return {status: "failed", sessionId: "-1"}
        }
    }

    static async getSession(env: Env, sessionId: string) {
        try {
            const sessionRawData = await env.assistant_sessions.prepare(`
                SELECT * FROM sessions
                WHERE id == ?
            `).bind(sessionId).run();
            const session = sessionRawData.results[0];
            return {status: "success", session: session};
        } catch (err) {
            console.error("Failed to get session in DB:", err ?? "");
            return {status: "failed", session: "-1"}
        }
    }

    static async getAllSessions(env: Env) {
        try {
            const sessionRawData = await env.assistant_sessions.prepare(`
                SELECT * FROM sessions
            `).run();
            const session = sessionRawData.results;
            return {status: "success", session: session};
        } catch (err) {
            console.error("Failed to get session in DB:", err ?? "");
            return {status: "failed", session: "-1"}
        }
    }

    static async deleteSession(env: Env, sessionId: string) {
        try {
            await env.assistant_sessions.prepare(`
                DELETE FROM sessions
                WHERE id == ?
            `).bind(sessionId).run();
            return {status: "success", sessionId: sessionId}
        } catch (err) {
            console.error("Failed to delete session in DB:", err ?? "");
            return {status: "failed", sessionId: "-1"}
        }
    }

    static async createMessage(env: Env, sessionId: string, role: string, content: string) {
        try {
            await env.assistant_sessions.prepare(`
                INSERT INTO messages (session_id, role_name, content)
                VALUES (?, ?, ?)
            `).bind(sessionId, role, content).run();
            return {status: "success", messageId: "1"}
        } catch (err) {
            console.error("Failed to create message in DB:", err ?? "");
            return {status: "failed", messageId: "-1"}
        }
    }

    static async getMessage(env: Env, messageId: string) {
        try {
            const messageRawData = await env.assistant_sessions.prepare(`
                SELECT * FROM messages
                WHERE id == ?
            `).bind(messageId).run();
            const message = messageRawData.results[0];
            return {status: "success", messageId: message}
        } catch (err) {
            console.error("Failed to create message in DB:", err ?? "");
            return {status: "failed", messageId: "-1"}
        }
    }

    static async getAllMessages(env: Env, sessionId: string) {
        try {
            const messageRawData = await env.assistant_sessions.prepare(`
                SELECT * FROM messages
                WHERE session_id = ?
            `).bind(sessionId).run();
            const message = messageRawData.results;
            return {status: "success", messages: message}
        } catch (err) {
            console.error("Failed to create message in DB:", err ?? "");
            return {status: "failed", messages: "-1"}
        }
    }

    static async deleteMessage(env: Env, messageId: string) {
        try {
            await env.assistant_sessions.prepare(`
                DELETE FROM messages
                WHERE id == ?
            `).bind(messageId).run();
            return {status: "success", messageId: messageId}
        } catch (err) {
            console.error("Failed to create message in DB:", err ?? "");
            return {status: "failed", messageId: "-1"}
        }
    }

}