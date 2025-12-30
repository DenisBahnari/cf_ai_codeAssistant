import { DurableObject } from "cloudflare:workers";
import { DB } from "./DB";

interface Chat {
    question: string,
    answer: string
}

interface ProjectContext {
    rootName: string;
    tree: FileNode[];
    allowedFiles: string[];
}

interface FileNode {
    path: string;
    type: "file" | "dir";
}

interface AssistantState {
    sessionName: string;
    assistantName: string, 
    languages: string;
    chatHistory: Chat[];
    projetoContext?: ProjectContext;
}

export class AssistantDO extends DurableObject<Env> {

    private static readonly CHAT_HISTORY_LENGTH = 7;

    private static readonly SETTING_ANALYSER_SYSTEM = `
    You are an intent classifier for a coding assistant.
    Some messages will be a request and others will be a question for the coding assistant, remember you are only the classifier, not the coidinig assistant.
    Your task is to analyze a user message and decide if it is request, and if yes, whether it requests a change to the agent's settings.

    Supported settings:
        - agent_name
        - programming_language (a real programming language)

    Return ONLY a valid JSON object, do not try to exaplain anything, you only can return a JSON.

    Possible actions:
        - "set_name"
        - "set_language"
        - "incomplete"
        - "none"

    Rules:
        1. Use "set_name" only when the user clearly specifies a new name.
        2. Use "set_language" only when the user clearly specifies a programming language.
        3. Use "incomplete" when the user expresses intent to change a setting but does not specify the value.
        4. Use "none" when the message is not about changing settings.

    Response format:
        {
        "action": "set_name" | "set_language" | "incomplete" | "none",
        "value": string | null
        }

    Examples:

    User: "Can I change your name?"
    Output:
        {
        "action": "incomplete",
        "value": null
        }

    User: "I want to use another language"
    Output:
        {
        "action": "incomplete",
        "value": null
        }

    User: "Call yourself Albert"
    Output:
        {
        "action": "set_name",
        "value": "Albert"
        }

    User: "Now I will work with Python"
    Output:
        {
        "action": "set_language",
        "value": "Python"
        }

    User: "How do I get the length of a list?"
    Output:
        {
        "action": "none",
        "value": null
        }

    `

    private getAssistantSystemPrompt(): string {
  return `
    You are ${this.stateData.assistantName}, a local-first coding assistant for software developers.

    Your goal is to provide fast, clear, and practical help with programming tasks.

    If no programming language is specified, assume ${this.stateData.languages}.

    GENERAL BEHAVIOR
    - Be concise and direct
    - Assume the user is a developer
    - Prefer actionable answers over theory
    - Avoid unnecessary explanations unless asked

    YOU HELP WITH
    - Language syntax and standard libraries
    - Common patterns and data structures
    - Framework setup basics
    - Explaining common errors
    - High-level debugging guidance
    - Code quality feedback when requested

    YOU DO NOT
    - Guess about code you have not seen
    - Invent APIs or behavior
    - Write full applications unless requested

    RESPONSE STYLE
    - Short and focused
    - Bullet points when useful
    - Code blocks only when helpful
    - Professional technical tone

    ACTIVATION
    - Only respond when explicitly invoked

    TIME-SAVING PRIORITY
    - Reduce context switching
    - Minimize reading time
    - Deliver actionable insight quickly

    ${this.getProjectContextBlock()}
    `;
    }

    private getProjectContextBlock(): string {
        const ctx = this.stateData.projetoContext;
        if (!ctx) return "";

        const tree = ctx.tree
            .map(n => `- ${n.type.toUpperCase()}: ${n.path}`)
            .join("\n");

        const allowed =
            ctx.allowedFiles.length > 0
            ? ctx.allowedFiles.map(f => `- ${f}`).join("\n")
            : "None";

        return `
        PROJECT CONTEXT (AUTHORITATIVE)

        Project root:
        ${ctx.rootName}

        Project structure:
        ${tree}

        Files you are allowed to inspect:
        ${allowed}

        Rules:
        - This structure represents the real project.
        - Do NOT assume files or folders outside this list.
        - Do NOT assume file contents unless explicitly provided.
        - If a file not listed above is needed:
        - Ask the user for permission
        - Mention the exact file path
        - Briefly explain why access is required
        `;
    }


    state: DurableObjectState;
    stateData: AssistantState;

    constructor(state: DurableObjectState, env: Env) {
        super(state, env);
        this.state = state;

        this.stateData = {
            sessionName: "defaultName",
            assistantName: "Rob",
            languages: "python",
            chatHistory: []
        }

        state.blockConcurrencyWhile(async () => {
            const stored = await state.storage.get<Partial<AssistantState>>("stateData");
            if (stored) {
                this.stateData = {
                sessionName: stored.sessionName ?? "defaultName",
                assistantName: stored.assistantName ?? "Rob",
                languages: stored.languages ?? "python",
                chatHistory: stored.chatHistory ?? [],
                projetoContext: stored.projetoContext
                };
            }
        });

    }

