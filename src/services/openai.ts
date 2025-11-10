export async function askOpenAI(question: string, pageHTML?: string): Promise<string> {
  const API_KEY = import.meta.env.VITE_OPENAI_API_KEY

  console.log('Using API Key:', API_KEY ? API_KEY.substring(0, 20) + '...' : 'NOT SET')

  if (!API_KEY) {
    throw new Error('OpenAI API key is not set. Please add VITE_OPENAI_API_KEY to src/.env file')
  }

  // Build the prompt with HTML context if available
  let userMessage = question
  if (pageHTML) {
    userMessage = `You are a web scraper assistant. Extract information from the following HTML page and answer the question.

HTML Content:
${pageHTML}

Question: ${question}

IMPORTANT: You MUST respond with valid JSON only. No markdown, no extra text. The response must be parseable JSON.
Respond in this format:
{
  "success": true,
  "data": <your response as JSON>,
  "message": "Brief description"
}

If you cannot extract the information, respond with:
{
  "success": false,
  "data": null,
  "message": "Reason why"
}`
  } else {
    userMessage = `You are a helpful assistant. Answer the following question.

Question: ${question}

IMPORTANT: You MUST respond with valid JSON only. No markdown, no extra text. The response must be parseable JSON.
Respond in this format:
{
  "success": true,
  "data": <your response as JSON>,
  "message": "Brief description"
}

If you cannot answer, respond with:
{
  "success": false,
  "data": null,
  "message": "Reason why"
}`
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'user',
            content: userMessage
          }
        ],
        max_tokens: 2000,
        temperature: 0.2 // Lower temperature for more consistent JSON output
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`API Error: ${response.status} - ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    const responseText = data.choices[0].message.content

    // Try to parse as JSON
    try {
      const jsonResponse = JSON.parse(responseText)
      console.log('[OpenAI] JSON response:', jsonResponse)
      return JSON.stringify(jsonResponse, null, 2)
    } catch (parseError) {
      // If not valid JSON, wrap it in JSON format
      console.warn('[OpenAI] Response was not valid JSON, wrapping it:', responseText)
      return JSON.stringify({
        success: true,
        data: responseText,
        message: 'Response wrapped in JSON'
      }, null, 2)
    }
  } catch (error) {
    console.error('OpenAI API Error:', error)
    throw error
  }
}
