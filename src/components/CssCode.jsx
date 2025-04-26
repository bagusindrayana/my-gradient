import React from 'react';

function CssCode({ cssCodeResult }) {
  return (
    <section className="card p-4 shadow-soft">
      <h2 className="section-header">CSS Code</h2>
      <pre className="code-output">
        <code>
          {cssCodeResult || '/* CSS code will appear here */'}
        </code>
      </pre>
    </section>
  );
}

export default CssCode; 