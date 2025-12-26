import { DurableObject } from "cloudflare:workers";

interface Chat {
    question: string,
    answer: string
}

interface AssistantState {
    sessionName: string;
    languages: string[];
    chatHistory: Chat[];
}

export class AssistantDO extends DurableObject<Env> {

    private static readonly CHAT_HISTORY_LENGTH = 7; 

    state: DurableObjectState;
    stateData: AssistantState;

    constructor(state: DurableObjectState, env: Env) {
        super(state, env);
        this.state = state;

        this.stateData = {
            sessionName: "defaultName",
            languages: ["python"],
            chatHistory: []
        }

        state.blockConcurrencyWhile(async () => {
        const stored = await state.storage.get<AssistantState>("stateData");
        if (stored) {
            this.stateData = stored;
        }
    });
    }

    async askAI(question: string): Promise<string> {
        const response = await this.env.AI.run("@cf/meta/llama-3-8b-instruct", {
            messages: [
                {role: "system", content: "You are Rob, a fast conding assistant"},
                ...this.getChatHistoryFormatted(AssistantDO.CHAT_HISTORY_LENGTH),
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
        const answer = await this.askAI(requestedText);

        this.stateData.chatHistory.push({
            question: requestedText,
            answer: answer
        });
        await this.state.storage.put("stateData", this.stateData);

        console.log(this.getChatHistoryFormatted(3));
        
        return new Response(answer);
    }

    private getChatHistoryFormatted(n: number) {
        return this.stateData.chatHistory
            .slice(-n)
            .flatMap(entry => [
                { role: "user", content: entry.question },
                { role: "assistant", content: entry.answer }
            ]);
    }


}