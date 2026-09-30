import React from 'react';

interface RevealTextProps {
  text: string;
  className?: string;
}

/** Word-by-word title reveal without changing the surrounding page layout. */
export const RevealText: React.FC<RevealTextProps> = ({ text, className = '' }) => (
  <span className={`festival-reveal-words ${className}`} role="text" aria-label={text}>
    <span aria-hidden="true">
      {text.split(/(\s+)/).map((part, index) => part.trim()
        ? <span className="festival-reveal-word" key={`${index}-${part}`} style={{ '--word-index': index } as React.CSSProperties}>{part}</span>
        : part)}
    </span>
  </span>
);

interface StaggerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/** Uses the same div and class the layout already had; only its children animate. */
export const Stagger: React.FC<StaggerProps> = ({ children, className = '', ...props }) => (
  <div {...props} className={`${className} festival-stagger`.trim()}>{children}</div>
);
