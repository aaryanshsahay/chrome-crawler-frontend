export async function askOpenAI(question: string, pageHTML?: string): Promise<string> {
  const BACKEND_URL = 'https://chrome-crawler-backend.onrender.com'

  try {
    const response = await fetch(`${BACKEND_URL}/api/openai/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        question: question,
        html: pageHTML
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Backend Error: ${response.status} - ${errorData.error || response.statusText}`)
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(`API Error: ${data.error || 'Unknown error'}`)
    }

    return data.data

  } catch (error) {
    // console.error('Backend API Error:', error)
    throw error
  }
}
