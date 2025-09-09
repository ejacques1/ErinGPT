'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface GPT {
  id: string;
  name: string;
  description: string;
  instructions: string;
  document_data?: {
    fileName: string;
    chunksCount: number;
    processed: boolean;
  };
  created_at: string;
}

export default function HomePage() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    instructions: ''
  });
  const [file, setFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [gpts, setGpts] = useState<GPT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Fetch existing GPTs
  useEffect(() => {
    fetchGPTs();
  }, []);

  const fetchGPTs = async () => {
    try {
      const response = await fetch('/api/gpts');
      if (response.ok) {
        const data = await response.json();
        setGpts(data.gpts || []);
      }
    } catch (error) {
      console.error('Error fetching GPTs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('instructions', formData.instructions);
      if (file) {
        formDataToSend.append('file', file);
      }

      const response = await fetch('/api/gpts/create', {
        method: 'POST',
        body: formDataToSend,
      });

      const result = await response.json();
      
      if (response.ok) {
        // Reset form and refresh list
        setFormData({ name: '', description: '', instructions: '' });
        setFile(null);
        fetchGPTs();
        alert('GPT created successfully!');
      } else {
        alert('Error creating GPT: ' + result.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error creating GPT');
    } finally {
      setIsCreating(false);
    }
  };

  const deleteGPT = async (id: string) => {
    if (!confirm('Are you sure you want to delete this GPT?')) return;

    try {
      const response = await fetch(`/api/gpts/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchGPTs();
        alert('GPT deleted successfully');
      } else {
        alert('Error deleting GPT');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error deleting GPT');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🤖 Custom GPT Platform</h1>
          <p className="text-gray-600">Create and deploy your own AI assistants with custom knowledge</p>
        </div>
        
        {/* Create GPT Form */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Create Your GPT</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GPT Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Legal Document Analyzer, Code Helper, Research Assistant"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brief description of what your GPT does and who it helps..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instructions *
              </label>
              <textarea
                required
                value={formData.instructions}
                onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Detailed instructions for how your GPT should behave, respond, and use uploaded documents. Be specific about tone, expertise level, and response format..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📎 Upload Knowledge Document
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <input
                  type="file"
                  accept=".txt,.pdf,.docx,.doc,.md,.rtf,.csv,.json"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full"
                />
                <div className="mt-3 text-sm text-gray-500">
                  <p className="font-medium mb-1">✅ Supported formats:</p>
                  <p>TXT, PDF, DOCX, DOC, MD, RTF, CSV, JSON</p>
                  <p className="mt-2">💡 Best results with plain text (.txt) files</p>
                </div>
                {file && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-blue-700 font-medium">📄 Selected: {file.name}</p>
                    <p className="text-blue-600 text-sm">Size: {(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
            >
              {isCreating ? '🔄 Creating GPT...' : '🚀 Create GPT'}
            </button>
          </form>
        </div>

        {/* GPTs List */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Your Custom GPTs</h2>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading GPTs...</p>
            </div>
          ) : gpts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No GPTs created yet. Create your first one above!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {gpts.map((gpt) => (
                <div key={gpt.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">🤖 {gpt.name}</h3>
                      <p className="text-gray-600 mt-1">{gpt.description}</p>
                      {gpt.document_data && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            📄 Knowledge: {gpt.document_data.fileName} ({gpt.document_data.chunksCount} chunks)
                          </span>
                        </div>
                      )}
                      <p className="text-sm text-gray-400 mt-2">
                        Created: {new Date(gpt.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => router.push(`/gpt/${gpt.id}`)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
                      >
                        💬 Chat
                      </button>
                      <button
                        onClick={() => deleteGPT(gpt.id)}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm font-medium"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