    async askSettingsAI(question: string): Promise<any> {
        const response = await this.env.AI.run("@cf/meta/llama-3-8b-instruct", {
            messages: [
                {role:"system", content: AssistantDO.SETTING_ANALYSER_SYSTEM},
                {role:"user", content: question}
            ]
        });
        try {
            const jsonResponse = JSON.parse(response.response ?? "")
            if (!jsonResponse || typeof jsonResponse.action !== "string") {
                return {action: "none"};
            }
            return jsonResponse;
        } catch (err) {
            console.error("Failed to parse setting intent:", response.response ?? "");
            return { action: "none" };
        }
    }

    async askAssistantAI(question: string): Promise<{stream: ReadableStream; fullText: () => Promise<string | undefined>}> {
        const responseStream = await this.env.AI.run("@cf/meta/llama-3-8b-instruct", {
            messages: [
                {role: "system", content: this.getAssistantSystemPrompt()},
                ...this.getChatHistoryFormatted(AssistantDO.CHAT_HISTORY_LENGTH),
                {role: "user", content: question}
            ],
            stream: true
        });

        const message = [
                {role: "system", content: this.getAssistantSystemPrompt()},
                ...this.getChatHistoryFormatted(AssistantDO.CHAT_HISTORY_LENGTH),
                {role: "user", content: question}
            ]

        console.log(message)

        const [clientStream, internalStream] = responseStream.tee();
        const reader = internalStream.getReader();

        let buffer = "";
        let currentText = "";
        const decoder = new TextDecoder();
        const fullTextPromise = (async () => {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (!line.startsWith("data:")) continue;
                    const payload = line.replace("data:", "").trim();
                    if (payload === "[DONE]") break;

                    try {
                        const json = JSON.parse(payload);
                        if (json.response) {
                            currentText += json.response;
                        }
                    } catch {
                        // ignore malformed chunks
                    }
                }
            }
            return currentText;
        });

        return {stream: clientStream, fullText: fullTextPromise}
    }

    async fetch(request: Request): Promise<Response> {

        if (request.method === "DELETE" && new URL(request.url).pathname === "/session") {
            console.log("Destroy DO");
            await this.state.storage.deleteAll();
            return new Response("Destroyed", { status: 200 });
        }

        if (request.method === "DELETE" && new URL(request.url).pathname === "/all_messages") {
            console.log("Delete DO History");
            this.stateData.chatHistory = [];            
            await this.state.storage.put("stateData", this.stateData);
            return new Response("Chat Destroyed", { status: 200 });
        }

        if (request.method === "POST" && new URL(request.url).pathname === "/project_context") {
            console.log("ADD Project Context");
			const projectContextRaw = JSON.parse(await request.text());
            const rootName = projectContextRaw.rootName;
            const treeRaw = projectContextRaw.tree;
            let tree: FileNode[] = [];
            treeRaw.forEach((element: { path: any; type: any; }) => {
                const node: FileNode = {
                    path: element.path,
                    type: element.type
                }
                tree.push(node);
            });
            const projectContext = {
                rootName: rootName,
                tree: tree,
                allowedFiles: []
            }
            this.stateData.projetoContext = projectContext;
            await this.state.storage.put("stateData", this.stateData);
            return new Response("Context Added", { status: 200 });
        }

        const requestedText = await request.text();
        const sessionId = await request.headers.get("x-session-id");
        ///// TEMP
        if (requestedText === "reset") {
            this.stateData = {
                sessionName: "defaultName",
                assistantName: "Rob",
                languages: "python",
                chatHistory: []
            }
            await this.state.storage.put("stateData", this.stateData);
        }
        //////
        if (!requestedText.toLowerCase().includes("hey " + this.stateData.assistantName.toLowerCase()) || sessionId == null) {
            return new Response(null, {status:204});
        }
        
        DB.createMessage(this.env, sessionId, "user", requestedText);

        const settingAwnser = await this.askSettingsAI(requestedText);
        const settingFeedback = this.handleSettingResponse(settingAwnser);

        console.log(settingAwnser);
        console.log(settingFeedback);

        if (settingFeedback === "none") {
            const {stream, fullText} = await this.askAssistantAI(requestedText);

            fullText().then(async (finalAnswer) => {
                this.stateData.chatHistory.push({
                    question: requestedText,
                    answer: finalAnswer ?? ""
                });
                await this.state.storage.put("stateData", this.stateData);
                DB.createMessage(this.env, sessionId, "assistant", finalAnswer ?? "")
                console.log(this.getChatHistoryFormatted(3));
            })
            
            return new Response(stream, {
                headers: { "content-type": "text/event-stream" },
            });
        } else {
            return new Response(settingFeedback);
        }
        
    }

    private getChatHistoryFormatted(n: number) {
        return this.stateData.chatHistory
            .slice(-n)
            .flatMap(entry => [
                { role: "user", content: entry.question },
                { role: "assistant", content: entry.answer }
            ]);
    }

    private handleSettingResponse(response: any): string {
        let feedback;
        switch (response.action) {
            case "set_name": 
                this.stateData.assistantName = response.value;
                this.state.storage.put("stateData", this.stateData);
                feedback = "name_set";
                break;
            case "set_language":
                this.stateData.languages = response.value;
                this.state.storage.put("stateData", this.stateData);
                feedback = "language_set"
                break;
            case "incomplete":
                feedback = "incomplete"
                break;
            default:
                feedback = "none"
        }
        return feedback;
    }

}