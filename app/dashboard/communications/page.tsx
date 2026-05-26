'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { createLogger } from '@/lib/logger';

const log = createLogger('CommunicationCenter');

interface Message {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
  read: boolean;
  attachments?: string[];
}

interface ConversationThread {
  id: string;
  participant: string;
  subject: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
}

interface CommunicationData {
  conversations: ConversationThread[];
  totalMessages: number;
  unreadMessages: number;
  recentMessages: Message[];
}

export default function CommunicationCenterPage() {
  const [commData, setCommData] = useState<CommunicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageBody, setMessageBody] = useState('');
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');

  useEffect(() => {
    fetchCommunications();
  }, []);

  async function fetchCommunications() {
    try {
      const response = await fetch('/api/communications', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch communications');
      const data = await response.json();
      setCommData(data.data);
      if (data.data.conversations.length > 0) {
        setSelectedConversation(data.data.conversations[0].id);
      }
    } catch (err) {
      log.error('Failed to load communications', err);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    const effectiveRecipient = recipient.trim() || selectedThread?.participant || '';
    if (!messageBody.trim() || !effectiveRecipient) return;
    try {
      const response = await fetch('/api/communications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ recipient: effectiveRecipient, subject, body: messageBody }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      setMessageBody('');
      setRecipient('');
      setSubject('');
      fetchCommunications();
    } catch (err) {
      log.error('Failed to send message', err);
    }
  }

  async function markAsRead(messageId: string) {
    try {
      await fetch(`/api/communications/${messageId}/read`, {
        method: 'POST',
        credentials: 'include',
      });
      fetchCommunications();
    } catch (err) {
      log.error('Failed to mark message as read', err);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Communication Center" subtitle="Manage messages">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="text-center py-12">Loading communications...</div>
        </main>
      </DashboardLayout>
    );
  }

  const selectedThread = commData?.conversations.find((c) => c.id === selectedConversation);

  return (
    <DashboardLayout title="Communication Center" subtitle="Send and receive messages">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
            {/* Conversations List */}
            <div className="bg-white rounded-lg shadow flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <p className="font-bold text-gray-900">Conversations ({commData?.conversations.length || 0})</p>
                <p className="text-sm text-red-600 mt-1">
                  {commData?.unreadMessages || 0} unread messages
                </p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {commData?.conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`w-full text-left p-4 border-b border-gray-200 hover:bg-gray-50 ${
                      selectedConversation === conv.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <p className={`font-medium ${conv.unreadCount > 0 ? 'text-blue-600 font-bold' : 'text-gray-900'}`}>
                        {conv.participant}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{conv.subject}</p>
                    <p className="text-xs text-gray-500 mt-1 truncate">{conv.lastMessage}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat View */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow flex flex-col">
              {selectedThread ? (
                <>
                  <div className="p-4 border-b border-gray-200">
                    <p className="font-bold text-gray-900">{selectedThread.participant}</p>
                    <p className="text-sm text-gray-600">{selectedThread.subject}</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
                    {selectedThread.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg ${
                          msg.from === 'You' ? 'bg-blue-100 ml-12 text-right' : 'bg-white mr-12 border border-gray-200'
                        }`}
                      >
                        <p className="text-xs text-gray-600 mb-1">
                          {msg.from} • {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                        <p className="text-gray-900">{msg.body}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t border-gray-200">
                    <textarea
                      value={messageBody}
                      onChange={(e) => setMessageBody(e.target.value)}
                      placeholder="Type your message..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none h-20"
                    />
                    <button
                      onClick={sendMessage}
                      className="mt-2 w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
                    >
                      Send Message
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-gray-600">Select a conversation to view messages</p>
                </div>
              )}
            </div>
          </div>

          {/* New Message Compose */}
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <p className="font-bold text-gray-900 mb-4">New Message</p>
            <div className="space-y-4">
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Recipient name or email..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Message body..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg h-32 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={sendMessage}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
                >
                  Send
                </button>
                <button
                  onClick={() => {
                    setRecipient('');
                    setSubject('');
                    setMessageBody('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
