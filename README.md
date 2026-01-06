# cf_ai_codeAssistant


**Rob** is a programming assistant, designed to answer fast and with the minimum of interruption to the flux of work. It's like having a senior developer by your side who helps and guides you to do things the right way, and helps you whenever you need it.


This project was mainly thought for **new/junior developers**, that have many doubts about programming concepts, languages, syntaxes and problems from day to day.


## General Vision


Rob was created to be always available while you are working/programming.


- Can be used by **voice** (main mode)
- Also supports normal **chat** input by text
- Is able to maintain the **context** of the conversation
- Has the ability to understand the current **project context**
- Always responds in a short, direct and practical way


The main idea is to reduce to the maximum the time spent: **Less time searching for answers, more time programming.**


## Rob is not


- a co pilot
- a complete debugger
- an academic teacher
- a generic chat


It is not made to substitute advanced tools, but to **help in fast and common questions** as well as **simple project orientation**.


## How it works


### 1. Invocation


Rob always listents, and is invoked when the user says its name. When is invoked, he tries to answer the question.


It is also possible to interact with the chat if voice speech is not convenient.


**Example 1:**
> “Rob, what is a Promise in JavaScript?"


Rob will be invoked and will answer the question


**Example 2:**
> How does a loop work in Java?


Rob will not be invoked and therefore will not answer the question


### 2. Simple programming questions


Rob can quickly answer to questions like:


- Theoretical concepts
- Basic theory
- Language syntax
- Common errors
- Logical questions


**Examples:**


> “Rob, what is the difference between let and const?”


> “Rob, how can I get the length of a list in Python?”


> “Rob, how can I set up a basic Flask server in Python?”


> “Rob, what does a NullPointerException mean?”




### 3. Project context


For questions related to real code, the user can select the folder where the current project is located.


This way Rob will know and understand the project structure, without knowing any information about the content of the files (for privacy and security reasons).


In this state Rob can use the project structure to orient itself and give better answers to the user.




### 4. Human-in-the-loop


When Rob detect that he does not have sufficient context to respond to an answer (for example, a bug in a specific file), he activate a human-in-the-loop flux:


1. Rob analyses the question


2. Identifies the necessary files


3. Asks for explicit permission to access the files


4. The user can:


   - Aprove
   - Deny access


5. Only after the approval, the files content is used by Rob do give an answer.


### 5. Rob settings


Rob can also be configured dynamically during the session in natural language.


Is possible:


- Change his name
- Change the default programming language


Those configurations affect the behavior of the assistant immediately and maintained during the session.


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


This project is also deployed in the Cloudflare platform:


- URL: https://cf-ai-code-assistant.denisbahnari042.workers.dev/

(recommended Google Chrome Browser)


## Small Demo


https://github.com/user-attachments/assets/24140bc7-70e6-47ee-bba4-8157bf0766c3


