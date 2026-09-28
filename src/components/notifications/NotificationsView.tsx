import React from 'react';
import { Bell, CheckCheck, CheckCircle2, AlertTriangle, Info, ShieldAlert, Sparkles } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { AppNotification } from '../../types/index';

export const NotificationsView: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle2 className="w-5 h-5 text-[#166534]" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'ALERT':
        return <ShieldAlert className="w-5 h-5 text-red-600" />;
      case 'SYSTEM':
        return <Sparkles className="w-5 h-5 text-zinc-800" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#111111] tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-zinc-800" />
            <span>Notification Center</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            System alerts, account provisions, role updates, and branch assignments.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 bg-white hover:bg-zinc-50 text-[#111111] text-xs font-bold rounded-xl border border-[#e5e7eb] shadow-sm transition flex items-center gap-2 self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4 text-[#166534]" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden shadow-sm divide-y divide-[#f1f5f9]">
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            You have no notifications in your inbox.
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => markAsRead(notif.id)}
              className={`p-4 sm:p-5 flex items-start gap-4 transition cursor-pointer hover:bg-[#f8fafc] ${
                !notif.read ? 'bg-[#f0f9ee]/40' : ''
              }`}
            >
              <div className="p-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] shrink-0 mt-0.5">
                {getNotificationIcon(notif.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-bold ${!notif.read ? 'text-[#111111]' : 'text-zinc-600'}`}>
                      {notif.title}
                    </h3>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-[#111111]" />
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono shrink-0">
                    {new Date(notif.created_at).toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-zinc-500 leading-relaxed">
                  {notif.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
