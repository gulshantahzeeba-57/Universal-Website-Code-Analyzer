import os
import zipfile
import json
import requests
from bs4 import BeautifulSoup
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

class SiteScopeAnalyzer:
    def __init__(self):
        # Groq API setup
        api_key = os.getenv("GROQ_API_KEY", "")
        self.client = OpenAI(
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1"
        ) if api_key else None

    # --- AI Analysis Helper ---
    def analyze_with_grok(self, prompt_text):
        if not self.client:
            return {
                "error": "Groq API key missing. Please add GROQ_API_KEY to your .env file."
            }

        try:
            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an expert Web Developer & Security Auditor. "
                            "Analyze the given input and respond ONLY in valid JSON with this exact structure: "
                            '{"target": "...", "type": "...", "scores": {"overall": 85}, '
                            '"passed": ["..."], "warnings": ["..."], "errors": ["..."]}'
                        )
                    },
                    {"role": "user", "content": prompt_text}
                ],
                response_format={"type": "json_object"},
                temperature=0.2
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            return {"error": f"Groq API Error: {str(e)}"}

    # --- Live URL Analysis ---
    def analyze_live_url(self, url):
        try:
            headers = {'User-Agent': 'Mozilla/5.0'}
            res = requests.get(url, headers=headers, timeout=10)
            soup = BeautifulSoup(res.text, 'html.parser')

            title = soup.title.string if soup.title else "No Title"
            text_snippet = soup.get_text()[:2000]

            prompt = f"""
            Analyze this live website:
            URL: {url}
            HTTP Status: {res.status_code}
            Title: {title}
            Content Snippet: {text_snippet}

            Evaluate SEO, Performance, Responsiveness, and Code Quality.
            """
            return self.analyze_with_grok(prompt)

        except Exception as e:
            return {'error': f"Failed to fetch URL: {str(e)}"}

    # --- ZIP File Analysis ---
    def analyze_zip_file(self, zip_path):
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                file_list = zip_ref.namelist()

            prompt = f"""
            Analyze this website project ZIP archive:
            Files in project: {file_list[:50]}

            Evaluate project structure, tech stack, styling, scripts, and code quality.
            """
            return self.analyze_with_grok(prompt)

        except Exception as e:
            return {'error': f"Failed to analyze ZIP archive: {str(e)}"}