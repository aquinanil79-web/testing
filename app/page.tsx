'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SignInButton, SignedIn, SignedOut, UserButton, useAuth } from '@clerk/nextjs';
import {
  Plus, MessageSquare, Search, Edit2, Edit3, Trash2, Share2, Settings, User, 
  ChevronDown, Send, Square, Sun, Moon, Laptop, Globe, Paperclip, Check, Copy,
  RotateCcw, ThumbsUp, ThumbsDown, Volume2, VolumeX, Sparkles, Zap, Brain,
  Menu, X, Sliders, CheckCircle2, ShieldAlert, FileText, Image as ImageIcon,
  ArrowUp, MoreHorizontal, LogOut, Info, ExternalLink, Terminal, Code, HelpCircle,
  Pin, Download, Eye, Play, Cpu, ChevronRight, Compass
} from 'lucide-react';

// --- VELORA MODELS & PERSONA CONFIGURATIONS ---

const VELORA_MODELS = [
  {
    id: '@cf/meta/llama-3.1-8b-instruct',
    provider: 'cloudflare',
    name: 'Llama 3.1 8B Instruct',
    description: 'General-purpose assistant',
    badge: 'AI',
    icon: Sparkles,
    color: 'text-lime-400'
  },
  {
    id: 'gemini-3.8-flash',
    provider: 'gemini',
    name: 'Gemini 3.8 Flash',
    description: 'Fast, multimodal model from Google',
    badge: 'Gemini',
    icon: Zap,
    color: 'text-blue-400'
  },
  {
    id: 'gemini-3.1-pro-preview',
    provider: 'gemini',
    name: 'Gemini 3.1 Pro',
    description: 'Advanced reasoning and coding for complex tasks',
    badge: 'Gemini',
    icon: Brain,
    color: 'text-cyan-400'
  },
  {
    id: 'gemini-3.5-flash-lite',
    provider: 'gemini',
    name: 'Gemini 3.5 Flash-Lite',
    description: 'Fast, cost-efficient model for lightweight tasks',
    badge: 'Gemini',
    icon: Cpu,
    color: 'text-cyan-400'
  },
  {
    id: 'openai/gpt-oss-20b',
    provider: 'groq',
    name: 'GPT-OSS 20B on Groq',
    description: 'Fast open-weight model for general chat and coding',
    badge: 'Groq',
    icon: Zap,
    color: 'text-orange-400'
  },
  {
    id: 'openai/gpt-oss-120b',
    provider: 'groq',
    name: 'GPT-OSS 120B on Groq',
    description: 'Larger open-weight model for complex tasks',
    badge: 'Groq',
    icon: Brain,
    color: 'text-orange-400'
  },
  {
    id: 'openrouter/free',
    provider: 'openrouter',
    name: 'OpenRouter Free',
    description: 'Automatically routes to an available free model',
    badge: 'OpenRouter',
    icon: Globe,
    color: 'text-sky-400'
  },
  {
    id: 'gpt-oss-120b',
    provider: 'cerebras',
    name: 'GPT-OSS 120B on Cerebras',
    description: 'Open-weight model served by Cerebras inference',
    badge: 'Cerebras',
    icon: Brain,
    color: 'text-emerald-400'
  },
  {
    id: 'qwen-3.8-27b',
    provider: 'cerebras',
    name: 'Qwen 3.8 27B on Cerebras',
    description: 'Multimodal Qwen model with reasoning and tool support',
    badge: 'Cerebras',
    icon: Cpu,
    color: 'text-emerald-400'
  },
  {
    id: 'nvidia/llama-3.1-nemotron-70b-instruct',
    provider: 'nvidia',
    name: 'Llama 3.1 Nemotron 70B',
    description: 'NVIDIA-tuned model for helpful text responses',
    badge: 'NVIDIA NIM',
    icon: Brain,
    color: 'text-lime-400'
  },
];

const VELORA_PERSONAS = [
  { id: 'standard', name: 'Standard Assistant', desc: 'Balanced, helpful & clear', prompt: 'You are Velora, a helpful, precise, and polite AI assistant created by Velora AI.' },
  { id: 'engineer', name: 'Senior Software Engineer', desc: 'Code-first, optimized & architecture focused', prompt: 'You are Velora acting as a Principal Software Engineer. Provide clean, well-architected code with minimal fluff.' },
  { id: 'creative', name: 'Creative Wordsmith', desc: 'Expressive, engaging & imaginative', prompt: 'You are Velora acting as a creative copywriter and strategist. Use evocative language and compelling structures.' },
  { id: 'executive', name: 'Concise Executive', desc: 'Direct bullet points & key takeaways', prompt: 'You are Velora acting as a Fortune 500 Chief of Staff. Give ultra-concise, actionable executive summaries.' },
  { id: 'tutor', name: 'Socratic Tutor', desc: 'Guides understanding with insightful prompts', prompt: 'You are Velora acting as a Socratic mentor. Break down complex topics step-by-step with intuitive analogies.' }
];

const VELORA_SUGGESTIONS = [
  {
    title: 'Design a distributed system',
    subtitle: 'for real-time chat with 99.99% availability',
    category: 'Architecture'
  },
  {
    title: 'Explain Quantum Entanglement',
    subtitle: 'using everyday metaphors and clean diagrams',
    category: 'Science'
  },
  {
    title: 'Draft a seed funding pitch deck',
    subtitle: 'for an autonomous AI workflow startup',
    category: 'Business'
  },
  {
    title: 'Refactor TypeScript state logic',
    subtitle: 'to use optimistic updates & local caching',
    category: 'Coding'
  }
];

type Attachment = {
  id: string;
  name: string;
  size: string;
  content?: string;
  mediaType?: string;
};

type Citation = {
  id: string;
  title: string;
  url: string;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachments?: Attachment[];
  reasoning?: string | null;
  citations?: Citation[];
  model?: string;
  isStreaming?: boolean;
};

