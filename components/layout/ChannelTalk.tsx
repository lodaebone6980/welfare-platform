'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    ChannelIO?: any;
    ChannelIOInitialized?: boolean;
  }
}

export default function ChannelTalk() {
  useEffect(() => {
    const pluginKey = process.env.NEXT_PUBLIC_CHANNEL_TALK_PLUGIN_KEY;
    if (!pluginKey || window.ChannelIOInitialized) return;

    // Channel Talk SDK boot script
    (function() {
      const w = window as any;
      if (w.ChannelIO) return;
      const ch = function() {
        ch.c(arguments);
      } as any;
      ch.q = [] as any[];
      ch.c = function(args: any) { ch.q.push(args); };
      w.ChannelIO = ch;

      const s = document.createElement('script');
      s.type = 'text/javascript';
      s.async = true;
      s.src = 'https://cdn.channel.io/plugin/ch-plugin-web.js';
      const x = document.getElementsByTagName('script')[0];
      if (x && x.parentNode) {
        x.parentNode.insertBefore(s, x);
      }
    })();

    window.ChannelIO('boot', {
      pluginKey: pluginKey,
      language: 'ko',
    });

    window.ChannelIOInitialized = true;
  }, []);

  return null;
}
