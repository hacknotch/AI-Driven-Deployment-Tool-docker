import { RequestHandler } from "express";

// n8n webhook URL
const N8N_WEBHOOK_URL = 'https://kitturmussarat.app.n8n.cloud/webhook-test/b7749dc5-e1f0-4e0c-8f73-580626590a60';

export const handleRAGQuery: RequestHandler = async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query is required and must be a string'
      });
    }

    console.log(`🤖 RAG Bot Query: ${query}`);

    // Forward the request to n8n webhook
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query.trim(),
        timestamp: new Date().toISOString(),
        source: 'test-rag-bot',
        userAgent: req.get('User-Agent') || 'Unknown'
      })
    });

    if (!response.ok) {
      // If n8n webhook is not available, provide a fallback response
      if (response.status === 404) {
        console.log('⚠️ n8n webhook not found, providing fallback response');
        return res.json({
          success: true,
          response: `🤖 **RAG Mode Fallback Response**\n\nI received your query: "${query.trim()}"\n\n⚠️ **Note**: The n8n webhook is currently not available (404 error). This is a fallback response.\n\n**To fix this:**\n1. Check if your n8n workflow is active\n2. Verify the webhook URL is correct\n3. Ensure the webhook endpoint exists\n\n**Your query was:** "${query.trim()}"`,
          timestamp: new Date().toISOString(),
          fallback: true
        });
      }
      throw new Error(`n8n webhook responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log(`✅ RAG Bot Response received:`, data);

    res.json({
      success: true,
      response: data.response || data.message || data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ RAG Bot Error:', error);
    
    // Provide a helpful fallback response instead of just an error
    const fallbackResponse = `🤖 **RAG Mode Error**\n\nI encountered an error while processing your query: "${req.body.query || 'Unknown query'}"\n\n**Error Details:** ${error instanceof Error ? error.message : 'Unknown error occurred'}\n\n**Possible Solutions:**\n1. Check if the n8n webhook URL is correct\n2. Verify the n8n workflow is active\n3. Ensure the webhook endpoint is properly configured\n4. Try switching back to AI mode for now\n\n**Your query was:** "${req.body.query || 'Unknown query'}"`;
    
    res.json({
      success: true,
      response: fallbackResponse,
      timestamp: new Date().toISOString(),
      error: true
    });
  }
};

export const testRAGConnection: RequestHandler = async (req, res) => {
  try {
    console.log('🧪 Testing RAG Bot connection...');
    
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'test connection',
        timestamp: new Date().toISOString(),
        source: 'test-rag-bot',
        test: true
      })
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.json({
          success: false,
          error: 'n8n webhook not found (404)',
          message: 'The webhook URL appears to be incorrect or the n8n workflow is not active',
          webhookUrl: N8N_WEBHOOK_URL,
          status: response.status,
          timestamp: new Date().toISOString()
        });
      }
      throw new Error(`Connection test failed with status: ${response.status}`);
    }

    const data = await response.json();
    
    res.json({
      success: true,
      message: 'RAG Bot connection successful',
      webhookResponse: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ RAG Bot Connection Test Failed:', error);
    
    res.json({
      success: false,
      error: error instanceof Error ? error.message : 'Connection test failed',
      message: 'Unable to connect to n8n webhook. Please check the webhook URL and workflow status.',
      webhookUrl: N8N_WEBHOOK_URL,
      timestamp: new Date().toISOString()
    });
  }
};
