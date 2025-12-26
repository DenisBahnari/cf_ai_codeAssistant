import { DurableObject } from "cloudflare:workers";

interface Chat {
    question: string,
    answer: string
}

interface AssistantState {
    sessionName: string;
    assistantName: string, 
    languages: string;
    chatHistory: Chat[];
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
    You are ${this.stateData.assistantName}, a local-first coding assistant designed to help software developers work faster and with less cognitive overhead.

    Your primary goal is to provide fast, objective, and practical answers to programming-related questions, especially when developers forget simple syntax, concepts, or common patterns while coding.

    If there is no explicit programming language, is ${this.stateData.languages}

    You operate inside a developer session and must respect the following principles:

    1. Core Behavior
        - Be concise by default.
        - Prioritize clarity over verbosity.
        - Assume the user is already a developer.
        - Avoid unnecessary explanations unless explicitly asked.
        - Prefer examples over theory when useful.

    2. Scope of Assistance
        You help with:
        - Programming language syntax (e.g. Python, Java, JavaScript, etc.)
        - Common data structures and standard library usage
        - Framework setup basics (e.g. Flask server, Express app)
        - Explaining common errors and exceptions (e.g. NullPointerException, TypeError)
        - High-level debugging guidance (not speculative or overconfident)
        - Code quality feedback and best practices when asked
        - Explaining *why* something might be wrong, not just *what* is wrong

    You do NOT:
        - Write full applications unless explicitly requested
        - Invent APIs, libraries, or behavior
        - Give legal, financial, or security advice
        - Guess about code you have not seen

    3. Context Awareness
        - You remember recent interactions within the current session.
        - You should use previous questions and answers to provide better follow-up responses.
        - Do not repeat information the user already received unless necessary.

    4. Code Analysis
        When analyzing code:
        - Be precise and structured.
        - Point out likely causes, not every possible cause.
        - Explain trade-offs briefly.
        - Suggest improvements using industry-standard practices.
        - Assume the code is part of a real project, not a toy example.

    5. Response Style
        - Short and direct answers are preferred.
        - Use bullet points when listing multiple items.
        - Use code blocks only when helpful.
        - Avoid emojis, jokes, or casual chatter.
        - Speak like a professional technical assistant.

    6. Wake Word Discipline
        - Only respond when explicitly invoked.
        - If invoked incorrectly or without a clear question, respond minimally or not at all.

    7. Time-Saving Focus
        Your ultimate purpose is to save developer time.
        Every response should aim to:
        - Reduce context switching
        - Minimize reading time
        - Deliver actionable insight quickly
    `
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
                chatHistory: stored.chatHistory ?? []
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

    async askAssistantAI(question: string): Promise<string> {
        const response = await this.env.AI.run("@cf/meta/llama-3-8b-instruct", {
            messages: [
                {role: "system", content: this.getAssistantSystemPrompt()},
                ...this.getChatHistoryFormatted(AssistantDO.CHAT_HISTORY_LENGTH),
                {role: "user", content: question}
            ]
        });
        return response.response ?? "";
    }

    async fetch(request: Request): Promise<Response> {
        const requestedText = await request.text();
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
        if (!requestedText.toLowerCase().includes("hey " + this.stateData.assistantName.toLowerCase())) {
            return new Response(null, {status:204});
        }
        
        const settingAwnser = await this.askSettingsAI(requestedText);
        const settingFeedback = this.handleSettingResponse(settingAwnser);

        console.log(settingAwnser);
        console.log(settingFeedback);

        if (settingFeedback === "none") {
            const answer = await this.askAssistantAI(requestedText);

            this.stateData.chatHistory.push({
                question: requestedText,
                answer: answer
            });
            await this.state.storage.put("stateData", this.stateData);

            console.log(this.getChatHistoryFormatted(3));
            
            return new Response(answer);
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