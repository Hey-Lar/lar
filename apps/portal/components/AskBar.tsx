'use client';

import { Icon } from '@lar/ui';

export function AskBar(props: {
  value: string;
  onChange: (s: string) => void;
  onSubmit: () => void;
  onMic: () => void;
  loading: boolean;
  listening: boolean;
  placeholder: string;
}) {
  return (
    <div className="ask">
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') props.onSubmit();
        }}
        placeholder={props.placeholder}
        aria-label="Ask Lar"
      />
      <button
        className={`mic ${props.listening ? 'on' : ''}`}
        onClick={props.onMic}
        aria-label="Speak to Lar"
      >
        <Icon name="mic" size={22} />
      </button>
      <button className="go" onClick={props.onSubmit} disabled={props.loading}>
        {props.loading ? '…' : 'Ask Lar'}
      </button>
    </div>
  );
}
