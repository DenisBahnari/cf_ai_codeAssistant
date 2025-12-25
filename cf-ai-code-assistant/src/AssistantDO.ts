import { DurableObject } from "cloudflare:workers";

interface AssistantState {
    sessionName: string;
    languages: string[];
    chatHistory: string[];
}

export class AssistantDO extends DurableObject<Env> {
    stateData: AssistantState;

    constructor(state: DurableObjectState, env: Env) {
        super(state, env);
        this.stateData = {
            sessionName: "defaultName",
            languages: ["python"],
            chatHistory: []
        }
    }

    async askAI(question: string): Promise<string> {
        const response = await this.env.AI.run("@cf/meta/llama-3-8b-instruct", {
            messages: [
                {role: "system", content: "You are Rob, a fast conding assistant"},
                {role: "user", content: question}
            ]
        });
        return response.response ?? "";
    }

    async fetch(request: Request): Promise<Response> {
        const requestedText = await request.text();

        if (!requestedText.toLowerCase().includes("hey rob")) {
            return new Response(null, {status:204});
        }

        const question = requestedText.replace("/hey rob/i", "").trim();
        const awnser = await this.askAI(requestedText);
        this.stateData.chatHistory.push(requestedText);

        return new Response(awnser);
    }

}