# Hidden Gems

## Setup Instructions

1. **Install the required packages**
```bash
    pip install -r requirements.txt
```
2. **Pull Mistral from Ollama**
```bash
    ollama pull mistral:7b
```

## Usage

Before running the webpage, make sure to open your terminal and run this command first to allow the LLM to run on the backend side
```bash
    python3 code/scripts/hidden_gems_generator_local.py
```

**Alternative**
: To use tinyllama instead of Mistral7B

```bash
    python3 code/scripts/precache_recommendations.py
```

then
```bash
    python3 code/scripts/hidden_gems_generator.py
```






