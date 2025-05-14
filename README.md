# Hidden Gems

## Setup Instructions

1. **Install the required packages**
```bash
    pip install -r requirements.txt
```
2. **Pull Gemma3 from Ollama**
```bash
    ollama pull gemma3:1b
```

## Usage

1. Open your terminal and run this command from the `code` folder to allow the LLM to run on the backend side
```bash
    python3 scripts/generate_recommendations.py
```

2. Run this command from the `code` folder and navigate from the localhost
```bash
    npx serve
```

## Replication

1. Finding 'hidden' gems
See `chain_filter.py` in the `code/scripts` folder for criteria on which gems were not permitted during sampling. 

2. Simulating user content
The app heavily relies upon crowdsourcing to populate information about the gems. For the demo and usability tests to work, this content was randomly generated using `content_generator.py` in the `code/scripts` folder. 

3. Downloading from OSM
Constants and decisions in `download_osm_data_ca_subset.py` can be changed to create a `hidden_gems.json` file for another area. 








