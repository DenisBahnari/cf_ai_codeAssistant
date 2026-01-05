# cf_ai_codeAssistant

**Rob** is a programming assistant, designed to anwser fast and with the minimum of interruption to the flux of work. It's like having a senior developer by your side who helps and guides you to do things the right way, and helps you whenever you need it.

This project was mainly tought for **new/junior developers**, that have many doubts about programming concepts, languages sintaxes and problems from day to day.

## General Vision

Rob was created to be always avaliable while you are working/programming.

- Can be used by **voice** (main mode)
- Also supports normal **chat** input by text
- Is able to maintain the **context** of the conversation
- Has the ability to understand the current **project context**
- Always reponds in a short, direct and pratical way

The main ideia is to reduce to the maximum the time spent: **Less time searching for answers, more time programming.**

## Rob is not

- a Co pilot
- a complete debugger
- a academic teacher
- a generic chat

It is not made to substitute advanced tools, but to **help in fast and common questions** as well as **simple project orientation**.

## How it works

### 1. Invocation

Rob always listents, and is invoked when the used says its name. When is invoked, he tries to anwser the question.

Is also possible to interact with the chat if voice speech is not convenient.

**Example 1:**
> “Rob, what is a Promisse in JavaScripy?”

Rob will be invoked and will anwser the question

**Example 2:**
> How does a loop works in Java?

Rob will not be invoked and therefore will not anwser the question

### 2. Simple programming questions

Rob can quickly awnser to questions like:

- Teoretical concepts
- Basic teory
- Language sintaxe
- Common errors
- Logical questions

**Examples:**

> “Rob, what is the difference between let and const?”

> “Rob, how can I get the length of a list in Python?”

> “Rob, how can I set up a basic Flask server in Python?”

> “Rob, what does a NullPointerException means?”


### 3. Project context

For questions related to real code, the user can select the folder where the current project is located.

This way Rob will know and understand the project structure, without knowing any information about the content of the files (for privacy and security reasons).

In this state Rob can use the project structure to orient itself and give better anwsers to the user.


### 4. Human-in-the-loop 

When Rob detect that he does not have sufficient context to responde to an anwser (for example, a bug in a specific file), he activate a human-in-the-loop flux:

1. Rob analyses the question

2. Identifies the necessary files

3. Asks for explicit permission to acess the files

4. The user can:

    - Aprove
    - Deny access

5. Only after the aproval, the files content is used by Rob do give an anwser.

### 5. Rob settings

Rob can also be configured dynamicaly during the session in natural language.

Is possible:

- Change his name
- Change the default programming language 

Those configurations afect the behavior of the assistant immediately and mantains during the session.

**Examples:**

> Your name is now Albert

> Now I will work with Java

## Important limitations

⚠️ Browser compatibility

This project was developed and tested mainly on **Google Chrome**. So some specific APIs depends on the browser, namely:

- Speech Recognition
- Folder selection for project context

The correct operation of the project is only guaranteed in Google Chrome at this moment.


## Setup Instructions

### Prerequisites

Install Wrangler (Cloudflare Workers CLI), is required to run this project locally and deploy it to Cloudflare Workers.

Installation:

```bash
npm install -g wrangler
```

### Run Project

1. Navigate to Project Directory

```bash
cd cf-ai-code-assistant
```

2. Start Local Development Server

```bash
wrangler dev
```

The application will start at:

- Local URL: http://localhost:8787


### Live Production

This project is also deployed in the Clouflare plantform:

- URL: https://cf-ai-code-assistant.denisbahnari042.workers.dev/

(recommended Google Chrome Browser)