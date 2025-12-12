// Load saved API key
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['apiKey'], (result) => {
    if (result.apiKey) {
      document.getElementById('apiKey').value = result.apiKey;
    }
  });
});

// Save API key on change
document.getElementById('apiKey').addEventListener('change', (e) => {
  chrome.storage.local.set({ apiKey: e.target.value });
});

// Analyze button click handler
document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const apiKey = document.getElementById('apiKey').value.trim();
  
  if (!apiKey) {
    showError('Please enter your Anthropic API key');
    return;
  }

  // Save API key
  chrome.storage.local.set({ apiKey });

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Extract text from page
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: extractPageContent
  });

  const pageContent = results[0].result;

  if (!pageContent || pageContent.trim().length < 100) {
    showError('Not enough text content found on this page to analyze');
    return;
  }

  // Show loading
  document.getElementById('results').classList.remove('active');
  document.getElementById('error').classList.remove('active');
  document.getElementById('loading').classList.add('active');
  document.getElementById('analyzeBtn').disabled = true;

  const startTime = Date.now();

  try {
    // Analyze with Claude
    const analysis = await analyzeContent(pageContent, apiKey);
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    // Calculate word count
    const wordCount = pageContent.split(/\s+/).length;

    // Display results
    displayResults(analysis, wordCount, duration);
  } catch (error) {
    showError(error.message || 'Failed to analyze content. Please check your API key and try again.');
  } finally {
    document.getElementById('loading').classList.remove('active');
    document.getElementById('analyzeBtn').disabled = false;
  }
});

// Extract text content from the page
function extractPageContent() {
  // Remove script, style, and other non-content elements
  const clone = document.cloneNode(true);
  const elementsToRemove = clone.querySelectorAll('script, style, nav, header, footer, iframe, noscript');
  elementsToRemove.forEach(el => el.remove());

  // Get text from main content areas
  const mainContent = clone.querySelector('main, article, [role="main"]') || clone.body;
  let text = mainContent.innerText || mainContent.textContent;

  // Clean up text
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Limit to first 8000 characters to stay within API limits
  return text.substring(0, 8000);
}

// Analyze content using Claude API
async function analyzeContent(content, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Analyze the following text and determine if it appears to be AI-generated or human-written. 

Provide your response in this exact JSON format (no markdown, just raw JSON):
{
  "verdict": "AI-generated" or "Human-written" or "Uncertain",
  "confidence": 0-100,
  "reasoning": "detailed explanation of your analysis"
}

Consider factors like:
- Writing patterns and consistency
- Vocabulary choices and variety
- Sentence structure complexity
- Natural flow vs. formulaic patterns
- Topic-specific expertise vs. generic knowledge
- Presence of personal voice or perspective

Text to analyze:
${content}`
      }]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API request failed');
  }

  const data = await response.json();
  const responseText = data.content[0].text;

  // Parse JSON response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid response format from API');
  }

  return JSON.parse(jsonMatch[0]);
}

// Display analysis results
function displayResults(analysis, wordCount, duration) {
  const resultsDiv = document.getElementById('results');
  const verdictDiv = document.getElementById('verdict');
  
  // Set verdict class
  verdictDiv.className = 'verdict';
  if (analysis.verdict.toLowerCase().includes('ai')) {
    verdictDiv.classList.add('ai');
  } else if (analysis.verdict.toLowerCase().includes('human')) {
    verdictDiv.classList.add('human');
  } else {
    verdictDiv.classList.add('uncertain');
  }

  // Set verdict text
  document.getElementById('verdictText').textContent = analysis.verdict;

  // Set confidence
  const confidence = Math.min(100, Math.max(0, analysis.confidence));
  document.getElementById('confidenceText').textContent = `${confidence}%`;
  
  const confidenceFill = document.getElementById('confidenceFill');
  confidenceFill.style.width = `${confidence}%`;
  
  // Color the confidence bar based on verdict
  if (analysis.verdict.toLowerCase().includes('ai')) {
    confidenceFill.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
  } else if (analysis.verdict.toLowerCase().includes('human')) {
    confidenceFill.style.background = 'linear-gradient(90deg, #10b981, #059669)';
  } else {
    confidenceFill.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
  }

  // Set stats
  document.getElementById('wordCount').textContent = wordCount.toLocaleString();
  document.getElementById('analysisTime').textContent = `${duration}s`;

  // Set analysis text
  document.getElementById('analysisText').textContent = analysis.reasoning;

  // Show results
  resultsDiv.classList.add('active');
}

// Show error message
function showError(message) {
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = message;
  errorDiv.classList.add('active');
  
  setTimeout(() => {
    errorDiv.classList.remove('active');
  }, 5000);
}