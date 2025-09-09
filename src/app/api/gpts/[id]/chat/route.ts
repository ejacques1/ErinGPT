import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { message, history } = await request.json();
    const gptId = params.id;

    // Get GPT data
    const { data: gptData, error: gptError } = await supabase
      .from('gpts')
      .select('*')
      .eq('id', gptId)
      .single();

    if (gptError || !gptData) {
      return NextResponse.json({ error: 'GPT not found' }, { status: 404 });
    }

    // Search for relevant context if GPT has documents
    let contextText = '';
    if (gptData.document_data?.processed) {
      try {
        const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
        
        // Generate embedding for user message
        const queryEmbedding = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: message,
        });

        // Search for similar chunks
        const searchResults = await index.query({
          vector: queryEmbedding.data[0].embedding,
          filter: { gptId },
          topK: 3,
          includeMetadata: true,
        });

        // Extract relevant text
        contextText = searchResults.matches
          .map(match => match.metadata?.text)
          .filter(Boolean)
          .join('\n\n');
      } catch (embeddingError) {
        console.error('Error searching documents:', embeddingError);
      }
    }

    // Build system message
    const systemMessage = `${gptData.instructions}

${contextText ? `\nRelevant document context:\n${contextText}` : ''}

Please respond helpfully based on your instructions and any provided document context.`;

    // Build messages for AI
    const messages = [
      { role: 'system', content: systemMessage },
      ...(history || []).slice(-10), // Keep last 10 messages
      { role: 'user', content: message }
    ];

    // Get response from OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku:beta',
        messages,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter error:', errorData);
      return NextResponse.json({ error: 'Failed to get AI response' }, { status: 500 });
    }

    const aiResponse = await response.json();
    const responseText = aiResponse.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    return NextResponse.json({ response: responseText });

  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