type Chat = {
  id: string;
  title: string;
  pinned: boolean;
  createdAt: string;
  messages: ChatMessage[];
};

const CHAT_IMAGE_DB = 'velora-chat-images';
const CHAT_IMAGE_STORE = 'images';

function openChatImageDatabase(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(CHAT_IMAGE_DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(CHAT_IMAGE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open image storage.'));
    request.onblocked = () => reject(new Error('Image storage is blocked by another browser tab.'));
  });
}

async function storeChatImage(id: string, image: Blob): Promise<void> {
  const database = await openChatImageDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(CHAT_IMAGE_STORE, 'readwrite');
    transaction.objectStore(CHAT_IMAGE_STORE).put(image, id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Unable to save image.'));
    transaction.onabort = () => reject(transaction.error || new Error('Image save was cancelled.'));
  }).finally(() => database.close());
}

async function loadChatImage(id: string): Promise<Blob | undefined> {
  const database = await openChatImageDatabase();
  return new Promise<Blob | undefined>((resolve, reject) => {
    const request = database.transaction(CHAT_IMAGE_STORE, 'readonly')
      .objectStore(CHAT_IMAGE_STORE)
      .get(id);
    request.onsuccess = () => {
      const image: unknown = request.result;
      if (image === undefined || image instanceof Blob) {
        resolve(image);
        return;
      }
      reject(new Error('Stored image data has an invalid format.'));
    };
    request.onerror = () => reject(request.error || new Error('Unable to load image.'));
  }).finally(() => database.close());
}

function ImageAttachment({ attachment, className = '' }: {
  attachment: Attachment;
  className?: string;
}) {
  const [imageUrl, setImageUrl] = useState('');
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let objectUrl = '';
    let cancelled = false;

    loadChatImage(attachment.id).then((image) => {
      if (!image) throw new Error(`Image data for ${attachment.name} was not found.`);
      if (cancelled) return;
      objectUrl = URL.createObjectURL(image);
      setImageUrl(objectUrl);
    }).catch((error: unknown) => {
      if (cancelled) return;
      console.error('Unable to load an attached image:', error);
      setImageError(true);
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.id, attachment.name]);

  if (!imageUrl || imageError) {
    return (
      <div className={`flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-gray-400 ${className}`}>
        <ImageIcon className="h-4 w-4 shrink-0" />
        <span className="truncate">{attachment.name}</span>
        {imageError && <span className="shrink-0">Preview unavailable</span>}
      </div>
    );
  }

  return (
    <a
      href={imageUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open image ${attachment.name}`}
      className={`block overflow-hidden rounded-md border border-zinc-700 bg-zinc-950 ${className}`}
    >
      <img
        src={imageUrl}
        alt={attachment.name}
        className="block max-h-80 max-w-full object-contain"
      />
    </a>
  );
}

// --- HELPER FUNCTIONS & STORAGE HOOKS ---

function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) setStoredValue(JSON.parse(item) as T);
    } catch (error) {
      console.error(`Error reading key ${key} from localStorage:`, error);
    } finally {
      setIsInitialized(true);
    }
  }, [key]);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error writing key ${key} to localStorage:`, error);
    }
  }, [isInitialized, key, storedValue]);

  return [storedValue, setStoredValue];
}

// --- MAIN REACT COMPONENT ---

