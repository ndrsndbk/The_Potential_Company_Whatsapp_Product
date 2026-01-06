import { useChatWindowsStore } from '@/stores/chatWindowsStore';
import { ChatWindow } from './ChatWindow';

export function ChatWindowsContainer() {
  const openWindows = useChatWindowsStore((state) => state.openWindows);

  if (openWindows.length === 0) return null;

  return (
    <div className="fixed bottom-0 right-0 flex items-end gap-2 p-4 pointer-events-none z-50">
      {openWindows.map((window) => (
        <ChatWindow key={window.id} window={window} />
      ))}
    </div>
  );
}
