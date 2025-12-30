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



}