export default function App() {
  const { isLoaded, isSignedIn } = useAuth()

  // Persistence state
  const [chats, setChats] = useLocalStorage<Chat[]>('velora_ai_chats', []);
  const [activeChatId, setActiveChatId] = useLocalStorage<string | null>('velora_ai_active_id', null);
  const [selectedModelId, setSelectedModelId] = useLocalStorage('velora_ai_model', VELORA_MODELS[0].id);
  const [activePersonaId, setActivePersonaId] = useLocalStorage('velora_ai_persona', 'standard');
  const [theme, setTheme] = useLocalStorage<'dark' | 'light'>('velora_ai_theme', 'dark');
  const [systemPrompt, setSystemPrompt] = useLocalStorage('velora_ai_sysprompt', '');

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentExecutionStatus, setCurrentExecutionStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCustomInstructionsOpen, setIsCustomInstructionsOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentError, setAttachmentError] = useState('');
  const [aiServiceConfigured, setAiServiceConfigured] = useState<boolean | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
  const selectedProvider = VELORA_MODELS.find((model) => model.id === selectedModelId)?.provider
    || VELORA_MODELS[0].provider;

  // Speech & Editing
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Inline Rename & Delete
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameTitleText, setRenameTitleText] = useState('');
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  // Theme Syncing
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  // Check service configuration without exposing credentials to the browser.
  useEffect(() => {
    let cancelled = false;
    const checkAiServiceConfig = async () => {
      try {
        const response = await fetch(`/api/omniroute?provider=${selectedProvider}`, { cache: 'no-store' });
        if (!cancelled) setAiServiceConfigured(response.ok);
      } catch {
        if (!cancelled) setAiServiceConfigured(false);
      }
    };
    checkAiServiceConfig();
    const interval = window.setInterval(checkAiServiceConfig, 10 * 60 * 1000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [selectedProvider]);

  useEffect(() => {
    if (!VELORA_MODELS.some((model) => model.id === selectedModelId)) {
      setSelectedModelId(VELORA_MODELS[0].id);
    }
  }, [selectedModelId, setSelectedModelId]);

  // Active Chat derived helper
  const activeChat = useMemo(() => {
    return chats.find((c) => c.id === activeChatId) || null;
  }, [chats, activeChatId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, isGenerating, currentExecutionStatus]);

  // Keyboard Shortcuts (⌘K search, ⌘O new chat)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        handleCreateNewChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chats]);

  // Handlers
  const handleCreateNewChat = () => {
    const newId = Date.now().toString();
    const newChat = {
      id: newId,
      title: 'New Session',
      pinned: false,
      createdAt: new Date().toISOString(),
      messages: []
    };
    setChats([newChat, ...chats]);
    setActiveChatId(newId);
    setMobileSidebarOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    const supportedExtensions = /\.(txt|md|csv|json|log)$/i;
    const supportedImages = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    const isSupportedFile = (file: File) => (
      supportedExtensions.test(file.name) || supportedImages.has(file.type)
    );
    const supportedFiles = files.filter(isSupportedFile);
    const rejectedFiles = files.filter((file) => (
      !isSupportedFile(file)
      || (supportedImages.has(file.type) ? file.size > 5 * 1024 * 1024 : file.size > 200 * 1024)
    ));
    const readableFiles = supportedFiles.filter((file) => (
      supportedImages.has(file.type) ? file.size <= 5 * 1024 * 1024 : file.size <= 200 * 1024
    ));
    const availableSlots = Math.max(0, 5 - attachments.length);
    const filesToRead = readableFiles.slice(0, availableSlots);
    const errors: string[] = [];
    if (rejectedFiles.length > 0) {
      errors.push('Attach TXT, MD, CSV, JSON, or LOG files up to 200 KB, or PNG, JPG, GIF, or WebP images up to 5 MB.');
    }
    if (filesToRead.length < readableFiles.length) {
      errors.push('A maximum of 5 files can be attached to a message.');
    }

    try {
      const newAttachments = await Promise.all(filesToRead.map(async (file) => {
        const id = `${Date.now()}-${Math.random()}`;
        if (supportedImages.has(file.type)) {
          await storeChatImage(id, file);
          return {
            id,
            name: file.name,
            size: `${(file.size / 1024).toFixed(1)} KB`,
            mediaType: file.type,
          };
        }

        return {
          id,
          name: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          content: await file.text(),
        };
      }));
      setAttachments((previous) => [...previous, ...newAttachments].slice(0, 5));
      setAttachmentError(errors.join(' '));
    } catch (error) {
      console.error('Unable to save an attached file:', error);
      setAttachmentError('A selected file could not be saved in this browser. Check available storage and try again.');
    }
  };

  const handleStopGeneration = () => {
    streamAbortRef.current?.abort();
    setIsGenerating(false);
    setCurrentExecutionStatus('');
  };

  const handleSaveRename = (chatId: string) => {
    if (renameTitleText.trim()) {
      setChats((previous) => previous.map((chat) => (
        chat.id === chatId ? { ...chat, title: renameTitleText.trim() } : chat
      )));
    }
    setRenamingChatId(null);
  };

  const handleSaveEditedMessage = (messageId: string) => {
    if (!activeChatId) return;
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? {
              ...c,
              messages: c.messages.map((m) => (m.id === messageId ? { ...m, content: editingText } : m))
            }
          : c
      )
    );
    setEditingMessageId(null);
  };

  const handleToggleSpeak = (messageId: string, text: string) => {
    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setSpeakingMessageId(null);
      utterance.onerror = () => setSpeakingMessageId(null);
      setSpeakingMessageId(messageId);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleRegenerate = (msgIndex: number) => {
    if (!activeChat || isGenerating) return;
    const userMsg = activeChat.messages.slice(0, msgIndex).reverse().find((m) => m.role === 'user');
    if (userMsg) {
      handleSendMessage(userMsg.content, userMsg.attachments || [], userMsg.id);
    }
  };

  // Pin / Unpin Chat
  const handleTogglePin = (chatId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setChats((previous) => previous.map((chat) => (
      chat.id === chatId ? { ...chat, pinned: !chat.pinned } : chat
    )));
  };

  // Export Chat
  const handleExportChat = (chat: Chat) => {
    const textContent = chat.messages
      .map(m => `[${m.timestamp}] ${m.role.toUpperCase()}:\n${m.content}\n`)
      .join('\n---\n\n');
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${chat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Handle Send Message for Velora Engine
  const handleSendMessage = async (
    textToSend = input,
    attachedFiles = attachments,
    regenerateFromMessageId?: string,
  ) => {
    const text = textToSend.trim();
    if ((!text && attachedFiles.length === 0) && !regenerateFromMessageId) return;
    if (streamAbortRef.current) return;

    let targetChatId = activeChatId;
    let updatedChats = [...chats];

    if (regenerateFromMessageId) {
      const currentChat = updatedChats.find((chat) => chat.id === targetChatId);
      const userMessageIndex = currentChat?.messages.findIndex(
        (message) => message.id === regenerateFromMessageId && message.role === 'user',
      );
      if (!currentChat || userMessageIndex === undefined || userMessageIndex < 0) return;
      currentChat.messages = currentChat.messages.slice(0, userMessageIndex + 1);
    } else if (!targetChatId || !chats.some((chat) => chat.id === targetChatId)) {
      const newId = Date.now().toString();
      const firstTitle = text.length > 32 ? text.substring(0, 32) + '...' : text || 'New Session';
      const newChat = {
        id: newId,
        title: firstTitle,
        pinned: false,
        createdAt: new Date().toISOString(),
        messages: []
      };
      updatedChats = [newChat, ...chats];
      targetChatId = newId;
      setActiveChatId(newId);
    } else {
      const currentChat = updatedChats.find((c) => c.id === targetChatId);
      if (currentChat && (currentChat.title === 'New Chat' || currentChat.title === 'New Session' || !currentChat.title)) {
        currentChat.title = text.length > 32 ? text.substring(0, 32) + '...' : text || 'New Session';
      }
    }

    const chatIndex = updatedChats.findIndex((c) => c.id === targetChatId);
    if (chatIndex < 0) return;
    if (!regenerateFromMessageId) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        attachments: attachedFiles,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      updatedChats[chatIndex].messages.push(userMessage);
    }

    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: ChatMessage = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      model: selectedModelId,
      isStreaming: true
    };

    updatedChats[chatIndex].messages.push(aiMessage);
    setChats(updatedChats);

    setInput('');
    setAttachments([]);
    setAttachmentError('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsGenerating(true);
    const controller = new AbortController();
    streamAbortRef.current = controller;

    try {
      setCurrentExecutionStatus('Waiting for AI service...');

      const selectedPersonaObj = VELORA_PERSONAS.find(p => p.id === activePersonaId);
      const customPrompt = systemPrompt.trim();
      const activeSysPrompt = customPrompt && customPrompt !== VELORA_PERSONAS[0].prompt
        ? customPrompt
        : selectedPersonaObj?.prompt || VELORA_PERSONAS[0].prompt;
      if (controller.signal.aborted) return;
      const response = await fetch('/api/omniroute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          model: selectedModelId,
          messages: [
            { role: 'system', content: activeSysPrompt },
            ...updatedChats[chatIndex].messages.slice(0, -1).map((m) => ({
              role: m.role,
            content: m.role === 'user' && m.attachments?.some((file) => !file.mediaType?.startsWith('image/'))
                ? [
                    m.content,
                  ...m.attachments
                    .filter((file) => !file.mediaType?.startsWith('image/'))
                    .map((file) => `\n\n[Attached file: ${file.name}]\n${file.content || ''}`),
                ].join('')
              : m.content
            }))
          ],
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorMessage = `AI service returned ${response.status}.`;
        try {
          const errorBody: unknown = await response.json();
          if (typeof errorBody === 'object' && errorBody !== null
            && 'error' in errorBody && typeof errorBody.error === 'string') {
            errorMessage = errorBody.error;
          }
        } catch {
          // Keep the HTTP status message when the proxy returns a non-JSON error.
        }
        throw new Error(errorMessage);
      }
      if (!response.body) throw new Error('AI service returned an empty response.');
      setAiServiceConfigured(true);
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedContent = '';
      let buffer = '';
      let streamFinished = false;

      const processFrame = (frame: string) => {
        for (const line of frame.split(/\r?\n/)) {
          if (!line.startsWith('data:')) continue;
          const jsonStr = line.slice(5).trim();
          if (!jsonStr) continue;
          if (jsonStr === '[DONE]') {
            streamFinished = true;
            return;
          }

          const parsed = JSON.parse(jsonStr);
          if (typeof parsed.error === 'string') {
            throw new Error(parsed.error);
          }
          const token = parsed.choices?.[0]?.delta?.content
            || parsed.choices?.[0]?.message?.content
            || parsed.content
            || '';
          if (typeof token !== 'string' || token.length === 0) continue;
          accumulatedContent += token;
          setChats((previous) => previous.map((chat) => chat.id === targetChatId ? {
            ...chat,
            messages: chat.messages.map((message) => (
              message.id === aiMessageId ? { ...message, content: accumulatedContent } : message
            ))
          } : chat));
        }
      };

      while (!streamFinished) {
        const { done, value } = await reader.read();
        if (done) {
          buffer += decoder.decode();
          if (buffer.trim()) processFrame(buffer);
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        let frameMatch = /\r?\n\r?\n/.exec(buffer);
        while (frameMatch && !streamFinished) {
          processFrame(buffer.slice(0, frameMatch.index));
          buffer = buffer.slice(frameMatch.index + frameMatch[0].length);
          frameMatch = /\r?\n\r?\n/.exec(buffer);
        }
      }
      if (!accumulatedContent && !controller.signal.aborted) {
        throw new Error('AI service returned no answer content.');
      }
    } catch (err) {
      if (controller.signal.aborted) {
        setChats((previous) => previous.map((chat) => chat.id === targetChatId ? {
          ...chat,
          messages: chat.messages.map((message) => (
            message.id === aiMessageId && !message.content
              ? { ...message, content: 'Generation stopped.' }
              : message
          ))
        } : chat));
      } else {
        setAiServiceConfigured(false);
        const errorMessage = err instanceof Error
          ? `AI request failed: ${err.message}`
          : 'AI request failed. Check the connection and try again.';
        setChats((previous) => previous.map((chat) => chat.id === targetChatId ? {
          ...chat,
          messages: chat.messages.map((message) => (
            message.id === aiMessageId ? { ...message, content: errorMessage } : message
          ))
        } : chat));
      }
    } finally {
      if (streamAbortRef.current === controller) streamAbortRef.current = null;
      setIsGenerating(false);
      setCurrentExecutionStatus('');
      setChats((previous) => previous.map((chat) => (
        chat.id === targetChatId
          ? {
              ...chat,
              messages: chat.messages.map((message) => (
                message.id === aiMessageId ? { ...message, isStreaming: false } : message
              ))
            }
          : chat
      )));
    }
  };

  // Categorized & Pinned Chats list
  const categorizedChats = useMemo(() => {
    const now = new Date();
    const pinned: Chat[] = [];
    const today: Chat[] = [];
    const yesterday: Chat[] = [];
    const prev7Days: Chat[] = [];
    const older: Chat[] = [];

    chats.forEach((chat) => {
      if (chat.pinned) {
        pinned.push(chat);
        return;
      }
      const date = new Date(chat.createdAt || Date.now());
      const diffDays = Math.ceil(Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) today.push(chat);
      else if (diffDays === 2) yesterday.push(chat);
      else if (diffDays <= 7) prev7Days.push(chat);
      else older.push(chat);
    });

    const categories: { label: string; items: Chat[] }[] = [];
    if (pinned.length > 0) categories.push({ label: 'Pinned', items: pinned });
    if (today.length > 0) categories.push({ label: 'Today', items: today });
    if (yesterday.length > 0) categories.push({ label: 'Yesterday', items: yesterday });
    if (prev7Days.length > 0) categories.push({ label: 'Previous 7 Days', items: prev7Days });
    if (older.length > 0) categories.push({ label: 'Older', items: older });

    return categories;
  }, [chats]);

  if (!isLoaded) {
    return <div className="min-h-screen bg-[#0d0e11]" aria-busy="true" />
  }

  if (!isSignedIn) {
    return (
      <main className="min-h-screen bg-[#0d0e11] text-white flex items-center justify-center p-6">
        <section className="w-full max-w-md rounded-3xl border border-zinc-800 bg-[#14161c] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-400">
            <Sparkles className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to use Velora AI</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">Create an account or continue with a supported provider to access the AI workspace.</p>
          <SignInButton mode="modal">
            <button className="mt-7 w-full rounded-xl bg-lime-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-lime-400 focus:outline-none focus:ring-2 focus:ring-lime-300 focus:ring-offset-2 focus:ring-offset-[#14161c]">Continue with Google, GitHub, Apple, or email</button>
          </SignInButton>
          <p className="mt-4 text-xs text-zinc-500">Providers are configured in your Clerk dashboard.</p>
        </section>
      </main>
    )
  }

  const selectedModelObj = VELORA_MODELS.find((m) => m.id === selectedModelId) || VELORA_MODELS[0];
  const selectedPersonaObj = VELORA_PERSONAS.find((p) => p.id === activePersonaId) || VELORA_PERSONAS[0];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0d0e11] text-gray-100 font-sans antialiased selection:bg-lime-500/30 selection:text-lime-200">
      
      {/* --- MOBILE SIDEBAR OVERLAY --- */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* --- VELORA SIDEBAR --- */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col bg-[#121418] border-r border-zinc-800/80 transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'w-64' : 'w-0 md:w-0'
        } ${mobileSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="flex flex-col h-full overflow-hidden p-3">
          
          {/* Header Brand & New Chat */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 px-1">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-lime-500 via-blue-400 to-blue-500 flex items-center justify-center shadow-lg shadow-lime-500/20">
                <Sparkles className="w-4 h-4 text-black font-bold" />
              </div>
              <span className="font-bold text-sm tracking-wider bg-gradient-to-r from-white via-gray-200 to-lime-400 bg-clip-text text-transparent">
                VELORA
              </span>
            </div>
            <span className="sr-only" aria-live="polite">
              {aiServiceConfigured === true ? 'AI service ready' : aiServiceConfigured === false ? 'AI service unavailable' : 'Checking AI service'}
            </span>
            <span className={`h-1.5 w-1.5 rounded-full ${aiServiceConfigured === true ? 'bg-[#D4FF24]' : aiServiceConfigured === false ? 'bg-[#1558C9]' : 'bg-gray-500'}`} title={aiServiceConfigured === true ? 'AI service ready' : aiServiceConfigured === false ? 'AI service unavailable' : 'Checking AI service'} />
          </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="hidden md:flex p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
              title="Fold sidebar"
            >
              <X className="w-4 h-4" />
            </button>

            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>

          {/* New Chat Button */}
          <button
            onClick={handleCreateNewChat}
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-lime-500/10 via-zinc-800 to-zinc-800/80 border border-lime-500/20 hover:border-lime-500/40 hover:from-lime-500/20 text-lime-400 transition-all shadow-sm mb-2"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Session
            </span>
            <kbd className="text-[10px] px-1.5 py-0.5 bg-black/40 border border-zinc-700 rounded text-gray-400 font-mono">
              ⌘O
            </kbd>
          </button>

          {/* Search Trigger */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center justify-between w-full px-3 py-2 text-xs text-gray-400 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:bg-zinc-800 hover:text-gray-200 mb-3 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5" /> Search history...
            </span>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-zinc-800 rounded text-gray-400 font-mono">
              ⌘K
            </kbd>
          </button>

          {/* History List */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
            {categorizedChats.length === 0 ? (
              <div className="text-center py-10 text-xs text-gray-500">
                No conversations yet
              </div>
            ) : (
              categorizedChats.map((group) => (
                <div key={group.label} className="space-y-1">
                  <h3 className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                    {group.label === 'Pinned' && <Pin className="w-3 h-3 text-lime-400" />}
                    {group.label}
                  </h3>
                  {group.items.map((chat) => {
                    const isActive = chat.id === activeChatId;

                    if (renamingChatId === chat.id) {
                      return (
                        <div key={chat.id} className="px-2 py-1.5 flex items-center gap-1.5">
                          <input
                            type="text"
                            value={renameTitleText}
                            onChange={(e) => setRenameTitleText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(chat.id)}
                            className="w-full text-xs bg-zinc-900 border border-lime-500 rounded-lg px-2 py-1 outline-none text-white"
                            autoFocus
                          />
                          <button onClick={() => handleSaveRename(chat.id)} className="p-1 text-lime-400">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={chat.id}
                        onClick={() => {
                          setActiveChatId(chat.id);
                          setMobileSidebarOpen(false);
                        }}
                        className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                          isActive
                            ? 'bg-zinc-800 text-white font-medium border border-zinc-700/60 shadow-inner'
                            : 'text-gray-400 hover:bg-zinc-900/80 hover:text-gray-200'
                        }`}
                      >
                        <span className="truncate pr-14">{chat.title}</span>

                        {/* Inline Actions */}
                        <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 bg-gradient-to-l from-zinc-800 via-zinc-800 pl-2 transition-opacity">
                          <button
                            onClick={(e) => handleTogglePin(chat.id, e)}
                            className={`p-1 rounded hover:text-white ${chat.pinned ? 'text-lime-400' : 'text-gray-500'}`}
                            title={chat.pinned ? 'Unpin' : 'Pin chat'}
                          >
                            <Pin className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportChat(chat);
                            }}
                            className="p-1 text-gray-500 hover:text-white rounded"
                            title="Export text"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingChatId(chat.id);
                              setRenameTitleText(chat.title);
                            }}
                            className="p-1 text-gray-500 hover:text-white rounded"
                            title="Rename"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingChatId(chat.id);
                            }}
                            className="p-1 text-gray-500 hover:text-red-400 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* User & Settings Menu Footer */}
          <div className="pt-3 border-t border-zinc-800/80 relative">
            <button
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className="flex items-center justify-between w-full p-2 rounded-xl hover:bg-zinc-800/60 transition-colors"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-lime-600 to-blue-500 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-lime-500/20">
                  VA
                </div>
                <div className="flex flex-col text-left truncate">
                  <span className="text-xs font-semibold text-gray-200 truncate">Personal workspace</span>
                  <span className="text-[10px] text-lime-400 font-mono">Saved in this browser</span>
                </div>
              </div>
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute bottom-14 left-0 right-0 z-50 bg-[#181a20] border border-zinc-800 rounded-2xl shadow-2xl p-1.5 text-xs space-y-0.5">
                <button
                  onClick={() => {
                    setIsCustomInstructionsOpen(true);
                    setUserMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-xl hover:bg-zinc-800 text-gray-300"
                >
                  <Sliders className="w-4 h-4 text-lime-400" /> Velora Instructions
                </button>

                <button
                  onClick={() => {
                    setIsSettingsOpen(true);
                    setUserMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-xl hover:bg-zinc-800 text-gray-300"
                >
                  <Settings className="w-4 h-4 text-blue-400" /> Platform Settings
                </button>

                <div className="h-px bg-zinc-800 my-1" />

                <button
                  onClick={() => {
                    setChats([]);
                    setActiveChatId(null);
                    setUserMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-xl hover:bg-red-950/40 text-red-400"
                >
                  <Trash2 className="w-4 h-4" /> Purge all sessions
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* --- MAIN CHAT ENGINE ARCHITECTURE --- */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#0d0e11]">
        
        {/* Header Bar */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-zinc-800/80 bg-[#0d0e11]/90 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="hidden md:flex p-2 rounded-xl hover:bg-zinc-800 text-gray-300"
                title="Expand sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl hover:bg-zinc-800 text-gray-300"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Velora Model Selector */}
            <div className="relative">
              <button
                onClick={() => setModelDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 font-medium text-xs transition-all shadow-sm"
              >
                <span className="flex items-center gap-1.5">
                  <selectedModelObj.icon className={`w-4 h-4 ${selectedModelObj.color}`} />
                  <span className="font-semibold text-gray-200">{selectedModelObj.name}</span>
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {modelDropdownOpen && (
                <div className="absolute top-11 left-0 z-50 w-80 bg-[#14161c] border border-zinc-800 rounded-2xl shadow-2xl p-2 space-y-1">
                  {VELORA_MODELS.map((model) => {
                    const Icon = model.icon;
                    const isSelected = model.id === selectedModelId;
                    return (
                      <button
                        key={model.id}
                        onClick={() => {
                          setSelectedModelId(model.id);
                          setModelDropdownOpen(false);
                        }}
                        className={`flex items-start gap-3 w-full p-2.5 rounded-xl text-left transition-colors ${
                          isSelected ? 'bg-zinc-800/90 border border-zinc-700/60' : 'hover:bg-zinc-800/40'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mt-0.5 ${model.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-200">{model.name}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-lime-500/10 text-lime-400 border border-lime-500/20 font-mono">
                              {model.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                            {model.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Persona Switcher Pill */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setPersonaDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/50 border border-zinc-800/60 hover:border-zinc-700 text-xs text-gray-400 hover:text-gray-200"
              >
                <Compass className="w-3.5 h-3.5 text-lime-400" />
                <span>{selectedPersonaObj.name}</span>
                <ChevronDown className="w-3 h-3 text-gray-500" />
              </button>

              {personaDropdownOpen && (
                <div className="absolute top-11 left-0 z-50 w-64 bg-[#14161c] border border-zinc-800 rounded-2xl shadow-2xl p-1.5 space-y-1">
                  {VELORA_PERSONAS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setActivePersonaId(p.id);
                        setPersonaDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl text-xs transition-colors ${
                        activePersonaId === p.id ? 'bg-zinc-800 text-lime-400 font-semibold' : 'hover:bg-zinc-800/50 text-gray-300'
                      }`}
                    >
                      <div>{p.name}</div>
                      <div className="text-[10px] text-gray-500 font-normal">{p.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-gray-400 hover:text-gray-200 text-xs flex items-center gap-1.5 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </header>

        {/* Message Feed / Welcome Screen */}
        <div className="flex-1 overflow-y-auto px-4 md:px-0 scrollbar-thin scrollbar-thumb-zinc-800">
          {!activeChat || activeChat.messages.length === 0 ? (
            
            /* EMPTY CHAT STATE */
            <div className="max-w-2xl mx-auto h-full flex flex-col items-center justify-center text-center px-4 py-12">
              <div className="mb-5">
                <div className="w-14 h-14 rounded-md bg-zinc-900 border border-zinc-700 flex items-center justify-center text-lime-400">
                  <Sparkles className="w-8 h-8" />
                </div>
              </div>

              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2 text-white">
                Start a conversation
              </h1>
              <p className="text-sm text-gray-400 max-w-md mb-8">
                Choose a model, ask a question, or attach a text file or image.
              </p>

              {/* Suggestions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                {VELORA_SUGGESTIONS.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(`${item.title} ${item.subtitle}`)}
                    className="p-4 rounded-md border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/80 hover:border-zinc-600 text-left transition-colors group relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-lime-400 mb-1">
                      <span>{item.category}</span>
                      <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-lime-400 transition-colors" />
                    </div>
                    <div className="text-xs font-semibold text-gray-200 group-hover:text-white">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {item.subtitle}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            
            /* ACTIVE MESSAGES CHAT STREAM */
            <div className="max-w-3xl mx-auto py-6 space-y-6">
              {activeChat.messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                const messageModelName = VELORA_MODELS.find((model) => model.id === msg.model)?.name
                  || msg.model;

                return (
                  <div key={msg.id} className={`group relative flex gap-3 text-sm leading-relaxed ${isUser ? 'flex-row-reverse' : ''}`}>
                    
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {isUser ? (
                        <div className="w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-gray-200 text-xs font-semibold">
                          VA
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-zinc-900 border border-zinc-700 flex items-center justify-center text-lime-400">
                          <Sparkles className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Content Body */}
                    <div className={`min-w-0 space-y-2 ${isUser ? 'max-w-[85%]' : 'flex-1'}`}>
                      <div className={`flex items-center justify-between gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex items-center gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                          <span className="font-semibold text-xs text-gray-200">
                            {isUser ? 'You' : 'Velora AI'}
                          </span>
                          {!isUser && msg.model && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-zinc-900 border border-zinc-700 text-gray-400">
                              {messageModelName}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500">{msg.timestamp}</span>
                      </div>

                      {/* Message Content & Inline Edit */}
                      {editingMessageId === msg.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full text-sm bg-zinc-900 border border-zinc-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-lime-500 text-white"
                            rows={3}
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setEditingMessageId(null)}
                              className="px-3 py-1.5 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 font-medium"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveEditedMessage(msg.id)}
                              className="px-3 py-1.5 rounded-lg text-xs bg-lime-600 hover:bg-lime-500 text-white font-medium"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={`text-gray-300 whitespace-pre-wrap leading-relaxed ${isUser ? 'rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3' : ''}`}>
                          {renderMarkdownContent(msg.content)}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-3">
                              {msg.attachments.map((file) => (
                                file.mediaType?.startsWith('image/')
                                  ? <ImageAttachment key={file.id} attachment={file} className="w-fit max-w-full" />
                                  : (
                                    <span key={file.id} className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-[11px] text-gray-400">
                                      <Paperclip className="h-3 w-3 text-lime-400" />
                                      {file.name}
                                    </span>
                                  )
                              ))}
                            </div>
                          )}
                          {msg.isStreaming && (
                            <span className="sr-only">Generating response</span>
                          )}
                        </div>
                      )}

                      {/* Toolbar Actions */}
                      {!isUser && !msg.isStreaming && (
                        <div className="flex items-center gap-1 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => navigator.clipboard.writeText(msg.content)}
                            className="p-1.5 rounded-lg hover:bg-zinc-800 text-gray-500 hover:text-gray-200"
                            title="Copy response"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleSpeak(msg.id, msg.content)}
                            className={`p-1.5 rounded-lg hover:bg-zinc-800 ${
                              speakingMessageId === msg.id ? 'text-lime-400' : 'text-gray-500'
                            }`}
                            title="Read aloud"
                          >
                            {speakingMessageId === msg.id ? (
                              <VolumeX className="w-3.5 h-3.5" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleRegenerate(index)}
                            className="p-1.5 rounded-lg hover:bg-zinc-800 text-gray-500 hover:text-gray-200"
                            title="Regenerate response"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Live Streaming Execution Status Banner */}
              {isGenerating && currentExecutionStatus && (
                <div className="flex items-center gap-3 border-l border-zinc-700 py-2 pl-3 text-gray-400 text-xs">
                  <Cpu className="w-4 h-4" />
                  <span>{currentExecutionStatus}</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-zinc-800 bg-[#0d0e11] p-4">
          <div className="max-w-3xl mx-auto space-y-2">
            
            {/* Pending attachment previews */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 px-2" aria-label="Attachments ready to send">
                {attachments.map((file) => (
                  <div key={file.id} className="relative">
                    {file.mediaType?.startsWith('image/') ? (
                      <ImageAttachment
                        attachment={file}
                        className="h-20 w-24 flex items-center justify-center [&_img]:max-h-16 [&_img]:w-full"
                      />
                    ) : (
                      <div className="flex h-20 w-36 items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-xs text-gray-300">
                        <Paperclip className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        <span className="truncate">{file.name}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setAttachments((previous) => previous.filter((a) => a.id !== file.id))}
                      className="absolute -right-1.5 -top-1.5 rounded-sm border border-zinc-700 bg-zinc-950 p-1 text-gray-300 hover:text-white"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {attachmentError && (
              <p role="alert" className="px-2 text-xs text-amber-400">{attachmentError}</p>
            )}

            {/* Message composer */}
            <div className="relative flex items-end bg-[#14161c] border border-zinc-800 rounded-md p-2 focus-within:border-zinc-600 transition-colors">
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                accept=".txt,.md,.csv,.json,.log,image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-zinc-800/80 transition-colors"
                title="Attach text files up to 200 KB or PNG, JPG, GIF, or WebP images up to 5 MB"
                aria-label="Attach files or images"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask Velora anything..."
                rows={1}
                className="flex-1 bg-transparent border-0 text-sm text-gray-100 placeholder-gray-500 outline-none resize-none px-3 py-2 max-h-36 scrollbar-thin scrollbar-thumb-zinc-700"
              />

              {isGenerating ? (
                <button
                  type="button"
                  onClick={handleStopGeneration}
                  className="p-2.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-md hover:bg-red-500/30 transition-colors"
                  title="Stop generation"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!input.trim() && attachments.length === 0}
                  className={`p-2.5 rounded-md transition-colors ${
                    input.trim() || attachments.length > 0
                      ? 'bg-lime-500 text-black hover:bg-lime-400'
                      : 'bg-zinc-800 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}
            </div>

            <p className="text-[10px] text-center text-gray-500 font-mono">
              Velora AI can make mistakes. Verify critical facts and code outputs.
            </p>
          </div>
        </div>

      </main>

      {/* Modal overlays */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-20 p-4" onClick={() => setIsSearchOpen(false)}>
          <div className="w-full max-w-lg bg-[#181a20] border border-zinc-800 rounded-2xl p-4 shadow-2xl space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search session titles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-white outline-none"
                autoFocus
              />
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {chats.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase())).map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => {
                    setActiveChatId(chat.id);
                    setIsSearchOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-zinc-800 text-gray-300 flex justify-between items-center"
                >
                  <span className="truncate">{chat.title}</span>
                  <span className="text-[10px] text-gray-500 font-mono">{new Date(chat.createdAt).toLocaleDateString()}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsShareModalOpen(false)}>
          <div className="w-full max-w-sm bg-[#181a20] border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-lime-400" /> Share Session
              </h2>
              <button onClick={() => setIsShareModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-400">Copy this conversation as plain text to share it. No public link is created.</p>
            <div className="flex items-center gap-2">
              <textarea
                readOnly
                rows={4}
                value={activeChat?.messages.map((message) => (
                  `${message.role.toUpperCase()}:\n${message.content}`
                )).join('\n\n') || ''}
                className="w-full resize-none bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-xs text-gray-300 font-mono outline-none"
              />
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(activeChat?.messages.map((message) => (
                      `${message.role.toUpperCase()}:\n${message.content}`
                    )).join('\n\n') || '');
                    setCopyStatus('Transcript copied.');
                    setIsShareModalOpen(false);
                  } catch {
                    setCopyStatus('Clipboard access failed. Select and copy the transcript.');
                  }
                }}
                disabled={!activeChat}
                className="px-3 py-2 bg-lime-600 hover:bg-lime-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl"
              >
                Copy transcript
              </button>
            </div>
            {copyStatus && <p role="status" className="text-xs text-gray-400">{copyStatus}</p>}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsSettingsOpen(false)}>
          <div className="w-full max-w-md bg-[#181a20] border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-lime-400" /> Platform Settings
              </h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <p className="text-gray-400">
                AI service credentials are read from the server-side .env file and are never sent to your browser.
              </p>
              <div className="flex items-center justify-between pt-2">
                <span className="text-gray-300">Appearance Mode</span>
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="px-3 py-1.5 bg-zinc-800 rounded-xl border border-zinc-700 text-gray-200 flex items-center gap-1.5"
                >
                  {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-lime-400" /> : <Sun className="w-3.5 h-3.5 text-lime-400" />}
                  <span className="capitalize">{theme}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Instructions Modal */}
      {isCustomInstructionsOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsCustomInstructionsOpen(false)}>
          <div className="w-full max-w-md bg-[#181a20] border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-lime-400" /> Custom Instructions
              </h2>
              <button onClick={() => setIsCustomInstructionsOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <label className="block text-gray-400 font-medium">System Prompt Behavior Override</label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={4}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white outline-none focus:border-lime-500 font-mono text-xs"
              />
              <button
                onClick={() => setIsCustomInstructionsOpen(false)}
                className="w-full py-2 bg-lime-600 hover:bg-lime-500 text-white font-medium rounded-xl transition-colors"
              >
                Apply System Persona
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingChatId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-[#181a20] border border-zinc-800 rounded-2xl p-4 shadow-2xl space-y-3 text-center">
            <h3 className="text-sm font-bold text-white">Delete conversation?</h3>
            <p className="text-xs text-gray-400">This will permanently erase this session history.</p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeletingChatId(null)}
                className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-gray-300 rounded-xl text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setChats(chats.filter((c) => c.id !== deletingChatId));
                  if (activeChatId === deletingChatId) setActiveChatId(null);
                  setDeletingChatId(null);
                }}
                className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- LIGHTWEIGHT MARKDOWN HELPER WITH CODE BLOCK COPY ---

function renderMarkdownContent(content: string) {
  if (!content) return null;

  // Split content by code fences (```)
  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const firstLineEnd = part.indexOf('\n');
      const language = part.slice(3, firstLineEnd).trim() || 'code';
      const codeText = part.slice(firstLineEnd + 1, -3);

      return <CodeBlock key={index} language={language} code={codeText} />;
    }

    // Process standard text (headings, bold, lists, tables)
    return (
      <div key={index} className="space-y-2 my-1">
        {part.split('\n').map((line, lIdx) => {
          if (line.startsWith('### ')) {
            return <h3 key={lIdx} className="text-base font-bold text-gray-900 dark:text-white mt-3 mb-1">{line.replace('### ', '')}</h3>;
          }
          if (line.startsWith('## ')) {
            return <h2 key={lIdx} className="text-lg font-bold text-gray-900 dark:text-white mt-4 mb-2">{line.replace('## ', '')}</h2>;
          }
          if (line.startsWith('# ')) {
            return <h1 key={lIdx} className="text-xl font-extrabold text-gray-900 dark:text-white mt-4 mb-2">{line.replace('# ', '')}</h1>;
          }
          if (line.startsWith('- ')) {
            return <li key={lIdx} className="ml-4 list-disc text-gray-800 dark:text-gray-200">{parseInlineFormatting(line.replace('- ', ''))}</li>;
          }
          if (line.startsWith('> ')) {
            return <blockquote key={lIdx} className="pl-3 border-l-2 border-lime-500 italic text-gray-600 dark:text-gray-400 my-2">{parseInlineFormatting(line.replace('> ', ''))}</blockquote>;
          }
          return <p key={lIdx}>{parseInlineFormatting(line)}</p>;
        })}
      </div>
    );
  });
}

function parseInlineFormatting(text: string) {
  // Bold formatting **text**
  const boldParts = text.split(/(\*\*.*?\*\*)/g);
  return boldParts.map((bPart, i) => {
    if (bPart.startsWith('**') && bPart.endsWith('**')) {
      return <strong key={i} className="font-semibold text-gray-900 dark:text-white">{bPart.slice(2, -2)}</strong>;
    }
    // Inline code `code`
    const codeParts = bPart.split(/(`.*?`)/g);
    return codeParts.map((cPart, j) => {
      if (cPart.startsWith('`') && cPart.endsWith('`')) {
        return <code key={j} className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 font-mono text-xs text-lime-600 dark:text-lime-400">{cPart.slice(1, -1)}</code>;
      }
      return cPart;
    });
  });
}

// Code Block Component with Header & Copy Functionality
function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-800 bg-[#1e1e1e] text-gray-100 font-mono text-xs">
      <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-zinc-800 text-gray-400">
        <span className="capitalize text-[11px] font-medium">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 hover:text-white transition-colors text-[11px]"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-lime-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy code'}
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="leading-relaxed">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
