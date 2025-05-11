import React from 'react';

const MonacoEditor = ({ value, onChange, language, theme }) => {
  return (
    <div data-testid="monaco-editor">
      <textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        data-language={language}
        data-theme={theme}
      />
    </div>
  );
};

export default MonacoEditor; 