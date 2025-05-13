# Hidden Gems

## Setup Instructions

1. **Install the required packages**
```bash
    pip install -r requirements.txt
```
2. **Pull Mistral from Ollama**
```bash
    ollama pull gemma3:1b
```

## Usage

Before running the webpage, make sure to open your terminal and run this command first to allow the LLM to run on the backend side
```bash
    python3 code/scripts/generate_recommendations.py
```

**Alternative**
: To use OpenAI instead of Ollama
```ssh
    export OPENAI_API_KEY = <Your OpenAI API Key>
```
then
```bash
    python3 code/scripts/hidden_gems_generator.py
```






