import { useState, useEffect, useRef } from 'react';
import {
  X,
  Minus,
  Clock,
  Send,
  Loader2,
  FileText,
  Music,
  Video,
  MapPin,
  User,
  Image as ImageIcon,
  Smile,
  Paperclip,
  Mic,
  Camera,
  File,
} from 'lucide-react';
import { useChatWindowsStore } from '@/stores/chatWindowsStore';
import { conversationsApi } from '@/lib/api';
import type { Conversation, Message } from '@/lib/api';

// Common emojis for quick access
const COMMON_EMOJIS = [
  '😀', '😂', '😊', '🥰', '😎', '🤔', '😢', '😡',
  '👍', '👎', '👏', '🙏', '💪', '🤝', '✌️', '👋',
  '❤️', '💕', '💯', '🔥', '⭐', '✨', '🎉', '🎊',
  '✅', '❌', '⚠️', '❓', '💡', '📌', '🔔', '💬',
];

interface ChatWindowProps {
  window: {
    id: string;
    conversation: Conversation;
    messages: Message[];
    isMinimized: boolean;
    isLoading: boolean;
    hasMoreMessages: boolean;
    position: number;
  };
}

export function ChatWindow({ window }: ChatWindowProps) {
  const {
    closeWindow,
    minimizeWindow,
    restoreWindow,
    setActiveWindow,
    setMessages,
    addMessage,
    setLoading,
    setHasMore,
    updateConversation,
  } = useChatWindowsStore();

  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadingFile, setUploadingFile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { id, conversation, messages, isMinimized, isLoading } = window;

  // Load messages on mount
  useEffect(() => {
    loadMessages();
    conversationsApi.update(id, { mark_read: true }).catch(console.error);
  }, [id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && !isMinimized) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMinimized]);

  // Poll for new messages
  const latestMessageRef = useRef<string | null>(null);

  useEffect(() => {
    if (messages.length > 0) {
      latestMessageRef.current = messages[messages.length - 1].id;
    }
  }, [messages]);

  useEffect(() => {
    if (isMinimized) return;

    const pollMessages = async () => {
      try {
        const { messages: newMessages } = await conversationsApi.getMessages(id, 50);
        const currentLatestId = latestMessageRef.current;
        const newLatestId = newMessages.length > 0 ? newMessages[newMessages.length - 1].id : null;

        if (newLatestId && newLatestId !== currentLatestId) {
          setMessages(id, newMessages);
        }
      } catch (err) {
        console.error('Failed to poll messages:', err);
      }
    };

    const interval = setInterval(pollMessages, 2000);
    return () => clearInterval(interval);
  }, [id, isMinimized, setMessages]);

  const loadMessages = async () => {
    setLoading(id, true);
    try {
      const { conversation: conv, messages: msgs, pagination } = await conversationsApi.get(id, 50);
      setMessages(id, msgs);
      setHasMore(id, pagination.has_more);
      updateConversation(id, conv);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(id, false);
    }
  };

  const quickPollForResponses = async () => {
    const delays = [500, 1000, 2000, 3000];
    for (const delay of delays) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      try {
        const { messages: newMessages } = await conversationsApi.getMessages(id, 50);
        const newLatestId = newMessages.length > 0 ? newMessages[newMessages.length - 1].id : null;
        if (newLatestId && newLatestId !== latestMessageRef.current) {
          setMessages(id, newMessages);
        }
      } catch (err) {
        console.error('Quick poll failed:', err);
      }
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;

    const messageText = inputValue.trim();
    setInputValue('');
    setSending(true);
    setError(null);
    setShowEmojiPicker(false);

    try {
      const { message } = await conversationsApi.sendMessage(id, messageText);
      addMessage(id, message);
      updateConversation(id, {
        last_message_at: message.sent_at,
        last_message_preview: messageText.substring(0, 100),
        last_message_direction: 'outbound',
      });
      quickPollForResponses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setInputValue(messageText);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Upload file to CDN and return URL
  const uploadToCdn = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/cdn/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    const result = await response.json();
    return result.url;
  };

  // Handle image upload
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setShowAttachMenu(false);
    setError(null);

    try {
      const mediaUrl = await uploadToCdn(file);
      const { message } = await conversationsApi.sendImage(id, mediaUrl);
      addMessage(id, message);
      quickPollForResponses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send image');
    } finally {
      setUploadingFile(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  // Handle video upload
  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setShowAttachMenu(false);
    setError(null);

    try {
      const mediaUrl = await uploadToCdn(file);
      const { message } = await conversationsApi.sendVideo(id, mediaUrl);
      addMessage(id, message);
      quickPollForResponses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send video');
    } finally {
      setUploadingFile(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  // Handle file upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setShowAttachMenu(false);
    setError(null);

    try {
      const mediaUrl = await uploadToCdn(file);
      const { message } = await conversationsApi.sendDocument(id, mediaUrl, file.name);
      addMessage(id, message);
      quickPollForResponses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send file');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/ogg; codecs=opus' });
        stream.getTracks().forEach((track) => track.stop());

        // Upload and send
        setUploadingFile(true);
        try {
          const file = new File([audioBlob], `voice-${Date.now()}.ogg`, { type: 'audio/ogg' });
          const mediaUrl = await uploadToCdn(file);
          const { message } = await conversationsApi.sendAudio(id, mediaUrl);
          addMessage(id, message);
          quickPollForResponses();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to send voice message');
        } finally {
          setUploadingFile(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      setError('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      audioChunksRef.current = [];
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getWindowTimeRemaining = () => {
    if (!conversation.window_expires_at) return null;
    const expires = new Date(conversation.window_expires_at);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    if (diffMs <= 0) return null;

    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);

    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Parse metadata safely
  const parseMetadata = (metadata: Record<string, unknown> | string | null): Record<string, unknown> => {
    if (!metadata) return {};
    if (typeof metadata === 'string') {
      try {
        return JSON.parse(metadata);
      } catch {
        return {};
      }
    }
    return metadata;
  };

  const renderMessageContent = (msg: Message) => {
    const { message_type, content, media_url, metadata } = msg;
    const meta = parseMetadata(metadata);

    switch (message_type) {
      case 'image':
        return (
          <div className="space-y-1">
            {media_url ? (
              <img
                src={media_url}
                alt="Image"
                className="max-w-full rounded-lg cursor-pointer hover:opacity-90"
                style={{ maxHeight: '200px' }}
                onClick={() => globalThis.window.open(media_url, '_blank')}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`flex items-center gap-1 text-gray-500 ${media_url ? 'hidden' : ''}`}>
              <ImageIcon size={16} />
              <span className="text-sm">[Image]</span>
            </div>
            {content && <p className="text-sm whitespace-pre-wrap break-words">{content}</p>}
          </div>
        );

      case 'video':
        return (
          <div className="space-y-1">
            {media_url ? (
              <video
                src={media_url}
                controls
                className="max-w-full rounded-lg"
                style={{ maxHeight: '200px' }}
              />
            ) : (
              <div className="flex items-center gap-1 text-gray-500">
                <Video size={16} />
                <span className="text-sm">[Video]</span>
              </div>
            )}
            {content && <p className="text-sm whitespace-pre-wrap break-words">{content}</p>}
          </div>
        );

      case 'audio':
        return (
          <div className="space-y-1">
            {media_url ? (
              <audio src={media_url} controls className="max-w-full" />
            ) : (
              <div className="flex items-center gap-1 text-gray-500">
                <Music size={16} />
                <span className="text-sm">[Audio]</span>
              </div>
            )}
          </div>
        );

      case 'document':
        return (
          <div className="space-y-1">
            {media_url ? (
              <a
                href={media_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <FileText size={20} className="text-gray-600" />
                <span className="text-sm text-blue-600 underline truncate">
                  {content || (meta.filename as string) || 'Document'}
                </span>
              </a>
            ) : (
              <div className="flex items-center gap-1 text-gray-500">
                <FileText size={16} />
                <span className="text-sm">[Document]</span>
              </div>
            )}
          </div>
        );

      case 'sticker':
        return (
          <div>
            {media_url ? (
              <img
                src={media_url}
                alt="Sticker"
                className="max-w-[120px] max-h-[120px]"
              />
            ) : (
              <span className="text-sm">[Sticker]</span>
            )}
          </div>
        );

      case 'location':
        return (
          <div className="flex items-center gap-1 text-gray-600">
            <MapPin size={16} />
            <span className="text-sm">{content || (meta.location_name as string) || '[Location]'}</span>
          </div>
        );

      case 'contact':
        return (
          <div className="flex items-center gap-1 text-gray-600">
            <User size={16} />
            <span className="text-sm">{content || '[Contact]'}</span>
          </div>
        );

      case 'button':
      case 'interactive':
        // Render interactive message with buttons
        return (
          <div className="space-y-2">
            <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
            {meta.buttons && Array.isArray(meta.buttons) && (
              <div className="space-y-1 pt-1 border-t border-gray-200">
                {(meta.buttons as Array<{ id: string; title: string }>).map((btn, i) => (
                  <div
                    key={btn.id || i}
                    className="text-center py-1.5 text-sm text-blue-500 bg-white/50 rounded"
                  >
                    {btn.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'list':
        // Render list message
        return (
          <div className="space-y-2">
            {meta.headerText && (
              <p className="text-sm font-bold">{meta.headerText as string}</p>
            )}
            <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
            {meta.footerText && (
              <p className="text-xs text-gray-500 italic">{meta.footerText as string}</p>
            )}
            {meta.sections && Array.isArray(meta.sections) && (
              <div className="pt-1 border-t border-gray-200">
                <div className="text-center py-1.5 text-sm text-blue-500 bg-white/50 rounded">
                  {(meta.buttonText as string) || 'View Options'}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return <p className="text-sm whitespace-pre-wrap break-words">{content || '[Media]'}</p>;
    }
  };

  // Minimized state
  if (isMinimized) {
    return (
      <div
        onClick={() => restoreWindow(id)}
        className="pointer-events-auto w-64 bg-[#075E54] rounded-t-lg cursor-pointer hover:bg-[#064d47] transition-colors shadow-lg"
      >
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-[#DCF8C6] flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-[#075E54]">
              {(conversation.contact_name || conversation.contact_phone)[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {conversation.contact_name || conversation.contact_phone}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeWindow(id);
            }}
            className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Full window
  return (
    <div
      onClick={() => {
        setActiveWindow(id);
        setShowEmojiPicker(false);
        setShowAttachMenu(false);
      }}
      className="pointer-events-auto w-80 bg-white rounded-t-lg shadow-2xl flex flex-col overflow-hidden"
      style={{ height: '450px' }}
    >
      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        onChange={handleVideoSelect}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Header */}
      <div className="bg-[#075E54] px-3 py-2 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#DCF8C6] flex items-center justify-center flex-shrink-0">
          <span className="text-lg font-semibold text-[#075E54]">
            {(conversation.contact_name || conversation.contact_phone)[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {conversation.contact_name || conversation.contact_phone}
          </p>
          <p className="text-xs text-white/70 truncate">{conversation.contact_phone}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              minimizeWindow(id);
            }}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded"
          >
            <Minus size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeWindow(id);
            }}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* 24-hour window indicator */}
      <div
        className={`px-3 py-1.5 text-xs flex items-center gap-1 ${
          conversation.in_free_window
            ? 'bg-green-50 text-green-700'
            : 'bg-orange-50 text-orange-700'
        }`}
      >
        <Clock size={12} />
        {conversation.in_free_window ? (
          <span>Free messaging window: {getWindowTimeRemaining() || 'Active'}</span>
        ) : (
          <span>Outside 24h window - Template messages only</span>
        )}
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#ECE5DD]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d4d4d4\' fill-opacity=\'0.2\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin text-[#25D366]" size={32} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            No messages yet
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 shadow-sm ${
                    msg.direction === 'outbound'
                      ? 'bg-[#DCF8C6] text-gray-900'
                      : 'bg-white text-gray-900'
                  }`}
                >
                  {renderMessageContent(msg)}
                  <p
                    className={`text-[10px] mt-1 text-right ${
                      msg.direction === 'outbound' ? 'text-gray-600' : 'text-gray-400'
                    }`}
                  >
                    {formatMessageTime(msg.sent_at)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 bg-red-50 text-red-600 text-xs">{error}</div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="border-t border-gray-200 bg-white p-2">
          <div className="grid grid-cols-8 gap-1">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={(e) => {
                  e.stopPropagation();
                  setInputValue((v) => v + emoji);
                }}
                className="text-xl p-1 hover:bg-gray-100 rounded"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Attachment Menu */}
      {showAttachMenu && (
        <div className="border-t border-gray-200 bg-white p-3">
          <div className="grid grid-cols-4 gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                imageInputRef.current?.click();
              }}
              className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 rounded-lg"
            >
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                <ImageIcon size={20} className="text-white" />
              </div>
              <span className="text-xs text-gray-600">Image</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                videoInputRef.current?.click();
              }}
              className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 rounded-lg"
            >
              <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center">
                <Video size={20} className="text-white" />
              </div>
              <span className="text-xs text-gray-600">Video</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 rounded-lg"
            >
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                <File size={20} className="text-white" />
              </div>
              <span className="text-xs text-gray-600">Document</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                imageInputRef.current?.click();
              }}
              className="flex flex-col items-center gap-1 p-2 hover:bg-gray-100 rounded-lg"
            >
              <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                <Camera size={20} className="text-white" />
              </div>
              <span className="text-xs text-gray-600">Camera</span>
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-2 bg-gray-100 border-t border-gray-200">
        {isRecording ? (
          // Recording UI
          <div className="flex items-center gap-2">
            <button
              onClick={cancelRecording}
              className="p-2 text-red-500 hover:bg-red-50 rounded-full"
            >
              <X size={20} />
            </button>
            <div className="flex-1 flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-gray-600">{formatRecordingTime(recordingTime)}</span>
            </div>
            <button
              onClick={stopRecording}
              className="p-2 bg-[#25D366] text-white rounded-full hover:bg-[#128C7E]"
            >
              <Send size={20} />
            </button>
          </div>
        ) : (
          // Normal input UI
          <div className="flex items-end gap-2">
            {/* Emoji button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowEmojiPicker(!showEmojiPicker);
                setShowAttachMenu(false);
              }}
              disabled={!conversation.in_free_window}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full disabled:opacity-50"
            >
              <Smile size={20} />
            </button>

            {/* Attachment button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAttachMenu(!showAttachMenu);
                setShowEmojiPicker(false);
              }}
              disabled={!conversation.in_free_window || uploadingFile}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full disabled:opacity-50"
            >
              {uploadingFile ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Paperclip size={20} />
              )}
            </button>

            {/* Text input */}
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              onFocus={() => {
                setShowEmojiPicker(false);
                setShowAttachMenu(false);
              }}
              placeholder={
                conversation.in_free_window ? 'Type a message...' : 'Outside 24h window'
              }
              disabled={!conversation.in_free_window || sending}
              className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-[#25D366] disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows={1}
              style={{ maxHeight: '100px' }}
            />

            {/* Send or Voice button */}
            {inputValue.trim() ? (
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || !conversation.in_free_window || sending}
                className="p-2 bg-[#25D366] text-white rounded-full hover:bg-[#128C7E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            ) : (
              <button
                onClick={startRecording}
                disabled={!conversation.in_free_window || uploadingFile}
                className="p-2 bg-[#25D366] text-white rounded-full hover:bg-[#128C7E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Mic size={20} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
