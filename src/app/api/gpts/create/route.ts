import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const instructions = formData.get('instructions') as string;
    const file = formData.get('file') as File | null;

    if (!name || !description || !instructions) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const gptId = uuidv4();
    let documentData = null;

    // Process uploaded file if present
    if (file) {
      console.log('Processing file:', file.name);
      
      // Read file content
      const arrayBuffer = await file.arrayBuffer();
      const textContent = new TextDecoder().decode(arrayBuffer);
      
      // Simple text chunking (split by paragraphs)
      const chunks = textContent
        .split('\n\n')
        .filter(chunk => chunk.trim().length > 50)
        .slice(0, 20); // Limit chunks for demo

      console.log(`Created ${chunks.length} chunks from file`);

      // Generate embeddings and store in Pinecone
      if (chunks.length > 0) {
        const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
        
        const embeddings = await Promise.all(
          chunks.map(async (chunk, i) => {
            const response = await openai.embeddings.create({
              model: 'text-embedding-ada-002',
              input: chunk,
            });
            
            return {
              id: `${gptId}-chunk-${i}`,
              values: response.data[0].embedding,
              metadata: {
                gptId,
                text: chunk,
                chunkIndex: i,
              },
            };
          })
        );

        await index.upsert(embeddings);
        console.log('Stored embeddings in Pinecone');

        documentData = {
          fileName: file.name,
          chunksCount: chunks.length,
          processed: true,
        };
      }
    }

    // Store GPT in Supabase
    const { data, error } = await supabase
      .from('gpts')
      .insert({
        id: gptId,
        name,
        description,
        instructions,
        document_data: documentData,
        status: 'active',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to save GPT' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      gptId,
      message: 'GPT created successfully'
    });

  } catch (error) {
    console.error('Error creating GPT:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
