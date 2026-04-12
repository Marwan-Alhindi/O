# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

app = FastAPI()

# Allow frontend to access backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to Langpulse backend"}

@app.get("/openai")
def get_openai(user_input: str):
    client = OpenAI(
        api_key=os.getenv("OPENAI_API_KEY")
    )

    response = client.responses.create(
        model="gpt-4o",
        instructions="I would like you to talk like a japanese girl and put the english as well",
        input=user_input
    )
    return {response.output_text}

init_models = {}
chat_history = []

@app.get("/inviteLLM")
def init_model(model_id: int, model_name: str, model_type: str, model_instruct: str, connections: str = "user"):
    # Parse connections: comma-separated, e.g. "user,1,2"
    conn_list = []
    for c in connections.split(","):
        c = c.strip()
        if c == "user":
            conn_list.append("user")
        elif c:
            try:
                conn_list.append(int(c))
            except ValueError:
                pass

    if model_type == "openai":
        init_models[model_id] = {
            "model_name": model_name,
            "client": OpenAI(api_key=os.getenv("OPENAI_API_KEY")),
            "model_type": model_type,
            "model_instruct": model_instruct,
            "connections": conn_list
        }

    response = init_models[model_id]["client"].chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "user", "content": f"Please type a message to indicate you have joined the chat with mentioning your name. Your name is: {model_name}"}
        ]
    )

    join_text = response.choices[0].message.content

    # Store join message in history
    chat_history.append({
        "sender_id": model_id,
        "sender_name": model_name,
        "content": join_text
    })

    return {"response": join_text}

@app.get("/askLLM")
def ask_LLM(user_input: str, model_id: int):
    # Add user message to history (deduplicate for parallel calls)
    last_user_msg = None
    for entry in reversed(chat_history):
        if entry["sender_id"] == "user":
            last_user_msg = entry
            break

    if last_user_msg is None or last_user_msg["content"] != user_input:
        chat_history.append({
            "sender_id": "user",
            "sender_name": "User",
            "content": user_input
        })

    llm = init_models[model_id]
    connections = llm.get("connections", ["user"])

    # Build messages with full context from connected entities
    api_messages = [
        {"role": "system", "content": llm["model_instruct"]}
    ]

    for entry in chat_history:
        sid = entry["sender_id"]

        if sid == model_id:
            # This LLM's own past messages
            api_messages.append({"role": "assistant", "content": entry["content"]})
        elif sid == "user" and "user" in connections:
            # User messages (if connected to user)
            api_messages.append({"role": "user", "content": entry["content"]})
        elif sid in connections:
            # Another connected LLM's messages - prefix with sender name
            api_messages.append({"role": "user", "content": f'{entry["sender_name"]}: {entry["content"]}'})

    response = llm["client"].chat.completions.create(
        model="gpt-4o",
        messages=api_messages
    )

    result = response.choices[0].message.content

    # Store LLM response in history
    chat_history.append({
        "sender_id": model_id,
        "sender_name": llm["model_name"],
        "content": result
    })

    return {"response": result}
